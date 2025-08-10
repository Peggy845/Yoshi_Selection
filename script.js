// script.js
const SHEET_API_URL = 'https://script.google.com/macros/s/你的AppsScript部署網址/exec';

async function loadCategories() {
    try {
        const res = await fetch(SHEET_API_URL);
        const data = await res.json();

        const categorySection = document.getElementById('category-section');

        data.mainCategories.forEach(cat => {
            const block = document.createElement('div');
            block.className = 'category-block';

            const imgDiv = document.createElement('div');
            imgDiv.className = 'category-image';
            const img = document.createElement('img');
            img.src = `images/${cat.image}`;
            imgDiv.appendChild(img);

            const textDiv = document.createElement('div');
            textDiv.className = 'category-text';
            textDiv.textContent = cat.name;

            block.appendChild(imgDiv);
            block.appendChild(textDiv);
            block.addEventListener('click', () => toggleSubcategories(cat.name, data.subcategories[cat.name]));

            categorySection.appendChild(block);
        });
    } catch (e) {
        console.error('讀取分類失敗', e);
    }
}

function toggleSubcategories(categoryName, subcats) {
    const subcategorySection = document.getElementById('subcategory-section');
    subcategorySection.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = categoryName;
    subcategorySection.appendChild(title);

    subcats.forEach(sc => {
        const scBlock = document.createElement('div');
        scBlock.className = 'subcategory-block';

        const imgDiv = document.createElement('div');
        imgDiv.className = 'category-image';
        const img = document.createElement('img');
        img.src = `images/${sc.image}`;
        imgDiv.appendChild(img);

        const textDiv = document.createElement('div');
        textDiv.className = 'category-text';
        textDiv.textContent = sc.name;

        scBlock.appendChild(imgDiv);
        scBlock.appendChild(textDiv);

        subcategorySection.appendChild(scBlock);
    });
}

function openAboutMe() {
    document.getElementById('aboutMeModal').style.display = 'block';
}

function closeAboutMe() {
    document.getElementById('aboutMeModal').style.display = 'none';
}

function goToCart() {
    window.location.href = 'cart.html';
}

window.onclick = function(event) {
    const modal = document.getElementById('aboutMeModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

window.onload = loadCategories;
