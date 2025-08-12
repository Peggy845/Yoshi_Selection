// 取得網址參數
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// 讀取 Excel 資料（排除「分類圖片」分頁）
async function fetchData() {
  const sheetId = '1KXmggPfKqpg5gZCsUujlpdTcKSFdGJHv4bOux3nc2xo';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

  const res = await fetch(url);
  const text = await res.text();

  // Google Sheets 回傳的 JSON 前後包了一層垃圾字串，要先清掉
  const json = JSON.parse(text.substr(47).slice(0, -2));

  let allProducts = [];

  json.table.rows.forEach(row => {
    const mainCat = row.c[0]?.v || '';
    const subCat = row.c[1]?.v || '';
    const name = row.c[2]?.v || '';
    const price = row.c[3]?.v || '';
    const img = row.c[4]?.v || '';

    // 排除「分類圖片」
    if (mainCat !== '分類圖片') {
      allProducts.push({ mainCat, subCat, name, price, img });
    }
  });

  return allProducts;
}


// 主程式
async function loadProducts() {
  const mainCat = getQueryParam('main');
  const subCat = getQueryParam('sub');

  // 設定子分類大標題
  const subTitleEl = document.getElementById('subcategory-title');
  if (subTitleEl) {
    subTitleEl.textContent = subCat || '商品列表';
  } else {
    console.warn('找不到 #subcategory-title 元素');
  }

  // 抓取資料
  const allProducts = await fetchData();

  // 篩選對應的商品
  const filteredProducts = allProducts.filter(
    p => p.mainCat === mainCat && p.subCat === subCat
  );

  const productContainer = document.getElementById('product-list');
  if (!productContainer) {
    console.error('找不到 #product-list 元素');
    return;
  }

  // 清空容器
  productContainer.innerHTML = '';

  if (filteredProducts.length === 0) {
    productContainer.innerHTML = '<p>目前沒有這個分類的商品</p>';
    return;
  }

  // 渲染商品
  filteredProducts.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <img src="${product.img}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>${product.price ? '$' + product.price : ''}</p>
    `;

    productContainer.appendChild(card);
  });
}

// 頁面載入完成後執行
window.onload = loadProducts;
