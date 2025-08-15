// product_list.js — 基本版：只負責把畫面排版出來（含資料讀取與最基本圖片列表）
// -------------------------------------------------------------

// ✅ 讀網址參數
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// ✅ 讀取多個分頁（與你原本一致）
async function fetchMultipleSheets(sheetNames) {
  const sheetId = '1KXmggPfKqpg5gZCsUujlpdTcKSFdGJHv4bOux3nc2xo';
  const allData = {};

  for (const name of sheetNames) {
    if (name === '分類圖片') continue;
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(name)}&tqx=out:json`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`無法讀取分頁：${name}`);

      const text = await res.text();
      const json = JSON.parse(text.substring(47, text.length - 2));
      const cols = json.table.cols.map(col => (col.label || '').trim());
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

// ✅ 把主圖 + 額外圖片做成陣列（最基本）
function buildImageList(row) {
  const BASE = 'https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/';
  const main = row['商品圖片'] ? BASE + row['商品圖片'] : '';
  const extras = (row['額外圖片'] && row['額外圖片'] !== '無')
    ? row['額外圖片'].split('、').map(s => BASE + s.trim())
    : [];
  const list = [main, ...extras].filter(Boolean);
  // 若完全沒有圖，塞一張佔位圖避免版型塌掉
  return list.length ? list : ['https://via.placeholder.com/600x600?text=No+Image'];
}

// ✅ 產生一個 product-item（完全對齊你剛剛的 HTML/CSS 命名）
function renderProductItem(row) {
  const productDiv = document.createElement('div');
  productDiv.className = 'product-item';

  const imgs = buildImageList(row);
  const mainImg = imgs[0];
  const thumbs = imgs.slice(0, 3); // 下面小圖先顯示最多 3 張做版型

  productDiv.innerHTML = `
    <div class="left-col">
      <div class="product-image-block">
        <img class="product-image" src="${mainImg}" alt="${row['商品名稱'] || ''}">
      </div>
      <div class="sub-image-block">
        <div class="sub-arrow">‹</div>
        ${thumbs.map(src => `
          <div class="sub-image">
            <img src="${src}" alt="thumb">
          </div>
        `).join('')}
        <div class="sub-arrow">›</div>
      </div>
    </div>

    <div class="right-col">
      <div class="product-name">${row['商品名稱'] || ''}</div>
      <div class="product-price">$ ${row['價格'] || ''}</div>
      <div class="product-detail">${row['詳細資訊'] || ''}</div>
      <div class="product-option">（之後放選項區）</div>
      <div class="product-others">
        <div class="sale-status-block">${row['販售狀態'] ? `狀態：${row['販售狀態']}` : '狀態：'}</div>
        <div class="product-quantity">
          <div class="quantity-block">
            <span>數量</span>
            <button class="qty-btn" data-type="minus" type="button">−</button>
            <input class="quantity-input" type="number" value="1" min="1" max="${row['庫存'] || 0}" readonly>
            <button class="qty-btn" data-type="plus" type="button">＋</button>
          </div>
        </div>
        <div class="product-cart">
          <button class="cart-btn" type="button">加入購物車</button>
        </div>
      </div>
    </div>
  `;

  // 🔹 下面是超級基本的互動，只為了視覺確認（你要的功能之後再加回去）
  // 點小圖換主圖（不做索引、切換箭頭等進階，先確認排版）
  const mainImgEl = productDiv.querySelector('.product-image');
  productDiv.querySelectorAll('.sub-image img').forEach(img => {
    img.addEventListener('click', () => {
      mainImgEl.src = img.src;
    });
  });

  // 數量 +/-
  productDiv.addEventListener('click', (e) => {
    const t = e.target;
    if (t.classList.contains('qty-btn')) {
      const input = productDiv.querySelector('.quantity-input');
      const max = parseInt(input.max || '0', 10);
      let val = parseInt(input.value || '1', 10);
      val = t.dataset.type === 'plus'
        ? Math.min(max || Infinity, val + 1)
        : Math.max(1, val - 1);
      input.value = val;
    }
    if (t.classList.contains('cart-btn')) {
      t.classList.toggle('active');
      t.textContent = t.classList.contains('active') ? '已加入' : '加入購物車';
    }
  });

  return productDiv;
}

// ✅ 主流程（只負責把東西畫出來）
async function loadProducts() {
  const category = getQueryParam('main');
  const subcategory = getQueryParam('sub');

  // 兼容 .subcategory-title 或 #subcategory-title 兩種寫法
  const titleEl = document.querySelector('.subcategory-title') || document.querySelector('#subcategory-title');
  if (titleEl) titleEl.textContent = subcategory || '商品列表';

  const sheetNames = [
    '日本寶可夢',
    '日本三麗鷗',
    '日本貓福珊迪',
    '日本親子玩具與母嬰用品',
    '日本童裝品牌',
    '進擊的巨人'
  ];

  const allSheetsData = await fetchMultipleSheets(sheetNames);
  const container = document.querySelector('.product-list') || document.getElementById('product-list');
  container.innerHTML = '';

  if (!category || !allSheetsData[category] || allSheetsData[category].length === 0) {
    container.innerHTML = '<p>目前沒有這個分類的商品</p>';
    return;
  }

  // 依子分類篩選
  const filtered = allSheetsData[category].filter(
    row => (row['商品系列'] || '').toString().trim() === (subcategory || '').toString().trim()
  );

  if (!filtered.length) {
    container.innerHTML = '<p>目前沒有這個分類的商品</p>';
    return;
  }

  // 逐筆畫出（不做合併群組，先確認排版）
  filtered.forEach(row => {
    const card = renderProductItem(row);
    container.appendChild(card);
  });
}

// 啟動
loadProducts();
