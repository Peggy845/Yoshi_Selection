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

/** 建立圖片清單（支援 額外圖片，頓號分隔） */
function buildImageList(variant) {
  const base = 'https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/';
  const mainImg = (variant['商品圖片'] || '').toString().trim();
  const extraRaw = (variant['額外圖片'] || '').toString().trim();
  const extraImgs = extraRaw && extraRaw !== '無'
    ? extraRaw.split('、').map(s => s.trim()).filter(Boolean)
    : [];
  const list = [];
  if (mainImg) list.push(base + mainImg);
  extraImgs.forEach(x => list.push(base + x));
  return list;
}

/** 將 right-col 的內容依變體更新（價格、詳情、庫存、狀態、圖片區按鈕顯示） */
function applyVariantToUI(productRoot, variant, state) {  
  productRoot.querySelector('.product-name').textContent = variant['商品名稱'] || '';
  productRoot.querySelector('.product-price').textContent = `\$ ${variant['價格'] || ''}`;
  productRoot.querySelector('.product-detail').textContent = variant['詳細資訊'] || '';
  productRoot.querySelector('.stock-text').textContent = `還剩 ${variant['庫存'] || 0} 件`;
  productRoot.querySelector('.quantity-input').max = variant['庫存'] || 0;

  const statusEl = productRoot.querySelector('.sale-status-block');
  statusEl.textContent = `狀態: ${variant['販售狀態'] || ''}`;

  // 更新圖片
  const imgList = buildImageList(variant);
  state.imgList = imgList;
  state.imgIndex = 0;
  productRoot.querySelector('.main-image').src = imgList[0] || '';

  // 顯示箭頭
  const leftArrow = productRoot.querySelector('.arrow-left');
  const rightArrow = productRoot.querySelector('.arrow-right');
  const showArrows = imgList.length > 1;
  leftArrow.style.display = showArrows ? '' : 'none';
  rightArrow.style.display = showArrows ? '' : 'none';
}

/** 生成選項群組（每個 選項-xxx 一行） */
function renderOptionGroups(optionWrap, optionKeys, optionValues, selection) {
  optionWrap.innerHTML = '';
  optionKeys.forEach(k => {
    const values = optionValues[k] || [];
    if (values.length <= 1) return; // 只有一種值就隱藏

    const group = document.createElement('div');
    group.className = 'option-group';

    const title = document.createElement('div');
    title.className = 'option-title';
    title.textContent = k.replace('選項-', '');
    group.appendChild(title);

    const buttons = document.createElement('div');
    buttons.className = 'option-buttons';

    values.forEach((val, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.type = 'button';
      btn.dataset.optionKey = k;
      btn.dataset.optionValue = val;
      btn.textContent = val;

      if (!selection[k] && idx === 0) {
        selection[k] = val; // 預設選第一個
      }
      if (selection[k] === val) {
        btn.classList.add('selected');
      }
      buttons.appendChild(btn);
    });

    group.appendChild(buttons);
    optionWrap.appendChild(group);
  });
}

