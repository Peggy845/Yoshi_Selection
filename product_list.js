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
	'日本親子玩具與母嬰用品'
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

  filtered.forEach(product => {
    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';
    productDiv.innerHTML = `
      <div class="product-name">${product['商品名稱'] || ''}</div>
      <div class="product-price">$ ${product['價格'] || ''}</div>
	  <div class="product-stock">$ ${product['庫存'] || ''}</div>
	  <div class="product-status">$ ${product['販售狀態'] || ''}</div>
      <div class="product-detail">${product['詳細資訊'] || ''}</div>
    `;
    container.appendChild(productDiv);
  });
}

loadProducts();
