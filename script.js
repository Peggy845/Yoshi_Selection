const sheetAPI = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';
const categoryContainer = document.getElementById('main-category-container');
const subCategoryContainer = document.getElementById('sub-category-container');
const productSections = document.getElementById('product-sections');

let currentExpanded = null;

async function fetchData() {
  const res = await fetch(sheetAPI);
  const data = await res.json();
  return data;
}

function createCategoryBlock(name, imgFile) {
  const block = document.createElement('div');
  block.className = 'category-block';

  const imgWrap = document.createElement('div');
  imgWrap.className = 'circle-image';
  const img = document.createElement('img');
  img.src = `images/${imgFile}`;
  img.alt = name;
  imgWrap.appendChild(img);

  const text = document.createElement('div');
  text.className = 'category-name';
  text.textContent = name;

  block.appendChild(imgWrap);
  block.appendChild(text);

  return block;
}

function showAboutModal() {
  document.getElementById('about-modal').style.display = 'block';
}
function closeAboutModal() {
  document.getElementById('about-modal').style.display = 'none';
}
window.onclick = (event) => {
  const modal = document.getElementById('about-modal');
  if (event.target === modal) modal.style.display = 'none';
}

function createSubCategoryMenu(mainCat, subCategories) {
  subCategoryContainer.innerHTML = '';
  const menu = document.createElement('div');
  const all = document.createElement('button');
  all.textContent = '全部';
  all.className = 'sub-category-button';
  menu.appendChild(all);
  subCategories.forEach(name => {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.className = 'sub-category-button';
    menu.appendChild(btn);
  });
  subCategoryContainer.appendChild(menu);
}

function createProductSection(mainCat, subData) {
  const section = document.createElement('div');
  section.className = 'product-section';

  const title = document.createElement('h2');
  title.textContent = mainCat;
  section.appendChild(title);

  const blockContainer = document.createElement('div');
  blockContainer.className = 'sub-category-blocks';

  subData.forEach(({ subCat, subImg }) => {
    const block = document.createElement('div');
    block.className = 'sub-category-block';

    const img = document.createElement('img');
    img.src = `images/${subImg}`;
    img.alt = subCat;

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = subCat;

    block.appendChild(img);
    block.appendChild(name);
    blockContainer.appendChild(block);
  });

  section.appendChild(blockContainer);
  productSections.appendChild(section);
}

document.addEventListener("DOMContentLoaded", () => {
    const categoryBlocks = document.querySelectorAll(".category-block");

    categoryBlocks.forEach(block => {
        block.addEventListener("click", async () => {
            const categoryName = block.getAttribute("data-category-name");
            // 點擊後取得該類別的子分類
            const subCategories = await fetch(`${API_URL}?action=getSubCategories&sheet=${encodeURIComponent(categoryName)}`)
                .then(res => res.json());

            renderSubCategories(subCategories, categoryName);
        });
    });
});

function renderSubCategories(subCategories, categoryName) {
    const subContainer = document.getElementById("sub-category-container");
    subContainer.innerHTML = "";

    subCategories.forEach(sub => {
        const btn = document.createElement("div");
        btn.className = "sub-category-button";
        btn.textContent = sub;

        btn.addEventListener("click", async () => {
            const products = await fetch(`${API_URL}?action=getProducts&sheet=${encodeURIComponent(categoryName)}&series=${encodeURIComponent(sub)}`)
                .then(res => res.json());
            renderProducts(products);
        });

        subContainer.appendChild(btn);
    });
}

function renderProducts(products) {
    const container = document.getElementById("product-container");
    container.innerHTML = "";

    products.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <strong>${p.name}</strong><br>
            價格：${p.price}<br>
            庫存：${p.stock}<br>
            詳細：${p.details}
        `;
        container.appendChild(card);
    });
}

window.onload = async () => {
  const { categoryImages } = await fetchData();

  const mainCats = [...new Set(categoryImages.map(row => row.mainCat))];

  mainCats.forEach(mainCat => {
    const mainRow = categoryImages.find(row => row.mainCat === mainCat);
    const block = createCategoryBlock(mainCat, mainRow.mainImg);
    block.onclick = () => {
      if (currentExpanded === mainCat) {
        subCategoryContainer.innerHTML = '';
        currentExpanded = null;
      } else {
        const subCats = categoryImages
          .filter(row => row.mainCat === mainCat && row.subCat)
          .map(row => row.subCat);
        createSubCategoryMenu(mainCat, subCats);
        currentExpanded = mainCat;
      }
    };
    categoryContainer.appendChild(block);

    const subData = categoryImages
      .filter(row => row.mainCat === mainCat && row.subCat)
      .map(row => ({ subCat: row.subCat, subImg: row.subImg }));
    createProductSection(mainCat, subData);
  });
};
