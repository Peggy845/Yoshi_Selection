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

/** 依目前選擇的選項找對應變體；若找不到回傳 null */
function findVariantBySelection(variants, selection) {
  return variants.find(v =>
    Object.keys(selection).every(k => (v[k] || '').toString().trim() === selection[k])
  ) || null;
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

//新增 HTML 產生器
function generateProductHTML(productName, variant, imgList) {
  return `
    <div class="left-col">
        <div class="product-image-block">
		    <div class="arrow-block arrow-left" style="${imgList.length > 1 ? '' : 'display:none'}">
			  <svg viewBox="0 0 24 24"><path d="M15 6 L9 12 L15 18"/></svg>
			</div>
			<img src="${imgList[0] || ''}" alt="${productName}">
			<div class="arrow-block arrow-right" style="${imgList.length > 1 ? '' : 'display:none'}">
			  <svg viewBox="0 0 24 24"><path d="M9 6 L15 12 L9 18"/></svg>
			</div>
			
          <!-- 放大鏡按鈕（右下角） -->
          <button class="magnifier-btn" type="button" aria-label="啟用放大鏡" title="放大鏡">
            <!-- 簡潔漂亮的 SVG 放大鏡 -->
            <svg viewBox="0 0 24 24" class="magnifier-icon" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="11" y1="7" x2="11" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="7" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <!-- 放大鏡視窗（正方形、預設隱藏） -->
          <div class="magnifier-lens" aria-hidden="true"></div>
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
        <div class="product-option">選項區</div>
        <div class="product-others">
          <div class="sale-status-block">狀態: ${variant['販售狀態'] || ''}</div>
          <div class="product-quantity">
	        <div class="quantity-block">
	          <span>數量</span>
	          <button class="qty-btn" data-type="minus" type="button">−</button>
	          <input class="quantity-input" type="number" value="1" min="1" max="${variant['庫存'] || 0}" readonly>
	          <button class="qty-btn" data-type="plus" type="button">＋</button>
	          <span class="stock-text">還剩 ${variant['庫存'] || 0} 件</span>
	        </div>
          </div>
          <div class="product-cart">
            <button class="cart-btn" type="button">加入購物車</button>
          </div>
        </div>
    </div>
  `;
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

/* 
function initMagnifier(productDiv, state) {
  const imgEl = productDiv.querySelector('.product-image-block img');
  const magnifierBtn = productDiv.querySelector('.magnifier-btn');
  const imgBlock = productDiv.querySelector('.product-image-block');

  const lens = document.createElement('div');
  lens.className = 'magnifier-lens';
  const lensImg = imgEl.cloneNode(true);
  lens.appendChild(lensImg);
  imgBlock.appendChild(lens);

  let zoomActive = false;
  const ZOOM = 2;

  const updateLensImage = () => {
    const rect = imgEl.getBoundingClientRect();
    lensImg.src = state.imgList[state.imgIndex] || '';
    lensImg.style.width = rect.width * ZOOM + 'px';
    lensImg.style.height = rect.height * ZOOM + 'px';
  };

  magnifierBtn.addEventListener('click', () => {
    zoomActive = !zoomActive;
    lens.style.display = zoomActive ? 'block' : 'none';
    if (zoomActive) updateLensImage();
  });

  imgBlock.addEventListener('mousemove', (e) => {
    if (!zoomActive) return;
    const rect = imgEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lensW = lens.offsetWidth, lensH = lens.offsetHeight;
    let lensX = Math.max(0, Math.min(rect.width - lensW, x - lensW / 2));
    let lensY = Math.max(0, Math.min(rect.height - lensH, y - lensH / 2));
    lens.style.left = lensX + 'px';
    lens.style.top = lensY + 'px';
    lensImg.style.left = -lensX * ZOOM + 'px';
    lensImg.style.top = -lensY * ZOOM + 'px';
  });
}
*/

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
/*
  initMagnifier(productDiv, state);
  initOptionSelection(productDiv, state);
  initQuantityAndCart(productDiv, state);
*/

  return productDiv;
}

// --- 全域：sub-image 群組的自適應與等比填滿 ---
window.adjustSubBlocks = function adjustSubBlocks() {
  document.querySelectorAll(".sub-image-block").forEach(block => {
    const group = block.querySelector(".sub-group");
    if (!group) return;

    const arrows = group.querySelectorAll(".sub-arrow");
    const images = Array.from(group.querySelectorAll(".sub-image"));

    const blockWidth = block.clientWidth;
    const arrowW = arrows[0] ? arrows[0].offsetWidth : 0;
    // 有固定 CSS: .sub-image { width:60px; height:60px }，這裡就能在圖片未載入前拿到正確寬度
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
};

async function loadProducts() {
  const category = getQueryParam('main');
  const subcategory = getQueryParam('sub');
  console.log("分頁名稱: ", category);
  console.log("第二層名稱: ", subcategory);
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

  console.log("共有多少商品", filtered.length);
  
  const grouped = groupByProductName(filtered);

  for (const [productName, variants] of grouped.entries()) {
    const productDiv = createProductCard(productName, variants); // **呼叫模組化方法**
    container.appendChild(productDiv);
  }
  
    // 全部 append 完，讓瀏覽器先排版一次再量
  requestAnimationFrame(() => {
    window.adjustSubBlocks();

    // 初次綁定 resize（避免重複綁）
    if (!window.__subResizeBound) {
      window.addEventListener('resize', window.adjustSubBlocks);
      window.__subResizeBound = true;
    }
  });

  // 圖片載入完成後再保險量一次（避免 offsetWidth 還未就緒）
  const subImgs = document.querySelectorAll('.sub-image');
  let remain = subImgs.length;
  if (remain === 0) return;
  subImgs.forEach(img => {
    if (img.complete) {
      if (--remain === 0) window.adjustSubBlocks();
    } else {
      img.addEventListener('load', () => {
        if (--remain === 0) window.adjustSubBlocks();
      }, { once: true });
      img.addEventListener('error', () => {
        if (--remain === 0) window.adjustSubBlocks();
      }, { once: true });
    }
  });
}

loadProducts();

document.addEventListener("DOMContentLoaded", () => {
  const ZOOM = 2.5; // 放大倍率
  let activeBlock = null; // 紀錄目前啟用放大鏡的 block

  document.querySelectorAll(".product-image-block").forEach(block => {
    const img = block.querySelector(".product-image-block img");
    const btn = block.querySelector(".magnifier-btn");

    if (!img || !btn) return;

    // 建立鏡片元素
    const lens = document.createElement("div");
    lens.className = "magnifier-lens";
    lens.style.display = "none";
    block.appendChild(lens);

    // 調整鏡片大小（根據圖片容器較短邊的 25%）
    function fitLensSize() {
      const rect = block.getBoundingClientRect();
      const size = Math.max(80, Math.min(200, Math.min(rect.width, rect.height) * 0.25));
      lens.style.width = size + "px";
      lens.style.height = size + "px";
    }

    // 設定鏡片背景
    function setLensBackground(nx, ny) {
      const imgRect = img.getBoundingClientRect();
      const blockRect = block.getBoundingClientRect();
      const lensRect = lens.getBoundingClientRect();

      const lensW = lensRect.width;
      const lensH = lensRect.height;

      const bgW = imgRect.width * ZOOM;
      const bgH = imgRect.height * ZOOM;

      lens.style.backgroundImage = `url("${img.src}")`;
      lens.style.backgroundSize = `${bgW}px ${bgH}px`;

      const focusX = nx * bgW;
      const focusY = ny * bgH;

      const bgPosX = -(focusX - lensW / 2);
      const bgPosY = -(focusY - lensH / 2);
      lens.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
    }

    // 移動鏡片
    function placeLens(x, y) {
      const lensW = lens.offsetWidth;
      const lensH = lens.offsetHeight;
      const blockW = block.clientWidth;
      const blockH = block.clientHeight;

      const clampedX = Math.max(0, Math.min(x - lensW / 2, blockW - lensW));
      const clampedY = Math.max(0, Math.min(y - lensH / 2, blockH - lensH));

      lens.style.left = clampedX + "px";
      lens.style.top = clampedY + "px";

      const nx = (clampedX + lensW / 2) / blockW;
      const ny = (clampedY + lensH / 2) / blockH;

      setLensBackground(nx, ny);
    }

    // 啟用放大鏡
    function enableMagnifier() {
      fitLensSize();
      lens.style.display = "block";
      activeBlock = block;

      const rect = block.getBoundingClientRect();
      placeLens(rect.width / 2, rect.height / 2); // 初始放中間

      block.addEventListener("mousemove", onMove);
      block.addEventListener("mouseleave", onLeave);
    }

    // 關閉放大鏡
    function disableMagnifier() {
      lens.style.display = "none";
      if (activeBlock === block) activeBlock = null;
      block.removeEventListener("mousemove", onMove);
      block.removeEventListener("mouseleave", onLeave);
    }

    function toggleMagnifier(e) {
      e.stopPropagation();
      if (lens.style.display === "block") {
        disableMagnifier();
      } else {
        if (activeBlock && activeBlock !== block) {
          const otherBtn = activeBlock.querySelector(".magnifier-btn");
          otherBtn && otherBtn.click();
        }
        enableMagnifier();
      }
    }

    function onMove(ev) {
      const rect = block.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      placeLens(x, y);
    }

    function onLeave() {
      // 滑鼠移出區域 → 保持鏡片位置，不自動關閉
    }

    // 綁定事件
    btn.addEventListener("click", toggleMagnifier);

    document.addEventListener("click", (ev) => {
      if (!block.contains(ev.target)) disableMagnifier();
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") disableMagnifier();
    });

    window.addEventListener("resize", () => {
      if (lens.style.display === "block") {
        fitLensSize();
        const rect = block.getBoundingClientRect();
        placeLens(rect.width / 2, rect.height / 2);
      }
    });
  });
});