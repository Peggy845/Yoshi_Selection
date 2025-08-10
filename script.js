/* ---------- 設定：請改成你自己的 Apps Script exec URL（部署後） ---------- */
const GS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';
/* --------------------------------------------------------------------------- */

const mainContainer = document.getElementById('main-category-container');
const subCategoryContainer = document.getElementById('sub-category-container');
const productSections = document.getElementById('product-sections');

let currentExpanded = null; // which main category is expanded

// 叫後端拿分類圖片表（分類圖片分頁） + sheets list（後端會回傳）
async function loadCategories() {
  try {
    const res = await fetch(`${GS_SCRIPT_URL}?action=categories`);
    const json = await res.json();
    // json: { categories: [ {mainCat, mainImg, subCat, subImg} ... ], sheets: [...] }
    const categories = json.categories || [];
    renderCategoryBlocks(categories);
    renderProductSections(categories);
  } catch (err) {
    console.error('fetch categories failed', err);
  }
}

/* render 顯示頂層分類（依 'mainCat' 分組） */
function renderCategoryBlocks(rows) {
  // group by mainCat and pick mainImg
  const grouped = {};
  rows.forEach(r => {
    const key = r.mainCat || r['頂層分類'] || r['A'] || '';
    if (!key) return;
    grouped[key] = grouped[key] || { mainImg: r.mainImg || r.mainImgFile || r['mainImg'] || r['B'], subCats: [] };
    const sub = r.subCat || r['第二層分類'] || r['C'];
    const subImg = r.subImg || r['D'];
    if (sub) grouped[key].subCats.push({ name: sub, img: subImg });
  });

  // build UI
  Object.keys(grouped).forEach(mainCat => {
    const meta = grouped[mainCat];
    const block = document.createElement('div');
    block.className = 'category-block';
    block.innerHTML = `
      <div class="circle-image"><img src="images/${meta.mainImg || 'placeholder.jpg'}" alt="${mainCat}"></div>
      <div class="category-name">${mainCat}</div>
    `;
    block.addEventListener('click', () => {
      // expand or collapse
      if (currentExpanded === mainCat) {
        subCategoryContainer.innerHTML = '';
        currentExpanded = null;
      } else {
        showSubCategoryMenu(mainCat, meta.subCats);
        currentExpanded = mainCat;
      }
    });
    mainContainer.appendChild(block);
  });
}

/* show subcategories as buttons. clicking a subcategory navigates to product.html */
function showSubCategoryMenu(mainCat, subCats) {
  subCategoryContainer.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'sub-category-row';

  // "全部" 第一個
  const btnAll = document.createElement('button');
  btnAll.className = 'sub-category-button';
  btnAll.textContent = '全部';
  btnAll.addEventListener('click', () => {
    // 導向商品選擇頁，帶 mainCat（你可以在 product.html 用 ?category=）
    location.href = `product.html?category=${encodeURIComponent(mainCat)}`;
  });
  row.appendChild(btnAll);

  subCats.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'sub-category-button';
    btn.textContent = s.name;
    btn.addEventListener('click', () => {
      // 導向 product.html 並帶 mainCat 與 subCat（query string）
      const url = `product.html?category=${encodeURIComponent(mainCat)}&sub=${encodeURIComponent(s.name)}`;
      location.href = url;
    });
    row.appendChild(btn);
  });

  subCategoryContainer.appendChild(row);
}

/* Render product sections under each main category (show the sub categories as small tiles) */
function renderProductSections(rows) {
  productSections.innerHTML = '';
  // group by mainCat again, build small tiles from subCats
  const grouped = {};
  rows.forEach(r => {
    const key = r.mainCat || r['頂層分類'] || r['A'] || '';
    if (!key) return;
    grouped[key] = grouped[key] || { subCats: [] };
    const sub = r.subCat || r['第二層分類'] || r['C'];
    const subImg = r.subImg || r['D'];
    if (sub) grouped[key].subCats.push({ name: sub, img: subImg });
  });

  Object.keys(grouped).forEach(mainCat => {
    const section = document.createElement('section');
    section.className = 'product-section';
    section.innerHTML = `<h2>${mainCat}</h2>`;
    const blocks = document.createElement('div');
    blocks.className = 'sub-category-blocks';

    // create tiles
    grouped[mainCat].subCats.forEach(s => {
      const tile = document.createElement('div');
      tile.className = 'sub-category-block';
      tile.innerHTML = `
        <img src="images/${s.img || 'placeholder.jpg'}" alt="${s.name}" />
        <div class="name">${s.name}</div>
      `;
      tile.addEventListener('click', () => {
        location.href = `product.html?category=${encodeURIComponent(mainCat)}&sub=${encodeURIComponent(s.name)}`;
      });
      blocks.appendChild(tile);
    });

    section.appendChild(blocks);
    productSections.appendChild(section);
  });
}

/* 初始化 */
document.addEventListener('DOMContentLoaded', () => {
  // About 跳轉到 about.html（你可以改成 modal 或 about.html）
  const aboutBlock = document.getElementById('about-block');
  aboutBlock.addEventListener('click', () => location.href = 'about.html');

  // 載入分類
  loadCategories();
});
