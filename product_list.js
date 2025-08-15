document.addEventListener("DOMContentLoaded", () => {
  // 以「載入當下」的視窗大小作為 100% 基準（僅做一次）
  const baseW = window.innerWidth;
  const baseH = window.innerHeight;
  document.documentElement.style.setProperty('--base-w', baseW + 'px');
  document.documentElement.style.setProperty('--base-h', baseH + 'px');

  // sub-image 群組的自適應顯示與等比例放大
  function adjustSubBlocks() {
    document.querySelectorAll(".sub-image-block").forEach(block => {
      const group = block.querySelector(".sub-group");
      if (!group) return;

      const arrows = group.querySelectorAll(".sub-arrow");
      const images = Array.from(group.querySelectorAll(".sub-image"));

      const blockWidth = block.clientWidth;
      const arrowW = arrows[0] ? arrows[0].offsetWidth : 0;
      const imgW = images[0] ? images[0].offsetWidth : 0;

      // 預設 3 張，不足則依序減為 2、1、0；箭頭永遠保留
      let imgCount = 3;
      while (imgCount > 0 && (arrowW * 2 + imgW * imgCount) > blockWidth) {
        imgCount--;
      }

      // 顯示對應數量的圖片
      images.forEach((img, i) => {
        img.style.display = i < imgCount ? "flex" : "none";
      });

      // 以等比縮放填滿可用寬度
      const groupWidth = arrowW * 2 + imgW * imgCount;
      const scale = groupWidth > 0 ? (blockWidth / groupWidth) : 1;
      group.style.transform = `scale(${scale})`;
    });
  }

  // 初始調整
  requestAnimationFrame(adjustSubBlocks);

  // 縮放瀏覽器時：回到左上角為錨點，並重算 sub-group
  window.addEventListener('resize', () => {
    window.scrollTo(0, 0);
    adjustSubBlocks();
  });
});

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/** 抓多分頁資料 */
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

/** 將列分組：商品名稱 -> variants 陣列 */
function groupByProductName(rows) {
  const map = new Map();
  rows.forEach(r => {
    const name = (r['商品名稱'] || '').trim();
    if (!name) return;
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(r);
  });
  return map; // Map(name -> [row,row,...])
}

/** 建立圖片清單（支援 額外圖片 or 額外圖片們，頓號分隔） */
function buildImageList(variant) {
  const base = 'https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/';
  const mainImg = (variant['商品圖片'] || '').toString().trim();
  const extraRaw = ((variant['額外圖片們'] ?? variant['額外圖片']) || '').toString().trim();
  const extraImgs = extraRaw && extraRaw !== '無'
    ? extraRaw.split('、').map(s => s.trim()).filter(Boolean)
    : [];
  const list = [];
  if (mainImg) list.push(base + mainImg);
  extraImgs.forEach(x => list.push(base + x));
  return list;
}

function initImageNavigation(productDiv, state) {
  const imgEl = productDiv.querySelector('.product-image-block img');
  const leftBtn = productDiv.querySelector('.arrow-left');
  const rightBtn = productDiv.querySelector('.arrow-right');

  const updateImage = () => {
    imgEl.src = state.imgList[state.imgIndex];
  };

  leftBtn?.addEventListener('click', () => {
    state.imgIndex = (state.imgIndex - 1 + state.imgList.length) % state.imgList.length;
    updateImage();
  });

  rightBtn?.addEventListener('click', () => {
    state.imgIndex = (state.imgIndex + 1) % state.imgList.length;
    updateImage();
  });
}

