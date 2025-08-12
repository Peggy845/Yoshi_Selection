// Google Apps Script Web App API 的網址
// 這個 API 會回傳 Google Sheet 中「分類圖片」分頁的 JSON 資料
const sheetAPI = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';

// 取得 HTML 頁面上的容器元素（第一層分類、第二層分類、商品區塊）
const categoryContainer = document.getElementById('main-category-container');
const subCategoryContainer = document.getElementById('sub-category-container');
const productSections = document.getElementById('product-sections');

// 用來記錄目前展開的主分類名稱（避免同時開啟多個）
let currentExpanded = null;

/**
 * 從 API 取得資料（非同步）
 * 回傳值為 { categoryImages: [...] }
 */
async function fetchData() 
{
  const res = await fetch(sheetAPI); // 向 Google Apps Script 發送請求
  const data = await res.json();     // 將回應轉成 JSON
  return data;                       // 回傳給呼叫者
}

/**
 * 建立主分類區塊 DOM 元素
 * @param {string} name 主分類名稱
 * @param {string} imgFile 圖片檔名（images/資料夾下）
 */
function createCategoryBlock(name, imgFile) 
{
  const block = document.createElement('div');
  block.className = 'category-block';

  // 圖片容器
  const imgWrap = document.createElement('div');
  imgWrap.className = 'circle-image';
  const img = document.createElement('img');
  img.src = `images/${imgFile}`; // 圖片路徑
  img.alt = name;                // 圖片描述（SEO / 無障礙）
  imgWrap.appendChild(img);

  // 文字標籤
  const text = document.createElement('div');
  text.className = 'category-name';
  text.textContent = name;

  // 將圖片與文字加入主分類區塊
  block.appendChild(imgWrap);
  block.appendChild(text);

  return block;
}

// 顯示「關於我」彈窗
function showAboutModal() 
{
  document.getElementById('about-modal').style.display = 'block';
}
// 關閉「關於我」彈窗
function closeAboutModal() 
{
  document.getElementById('about-modal').style.display = 'none';
}
// 點擊背景區域時關閉彈窗
window.onclick = (event) => 
{
  const modal = document.getElementById('about-modal');
  if (event.target === modal) modal.style.display = 'none';
}

/**
 * 建立第二層子分類選單
 * @param {string} mainCat 主分類名稱
 * @param {Array} subCategories 子分類名稱陣列
 */
function createSubCategoryMenu(mainCat, subCategories) 
{
  subCategoryContainer.innerHTML = ''; // 清空舊的選單
  const menu = document.createElement('div');

  // 「全部」按鈕（顯示所有子分類）
  const all = document.createElement('button');
  all.textContent = '全部';
  all.className = 'sub-category-button';
  all.onclick = () => 
  {
    window.location.href = `product_list.html?sub=全部`;
  };
  menu.appendChild(all);

  // 動態建立每個子分類按鈕
  subCategories.forEach(name => 
  {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.className = 'sub-category-button';
	btn.onclick = () => 
	{
      // 跳轉並在網址帶上子分類名稱
      window.location.href = `product_list.html?sub=${encodeURIComponent(name)}`;
    };
    menu.appendChild(btn);
  });

  subCategoryContainer.appendChild(menu);
}

/**
 * 建立商品展示區（依主分類顯示所有子分類）
 * @param {string} mainCat 主分類名稱
 * @param {Array} subData [{ subCat: 名稱, subImg: 圖片檔 }]
 */
function createProductSection(mainCat, subData) 
{
  const section = document.createElement('div');
  section.className = 'product-section';

  // 區塊標題
  const title = document.createElement('h2');
  title.textContent = mainCat;
  section.appendChild(title);

  // 子分類區塊容器
  const blockContainer = document.createElement('div');
  blockContainer.className = 'sub-category-blocks';

  // 為每個子分類建立一個展示區
  subData.forEach(({ subCat, subImg }) => 
  {
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

/**
 * 頁面載入完成後執行
 * - 取得 API 資料
 * - 建立主分類按鈕
 * - 預先生成商品展示區
 */
window.onload = async () => {
  const { categoryImages } = await fetchData();

  const categoryContainer = document.getElementById('categoryContainer');
  const subCategoryContainer = document.getElementById('subCategoryContainer');

  if (!categoryContainer) {
    console.error('找不到 categoryContainer 元素');
    return;
  }

  const mainCats = [...new Set(categoryImages.map(row => row.mainCat))];

  mainCats.forEach(mainCat => {
    const mainRow = categoryImages.find(row => row.mainCat === mainCat);
    const block = createCategoryBlock(mainCat, mainRow.mainImg);

    block.onclick = () => {
      if (!subCategoryContainer) return;

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