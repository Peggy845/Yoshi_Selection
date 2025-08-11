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
  menu.appendChild(all);

  // 動態建立每個子分類按鈕
  subCategories.forEach(name => 
  {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.className = 'sub-category-button';
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
window.onload = async () => 
{
  const { categoryImages } = await fetchData();

  // 從所有資料中取出唯一的主分類名稱
  const mainCats = [...new Set(categoryImages.map(row => row.mainCat))];

  mainCats.forEach(mainCat => 
  {
    // 找出該主分類的第一筆資料（拿主分類圖）
    const mainRow = categoryImages.find(row => row.mainCat === mainCat);
    const block = createCategoryBlock(mainCat, mainRow.mainImg);

    // 點擊主分類按鈕時的邏輯
    block.onclick = () => 
	{
      if (currentExpanded === mainCat) 
	  {
        // 如果已經展開，則收起
        subCategoryContainer.innerHTML = '';
        currentExpanded = null;
      } 
	  else 
	  {
        // 如果未展開，則載入子分類選單
        const subCats = categoryImages
          .filter(row => row.mainCat === mainCat && row.subCat)
          .map(row => row.subCat);
        createSubCategoryMenu(mainCat, subCats);
        currentExpanded = mainCat;
      }
    };

    // 將主分類按鈕加到頁面
    categoryContainer.appendChild(block);

    // 同時建立該主分類的商品展示區
    const subData = categoryImages
      .filter(row => row.mainCat === mainCat && row.subCat)
      .map(row => ({ subCat: row.subCat, subImg: row.subImg }));
    createProductSection(mainCat, subData);
  });
};

/* Product list page */
async function fetchProducts() 
{
  const res = await fetch(sheetAPI);
  return await res.json();
}

function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  // 圖片處理
  const images = [product['商品圖片'], ...(product['額外圖片們'] ? product['額外圖片們'].split('、') : [])];
  let currentIndex = 0;

  const imgContainer = document.createElement('div');
  imgContainer.className = 'image-container';

  const img = document.createElement('img');
  img.src = `images/${images[currentIndex]}`;
  imgContainer.appendChild(img);

  if (images.length > 1) {
    const leftArrow = document.createElement('div');
    leftArrow.className = 'arrow left';
    leftArrow.textContent = '<';
    leftArrow.onclick = () => {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      img.src = `images/${images[currentIndex]}`;
    };

    const rightArrow = document.createElement('div');
    rightArrow.className = 'arrow right';
    rightArrow.textContent = '>';
    rightArrow.onclick = () => {
      currentIndex = (currentIndex + 1) % images.length;
      img.src = `images/${images[currentIndex]}`;
    };

    imgContainer.appendChild(leftArrow);
    imgContainer.appendChild(rightArrow);
  }

  const status = document.createElement('div');
  status.textContent = `狀態: ${product['販售狀態']}`;
  imgContainer.appendChild(status);

  // 資訊區
  const infoContainer = document.createElement('div');
  infoContainer.className = 'info-container';

  const name = document.createElement('div');
  name.className = 'product-name';
  name.textContent = product['商品名稱'];

  const price = document.createElement('div');
  price.className = 'price';
  price.textContent = `$ ${product['價格']}`;

  const details = document.createElement('div');
  details.className = 'details';
  details.textContent = product['詳細資訊'] || '';

  // 選項處理
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'options';
  Object.keys(product).forEach(key => {
    if (key.startsWith('選項-') && product[key]) {
      const values = product[key].split('、');
      const group = document.createElement('div');
      values.forEach(val => {
        const btn = document.createElement('button');
        btn.textContent = val;
        btn.onclick = () => {
          group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        };
        group.appendChild(btn);
      });
      optionsContainer.appendChild(group);
    }
  });

  // 數量 & 購物車
  const qtySection = document.createElement('div');
  qtySection.className = 'quantity-section';
  let qty = 1;
  const qtyDisplay = document.createElement('span');
  qtyDisplay.textContent = qty;

  const btnMinus = document.createElement('button');
  btnMinus.textContent = '-';
  btnMinus.onclick = () => {
    if (qty > 1) qtyDisplay.textContent = --qty;
  };

  const btnPlus = document.createElement('button');
  btnPlus.textContent = '+';
  btnPlus.onclick = () => {
    if (qty < product['庫存']) qtyDisplay.textContent = ++qty;
  };

  const stockInfo = document.createElement('span');
  stockInfo.textContent = `還剩${product['庫存']}件`;

  qtySection.append('數量', btnMinus, qtyDisplay, btnPlus, stockInfo);

  const cartSection = document.createElement('div');
  cartSection.className = 'cart-section';
  const cartBtn = document.createElement('button');
  cartBtn.textContent = '加入購物車';
  cartBtn.onclick = () => {
    alert(`已加入 ${qty} 件 ${product['商品名稱']} 到購物車`);
  };
  cartSection.appendChild(cartBtn);

  infoContainer.append(name, price, details, optionsContainer, qtySection, cartSection);

  card.append(imgContainer, infoContainer);
  return card;
}

window.onload = async () => {
  const products = await fetchProducts();
  const list = document.getElementById('productList');
  products.forEach(p => {
    list.appendChild(createProductCard(p));
  });
};

window.onload = () => {
  const apiBase = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec''; // 改成你的部署網址
  const page = window.location.pathname;

  if (page.includes('product_list.html')) {
    // 商品列表頁
    const urlParams = new URLSearchParams(window.location.search);
    const sheetName = urlParams.get('sheet');

    if (!sheetName) {
      console.error('缺少 sheet 參數，無法載入商品資料');
      return;
    }

    const apiUrl = `${apiBase}?type=product&sheet=${encodeURIComponent(sheetName)}`;
    console.log('請求 API:', apiUrl);

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (!data.products || !Array.isArray(data.products)) {
          console.error('API 回傳格式錯誤:', data);
          return;
        }

        data.products.forEach(product => {
          // TODO: 這裡渲染你的商品 UI
          console.log('商品:', product);
        });
      })
      .catch(err => console.error('API 請求失敗:', err));

  } else {
    // 首頁（分類頁）
    const apiUrl = `${apiBase}?type=category`;
    console.log('請求 API:', apiUrl);

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (!data.categoryImages || !Array.isArray(data.categoryImages)) {
          console.error('API 回傳格式錯誤:', data);
          return;
        }

        data.categoryImages.forEach(cat => {
          // TODO: 這裡渲染你的分類 UI
          console.log('分類:', cat);
        });
      })
      .catch(err => console.error('API 請求失敗:', err));
  }
};