//新增 HTML 產生器
function generateProductHTML(productName, variant, imgList) {
  return `
    <div class="left-col">
      <div class="product-image-block">
        <div class="arrow-block arrow-left" style="${imgList.length > 1 ? '' : 'display:none'}">
          <svg viewBox="0 0 24 24"><path d="M15 6 L9 12 L15 18"/></svg>
        </div>
        <img src="${imgList[0] || ''}" alt="${productName}" class="main-image">
        <div class="arrow-block arrow-right" style="${imgList.length > 1 ? '' : 'display:none'}">
          <svg viewBox="0 0 24 24"><path d="M9 6 L15 12 L9 18"/></svg>
        </div>
        <div class="magnifier-btn">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="16" y1="16" x2="22" y2="22"></line>
          </svg>
        </div>
      </div>
		<div class="sub-image-block">
		  <div class="sub-group">
			  <div class="sub-arrow">←</div>
			  <img src="images/Yoshi_Selection_logo.jpg" alt="子圖片1" class="sub-image">
			  <img src="images/Yoshi_Selection_logo.jpg" alt="子圖片2" class="sub-image">
			  <img src="images/Yoshi_Selection_logo.jpg" alt="子圖片3" class="sub-image">
			  <div class="sub-arrow">→</div>
		  </div>
		</div>
    </div>

    <div class="right-col">
      <div class="product-name">${productName}</div>
      <div class="product-price">$ ${variant['價格'] || ''}</div>
      <div class="product-detail">${variant['詳細資訊'] || ''}</div>
      <div class="product-option"></div>
      <div class="product-others">
          <div class="sale-status-block">銷售狀態</div>
          <div class="product-quantity">數量</div>
          <div class="product-cart">購物車</div>
      </div>
    </div>
  `;
}

/** 取得選項欄位清單（以 選項- 開頭且至少某一列不為空） */
function extractOptionKeys(variants) {
  const keys = new Set();
  variants.forEach(v => {
    Object.keys(v).forEach(k => {
      if (k.startsWith('選項-') && (v[k] || '').toString().trim() !== '') {
        keys.add(k);
      }
    });
  });
  return Array.from(keys);
}

/** 每個選項欄位的所有值（去重、依出現順序） */
function collectOptionValues(variants, optionKeys) {
  const values = {};
  optionKeys.forEach(k => {
    const seen = new Set();
    values[k] = [];
    variants.forEach(v => {
      const val = (v[k] || '').toString().trim();
      if (val && !seen.has(val)) {
        seen.add(val);
        values[k].push(val);
      }
    });
  });
  return values; // { '選項-尺寸': ['22cm','33cm'], ... }
}

function createProductCard(productName, variants) {
  const productDiv = document.createElement('div');
  productDiv.className = 'product-item';

  const optionKeys = extractOptionKeys(variants);
  const optionValues = collectOptionValues(variants, optionKeys);

  const initialVariant = variants[0];
  const selection = {};
  

  optionKeys.forEach(k => {
    const val = (initialVariant[k] || '').toString().trim();
    if (val) selection[k] = val;
  });

  const imgListInit = buildImageList(initialVariant);

  productDiv.innerHTML = generateProductHTML(productName, initialVariant, imgListInit);

  const state = {
    variants,
    optionKeys,
    selection,
    imgList: imgListInit,
    imgIndex: 0
  };

  // **綁定功能模組**
  initImageNavigation(productDiv, state);
  ///////////////////////////////////////////////////initMagnifier(productDiv, state);
  ///////////////////////////////////////////////////initOptionSelection(productDiv, state);
  ///////////////////////////////////////////////////initQuantityAndCart(productDiv, state);

  return productDiv;
}

async function loadProducts() {
  const category = getQueryParam('main');
  const subcategory = getQueryParam('sub');
  //document.getElementById('subcategory-title').textContent = subcategory || '商品列表';

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
    row => (row['商品系列'] || '').toString().trim() === (subcategory || '').toString().trim()
  );

  const container = document.getElementById('product-list');
  container.innerHTML = '';
  if (!filtered.length) {
    container.innerHTML = '<p>目前沒有這個分類的商品</p>';
    return;
  }

  const grouped = groupByProductName(filtered);

  for (const [productName, variants] of grouped.entries()) {
    const productDiv = createProductCard(productName, variants); // **呼叫模組化方法**
    container.appendChild(productDiv);
  }
}

loadProducts();
