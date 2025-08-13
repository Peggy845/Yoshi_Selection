function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// 從 Google Sheet 一次抓所有分頁資料
async function fetchAllSheets() {
  const sheetId = '1KXmggPfKqpg5gZCsUujlpdTcKSFdGJHv4bOux3nc2xo';
  const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

  try {
    const res = await fetch(baseUrl);
    if (!res.ok) throw new Error('無法讀取 Google Sheet 資料');

    const text = await res.text();
    const json = JSON.parse(text.substring(47, text.length - 2));

    // 處理每個分頁資料
    const sheetsData = {};
    json.table.cols.map; // 避免未使用警告

    // 注意：這個方式只能抓第一個工作表，
    // 要一次抓所有分頁，必須事先知道每個分頁名稱並各自請求
    // 所以我們改成「批量請求所有已知分頁名稱」
    return null; // 這裡先暫停，因為 Google Visualization API 沒有一次抓全部分頁的功能

  } catch (err) {
    console.error('抓取 Google Sheet 錯誤:', err);
    return {};
  }
}

// 從多個分頁名稱批量抓取
async function fetchMultipleSheets(sheetNames) {
  const sheetId = '1KXmggPfKqpg5gZCsUujlpdTcKSFdGJHv4bOux3nc2xo';

  const allData = {};

  for (const name of sheetNames) {
    if (name === '分類圖片') continue; // 排除
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(name)}&tqx=out:json`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`無法讀取分頁：${name}`);

      const text = await res.text();
      const json = JSON.parse(text.substring(47, text.length - 2));
      const cols = json.table.cols.map(col => col.label.trim());
      const rows = json.table.rows.map(row => {
        const obj = {};
        row.c.forEach((cell, i) => {
          obj[cols[i]] = cell ? cell.v : '';
        });
        return obj;
      });

      allData[name] = rows;
    } catch (e) {
      console.warn(`分頁 ${name} 抓取失敗:`, e);
      allData[name] = [];
    }
  }

  return allData;
}

async function loadProducts() {
  const category = getQueryParam('main');
  const subcategory = getQueryParam('sub');

  // 設定標題
  const titleElement = document.getElementById('subcategory-title');
  if (titleElement) {
    titleElement.textContent = subcategory || '商品列表';
  }

  // 先定義你 Google Sheet 裡所有的分頁名稱
  // 這裡要列出你所有的第一層分類分頁名稱
  const sheetNames = [
    '日本寶可夢',
    '日本三麗鷗',
	'日本貓福珊迪',
	'日本親子玩具與母嬰用品',
	'日本童裝品牌',
	'進擊的巨人'
  ];

  const allSheetsData = await fetchMultipleSheets(sheetNames);

  if (!allSheetsData[category] || allSheetsData[category].length === 0) {
    document.getElementById('product-list').innerHTML = '<p>目前沒有這個分類的商品</p>';
    return;
  }

  const filtered = allSheetsData[category].filter(
    row => (row['商品系列'] || '').trim() === subcategory
  );

  const container = document.getElementById('product-list');
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<p>目前沒有這個分類的商品</p>';
    return;
  }
  else
  {
	  console.log("[Debug] 商品數量:", filtered.length);
  }
  
	filtered.forEach(product => {
	  const productDiv = document.createElement('div');
	  productDiv.className = 'product-item';

	  productDiv.innerHTML = `
		<!-- 商品圖片小區 -->
		<div class="product-image-block">
		  <div class="image-arrow left-arrow">&#9664;</div>
		  <img src="${product['商品圖片'] || ''}" alt="${product['商品名稱'] || ''}">
		  <div class="image-arrow right-arrow">&#9654;</div>
		</div>

		<!-- 商品名稱 -->
		<div class="product-name">商品名稱: ${product['商品名稱'] || ''}</div>

		<!-- 價格 -->
		<div class="product-price">$ ${product['價格'] || ''}</div>

		<!-- 詳細資訊 -->
		<div class="product-detail">${product['詳細資訊'] || ''}</div>

		<!-- 選項 -->
		<div class="product-option">選項</div>

		<!-- 販售狀態 -->
		<div class="product-status">狀態: ${product['販售狀態'] || ''}</div>

		<!-- 選購區塊 -->
		<div class="purchase-block">
		  <div class="quantity-block">
			<span>數量</span>
			<button class="qty-btn" data-type="minus">-</button>
			<input type="number" value="1" min="1" max="${product['庫存'] || 0}" readonly>
			<button class="qty-btn" data-type="plus">+</button>
			<span class="stock-text">還剩 ${product['庫存'] || 0} 件</span>
		  </div>
		  <button class="cart-btn">加入購物車</button>
		</div>
	  `;

	  container.appendChild(productDiv);
	});
}

loadProducts();

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('qty-btn')) {
    const type = e.target.dataset.type;
    const input = e.target.parentElement.querySelector('input');
    let value = parseInt(input.value);
    const max = parseInt(input.max);

    if (type === 'plus' && value < max) value++;
    if (type === 'minus' && value > 1) value--;
    input.value = value;
  }

  if (e.target.classList.contains('cart-btn')) {
    e.target.classList.toggle('active');
    e.target.textContent = e.target.classList.contains('active') ? '已加入' : '加入購物車';
  }
});