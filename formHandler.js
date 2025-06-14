const form = document.getElementById('dish-form');
const statusDiv = document.getElementById('status');
const categoryButtonsContainer = document.getElementById('category-buttons');
const categoryHiddenInput = document.getElementById('category-hidden');
const takenDishesList = document.getElementById('taken-dishes');

const ENDPOINT_URL = 'https://script.google.com/macros/s/AKfycbz1zoU2bDG83YhjqooWrDr4DNgfAN3TvVQP6PAuOB8IvIifpgrOASmwyV05CrYi-qBb/exec';

let allEntries = [];

function getMessage(ratio) {
    if (ratio < 0.5) {
        return { text: "we need this!", color: "text-green-700", bg: "bg-green-100" };
    } else if (ratio < 0.7) {
        return { text: "you could bring this", color: "text-yellow-800", bg: "bg-yellow-100" };
    } else if (ratio < 1) {
        return { text: "only if you really want to", color: "text-orange-800", bg: "bg-orange-100" };
    } else {
        return { text: "we're good on this", color: "text-red-800", bg: "bg-red-100" };
    }
}

function updateTakenDishesList(categoryName, categoriesData) {
    takenDishesList.innerHTML = '';

    if (!categoryName || !categoriesData || !Array.isArray(categoriesData)) {
        takenDishesList.innerHTML = '<li class="text-gray-500">Nothing yet...</li>';
        return;
    }

    // Find the category object by name (case-insensitive)
    const categoryObj = categoriesData.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());

    if (!categoryObj || !categoryObj.dishes || categoryObj.dishes.length === 0) {
        takenDishesList.innerHTML = '<li class="text-gray-500">Nothing yet...</li>';
        return;
    }

    categoryObj.dishes.forEach(dish => {
        const tags = [];
        if (dish.gf) tags.push('GF');
        if (dish.df) tags.push('DF');
        if (dish.vegan) tags.push('Vegan');

        // Capitalize each word in the dish name
        const titleCasedName = String(dish.name)
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const displayName = titleCasedName + (tags.length > 0 ? ` (${tags.join(', ')})` : '');

        const li = document.createElement('li');
        li.textContent = displayName;
        takenDishesList.appendChild(li);
    });
}



async function loadCategoryData() {
    try {
        const res = await fetch(ENDPOINT_URL);
        const data = await res.json(); // expects { categories: [...], entries: [...] }

        categoryButtonsContainer.innerHTML = '';
        allEntries = data.entries || [];

        data.categories.forEach(cat => {
            const ratio = cat.idealServings ? cat.currentServings / cat.idealServings : 0;
            const { text, color, bg } = getMessage(ratio);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `category-button w-full flex justify-between items-center px-4 py-2 rounded border ${bg} hover:bg-opacity-80`;
            btn.innerHTML = `
                <span class="font-medium">${cat.name}</span>
                <span class="text-sm ${color}">${text}</span>
            `;

            btn.addEventListener('click', () => {
                categoryHiddenInput.value = cat.name;

                const allButtons = categoryButtonsContainer.querySelectorAll('button');
                allButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                const dishInput = document.getElementById('dish');
                const servingsInput = document.getElementById('servings');

                if (cat.name.toLowerCase() === 'the cupcakes') {
                    servingsInput.value = 36;
                    dishInput.placeholder = "You'll need to make 3 dozen!";
                } else {
                    servingsInput.value = '';
                    dishInput.placeholder = `Your favorite ${cat.name.toLowerCase()}`;
                }

                updateTakenDishesList(cat.name, data.categories);
            });

            categoryButtonsContainer.appendChild(btn);
        });

    } catch (err) {
        console.error('Failed to load categories:', err);
        categoryButtonsContainer.innerHTML = '<p class="text-red-600">Error loading categories</p>';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!categoryHiddenInput.value) {
        statusDiv.textContent = 'Please select a category.';
        return;
    }

    const formData = new FormData(form);

    const dishValue = String(formData.get('dish')).trim();
    const servingsValue = parseInt(formData.get('servings'), 10);

    // Validate dish name: only letters and spaces
    if (!/^[a-zA-Z]/.test(dishValue)) {
        statusDiv.textContent = 'Dish name must start with a letter.';
        return;
    }

    if (isNaN(servingsValue) || servingsValue < 1 || servingsValue > 50) {
        statusDiv.textContent = 'Serving size must be between 1 and 50.';
        return;
    }


    statusDiv.textContent = '';


    const payload = {
        timestamp: new Date().toISOString(),
        category: categoryHiddenInput.value,
        dish: String(formData.get('dish')),
        person: formData.get('person'),
        email: formData.get('email'),
        servings: parseInt(formData.get('servings')),
        gf: !!formData.get('gf'),
        df: !!formData.get('df'),
        vegan: !!formData.get('vegan')
    };

    try {
        const res = await fetch(ENDPOINT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });

        if (res.ok) {
            document.getElementById('form-wrapper').style.display = 'none';
            statusDiv.textContent = '';

// Show overlay container
            const overlay = document.getElementById('thank-you-overlay');
            overlay.style.display = 'block';

// Show explosion gif immediately
            const explosionGif = document.getElementById('explosion-gif');
            explosionGif.style.display = 'block';

// Hide hot food gif initially
            const hotFoodGif = document.getElementById('hot-food-gif');
            hotFoodGif.style.display = 'none';

// Show hot food gif after 1 second delay
            setTimeout(() => {
                hotFoodGif.style.display = 'block';
            }, 500);

            categoryHiddenInput.value = '';
            await loadCategoryData();


        } else {
            statusDiv.textContent = 'Error submitting. Please try again.';
        }
    } catch (err) {
        console.error('Submit failed:', err);
        statusDiv.textContent = 'Network error. Try again later.';
    }
});




// Splash screen handling
let categoriesLoaded = false;
const splash = document.getElementById('splash-screen');
const splashBtn = document.getElementById('splash-ok-btn');

const originalLoadCategoryData = loadCategoryData;
loadCategoryData = async () => {
    await originalLoadCategoryData();
    categoriesLoaded = true;
};

splashBtn.addEventListener('click', async () => {
    splashBtn.disabled = true;
    splashBtn.textContent = 'Loading...';

    while (!categoriesLoaded) {
        await new Promise(res => setTimeout(res, 300));
    }

    splash.classList.add('opacity-0');
    setTimeout(() => splash.style.display = 'none', 500);
});

loadCategoryData();
