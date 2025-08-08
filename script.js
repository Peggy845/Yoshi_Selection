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

// 判斷目前是不是在商品頁
if (location.pathname.includes("product.html")) {
  const params = new URLSearchParams(location.search);
  const category = params.get("category");

  fetch(`${SHEET_API}?sheet=${category}`)
    .then((res) => res.json())
    .then((data) => {
      renderProducts(data);
    });

  function renderProducts(products) {
    const container = document.getElementById("product-list");
    container.innerHTML = "";

    const uniqueCombinations = {};

    products.forEach((item) => {
      const key = `${item["商品名稱"]}-${item["角色"]}-${item["款式"]}-${item["顏色"]}`;
      if (!uniqueCombinations[key]) {
        uniqueCombinations[key] = [];
      }
      uniqueCombinations[key].push(item);
    });

    for (const key in uniqueCombinations) {
      const [商品名稱, 角色, 款式, 顏色] = key.split("-");
      const variant = uniqueCombinations[key][0];

      const imgList = variant["圖片檔名"].split("、").map((file) => file.trim());

      const productHTML = `
        <div class="product-card">
          <div class="product-image">
            <img src="images/${imgList[0]}" alt="商品圖片" />
          </div>
          <div class="product-info">
            <div class="product-name">${商品名稱}</div>
            <div class="product-price">$ ${variant["價格"]}</div>
            <div class="product-status">狀態：<strong>${variant["販售狀態"]}</strong></div>
            <div class="product-detail">${variant["詳細資訊"] || ""}</div>
            <div class="product-option">
              <!-- 選項未處理（後續補） -->
            </div>
            <div class="product-quantity">
              數量：
              <input type="number" min="1" max="${variant["庫存"]}" value="1" />
              還剩 ${variant["庫存"]} 件
            </div>
            <button class="add-to-cart">加入購物車</button>
          </div>
        </div>
      `;

      container.innerHTML += productHTML;
    }
  }
}