/** 初始化選項選擇 */
function initOptionSelection(productDiv, state) {
  const optionWrap = productDiv.querySelector('.product-option');
  renderOptionGroups(optionWrap, state.optionKeys, collectOptionValues(state.variants, state.optionKeys), state.selection);

  optionWrap.addEventListener('click', (e) => {
    if (!e.target.classList.contains('option-btn')) return;
    const btn = e.target;
    const key = btn.dataset.optionKey;
    const val = btn.dataset.optionValue;

    // 更新選擇狀態
    state.selection[key] = val;

    // 更新按鈕樣式
    optionWrap.querySelectorAll(`[data-option-key="${key}"]`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    // 更新對應變體
    const variant = findVariantBySelection(state.variants, state.selection);
    if (variant) applyVariantToUI(productDiv, variant, state);
  });
}

/** 數量控制與購物車 */
function initQuantityAndCart(productDiv) {
  productDiv.addEventListener('click', (e) => {
    const target = e.target;

    if (target.classList.contains('qty-btn')) {
      const input = productDiv.querySelector('.quantity-input');
      const max = parseInt(input.max || '0', 10);
      let val = parseInt(input.value || '1', 10);
      val = target.dataset.type === 'plus'
        ? Math.min(max || Infinity, val + 1)
        : Math.max(1, val - 1);
      input.value = val;
    }

    if (target.classList.contains('cart-btn')) {
      target.classList.toggle('active');
      target.textContent = target.classList.contains('active') ? '已加入' : '加入購物車';
    }
  });
}

/** HTML 產生器 */
function generateProductHTML(productName, variant, imgList) {
  return `
    <div class="left-col">
        <div class="product-image-block">
          <div class="arrow-block arrow-left" style="${imgList.length > 1 ? '' : 'display:none'}">
            <svg viewBox="0 0 24 24"><path d="M15 6 L9 12 L15 18"/></svg>
          </div>
          <img src="${imgList[0] || ''}" class="main-image" alt="${productName}">
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
			  <span class="stock-text">數量</span>
	          <button class="qty-btn" data-type="minus" type="button">−</button>
	          <input class="quantity-input" type="number" value="1" min="1" max="${variant['庫存'] || 0}" readonly>
	          <button class="qty-btn" data-type="plus" type="button">＋</button>
	          <span class="stock-text">還剩 ${variant['庫存'] || 0} 件</span>
	        </div>          </div>
          <div class="product-cart">
            <button class="cart-btn" type="button">加入購物車</button>
          </div>
        </div>
    </div>
  `;
}

function initImageNavigation(productDiv, state) {
  const imgEl = productDiv.querySelector('.main-image');
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

// ===== 放大鏡（局部放大，正方形） =====
function initMagnifier(productDiv) {
  const block = productDiv.querySelector(".product-image-block");
  if (!block) return;

  const img = block.querySelector("img");              // 主圖
  const btn = block.querySelector(".magnifier-btn");   // 按鈕
  if (!img || !btn) return;

  // 動態建立鏡片
  let lens = block.querySelector(".magnifier-lens");
  if (!lens) {
    lens = document.createElement("div");
    lens.className = "magnifier-lens";
    lens.setAttribute("aria-hidden", "true");
    block.appendChild(lens);
  }

  const ZOOM = 2.5;   // 放大倍率（可調）
  let active = false;

  // 鏡片尺寸：依容器短邊 28%（100~220 之間）
  function fitLensSize() {
    const r = block.getBoundingClientRect();
    const s = Math.round(Math.max(100, Math.min(220, Math.min(r.width, r.height) * 0.28)));
    lens.style.width = s + "px";
    lens.style.height = s + "px";
  }

  // 主計算：用「圖片顯示區域」座標做對位（完美對準 object-fit: contain）
  function updateByEvent(ev) {
    const lensW = lens.offsetWidth, lensH = lens.offsetHeight;
    const blockRect = block.getBoundingClientRect();
    const imgRect   = img.getBoundingClientRect(); // 圖片實際顯示大小與位置

    // 指標相對 block 的座標
    let px = ev.clientX - blockRect.left;
    let py = ev.clientY - blockRect.top;

    // 先把鏡片放進 block（整塊不出界）
    let left = Math.max(0, Math.min(px - lensW / 2, blockRect.width  - lensW));
    let top  = Math.max(0, Math.min(py - lensH / 2, blockRect.height - lensH));
    lens.style.left = left + "px";
    lens.style.top  = top  + "px";

    // 鏡片中心點（相對 block）
    const cx = left + lensW / 2;
    const cy = top  + lensH / 2;

    // 轉成圖片顯示區域中的 0~1
    const imgLeftInBlock = imgRect.left - blockRect.left;
    const imgTopInBlock  = imgRect.top  - blockRect.top;

    const nx = Math.max(0, Math.min(1, (cx - imgLeftInBlock) / imgRect.width));
    const ny = Math.max(0, Math.min(1, (cy - imgTopInBlock)  / imgRect.height));

    // 背景圖用「圖片顯示尺寸 * ZOOM」，因此與上面座標系一致，不會偏
    const bgW = imgRect.width  * ZOOM;
    const bgH = imgRect.height * ZOOM;

    lens.style.backgroundImage  = `url("${img.src}")`;
    lens.style.backgroundSize   = `${bgW}px ${bgH}px`;
    lens.style.backgroundRepeat = "no-repeat";

    // 讓鏡片中心對準 (nx, ny)
    const focusX = nx * bgW;
    const focusY = ny * bgH;
    lens.style.backgroundPosition = `${-(focusX - lensW/2)}px ${-(focusY - lensH/2)}px`;
  }

  function onMove(ev) {
    if (!active) return;
    updateByEvent(ev);
  }

  function enable(ev) {
    fitLensSize();
    lens.style.display = "block";
    active = true;

    // 立刻用「點擊當下的座標」初始化，避免出現空框
    if (ev) updateByEvent(ev);

    block.addEventListener("mousemove", onMove);
    block.addEventListener("mouseleave", disable);
  }

  function disable() {
    lens.style.display = "none";
    active = false;
    block.removeEventListener("mousemove", onMove);
    block.removeEventListener("mouseleave", disable);
  }

  // 切換
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    active ? disable() : enable(e);   // 傳入點擊事件座標
  });

  // 點外面或 Esc 關閉
  document.addEventListener("click", (e) => { if (!block.contains(e.target)) disable(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") disable(); });

  // 視窗改變時只調整大小（不再自動置中）
  window.addEventListener("resize", () => { if (active) fitLensSize(); });
}


function createProductCard(productName, variants) {
  const productDiv = document.createElement('div');
  productDiv.className = 'product-item';

  const optionKeys = extractOptionKeys(variants);
  const optionValues = collectOptionValues(variants, optionKeys);

 // 初始選擇 = 第一列對應之選項
  const initialVariant = variants[0];
  const selection = {};
  optionKeys.forEach(k => {
    const val = (initialVariant[k] || '').toString().trim();
    if (val) selection[k] = val;
  });

  // 初始圖片清單
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
  initMagnifier(productDiv);
  initOptionSelection(productDiv, state);
  initQuantityAndCart(productDiv, state);

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


// ===== 全域 =====
// ===== 初始化：整個頁面載入完成後執行 (控制縮放功能) =====
document.addEventListener("DOMContentLoaded", () => {
	// 設定基準尺寸
  const baseW = window.innerWidth;
  const baseH = window.innerHeight;
  document.documentElement.style.setProperty('--base-w', baseW + 'px');
  document.documentElement.style.setProperty('--base-h', baseH + 'px');
  
  // 如果還有 sub-image-block 需要調整，這裡可以呼叫 adjustSubBlocks()
  // requestAnimationFrame(adjustSubBlocks);
});

// ===== 初始化：整個頁面載入完成後執行 (放大鏡功能) =====
// 初始化放大鏡：直接對每個 .product-item 綁定
document.querySelectorAll(".product-item").forEach(productDiv => {
  initMagnifier(productDiv);
});