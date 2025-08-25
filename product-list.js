
  /** ===== 基本設定 ===== */
  const SHEET_ID = '1KXmggPfKqpg5gZCsUujlpdTcKSFdGJHv4bOux3nc2xo';
  const IMAGE_BASE = 'https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/';

  /** ===== 工具 ===== */
// 原本的函式，維持不動
	function getQueryParam(param) {
	  const urlParams = new URLSearchParams(window.location.search);
	  return urlParams.get(param);
	}

	function norm(v) { 
	  return (v ?? '').toString().trim(); 
	}
	
	// 專門拿 main & sub
	function getCategoryParams() {
	  return {
		main: norm(getQueryParam("main")),
		sub: norm(getQueryParam("sub"))
	  };
	}

  /** 抓多分頁資料（維持你原本的做法） */
  async function fetchMultipleSheets(sheetNames) {
    const allData = {};
    for (const name of sheetNames) {
      if (name === '分類圖片') continue;
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(name)}&tqx=out:json`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`無法讀取分頁：${name}`);
        const text = await res.text();
        const json = JSON.parse(text.substring(47, text.length - 2));
        const cols = json.table.cols.map(col => norm(col.label));
        const rows = json.table.rows.map(row => {
          const obj = {};
          row.c.forEach((cell, i) => { obj[cols[i]] = cell ? cell.v : ''; });
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
      const name = norm(r['商品名稱']);
      if (!name) return;
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(r);
    });
    return map; // Map(name -> [row,row,...])
  }

  /** 取得所有選項欄位（至少某列不為空） */
  function extractOptionKeys(variants) {
    const set = new Set();
    variants.forEach(v => {
      Object.keys(v).forEach(k => {
        if (k.startsWith('選項-') && norm(v[k]) !== '') set.add(k);
      });
    });
    return Array.from(set);
  }

  /** 收集每個選項欄位的所有值（依出現順序去重） */
  function collectOptionValues(variants, optionKeys) {
    const values = {};
    optionKeys.forEach(k => {
      const seen = new Set();
      values[k] = [];
      variants.forEach(v => {
        const val = norm(v[k]);
        if (val && !seen.has(val)) { seen.add(val); values[k].push(val); }
      });
    });
    return values; // { '選項-尺寸': ['22cm','33cm'], ... }
  }

  /** 找到完全吻合 selection 的變體；找不到回傳 null */
  function findVariantBySelection(variants, selection) {
    return variants.find(v => Object.keys(selection).every(k => norm(v[k]) === selection[k])) || null;
  }

  /** 計算在特定 selection（排除 targetKey）下，targetKey 可用值集合 */
  function calcValidValues(variants, selection, targetKey) {
    const set = new Set();
    variants.forEach(v => {
      // 其他 key 都要符合 selection（忽略 targetKey）
      const ok = Object.entries(selection).every(([k, val]) => {
        if (k === targetKey) return true;
        return norm(v[k]) === val;
      });
      if (ok) {
        const tv = norm(v[targetKey]);
        if (tv) set.add(tv);
      }
    });
    return set;
  }

  /** 建立圖片陣列：商品圖片(A) + 額外圖片 B、C、D… (頓號分隔) */
	function buildImageArray(variant) {
	  const images = [];
	  if (!variant || !variant['商品圖片']) return images; // 防止 undefined
	  
	  const main = norm(variant['商品圖片']);
	  const extras = variant['額外圖片'] ? norm(variant['額外圖片']) : '';

	  // 主圖一定放第一張
	  if (main) images.push(IMAGE_BASE + main);

	  // 額外圖片
	  if (extras) {
		const extraArr = extras.split('、').map(s => IMAGE_BASE + norm(s));
		images.push(...extraArr);
	  }

	  return images;
	}

  /** 將價格/庫存/狀態/詳情更新到 UI（不處理圖片） */
  function applyVariantFields(productRoot, variant) {
    productRoot.querySelector('.product-name').textContent  = norm(variant['商品名稱']) || '';
    productRoot.querySelector('.product-price').textContent = `\$ ${norm(variant['價格']) || ''}`;
    productRoot.querySelector('.product-detail').textContent = norm(variant['詳細資訊']) || '';
    productRoot.querySelector('.sale-status-block').textContent = `狀態: ${norm(variant['販售狀態']) || ''}`;

    const stock = parseInt(norm(variant['庫存']) || '0', 10);
    productRoot.querySelectorAll('.stock-text').forEach(el => el.textContent = `還剩 ${isNaN(stock) ? 0 : stock} 件`);
    const qty = productRoot.querySelector('.quantity-input');
    if (qty) qty.max = isNaN(stock) ? 0 : stock;
  }

  /** 產生商品卡片 HTML（含主圖左右箭頭 + sub 區左右箭頭(3格縮圖) + 放大鏡結構） */
  function generateProductHTML(productName, variant, img) {
    const mainUrl = img.mainUrl || '';
    return `
      <div class="left-col">
        <div class="product-image-block">
          <img src="${mainUrl}" class="main-image" alt="${productName}">
          <button class="magnifier-btn" type="button" aria-label="啟用放大鏡" title="放大鏡">
            <svg viewBox="0 0 24 24" class="magnifier-icon" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="11" y1="7" x2="11" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="7" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="magnifier-lens" aria-hidden="true" style="display:none;"></div>
        </div>

		<div class="sub-image-block">
		  <div class="sub-group-wrapper">
			<div class="sub-group"></div>
		  </div>
		  <div class="sub-scrollbar"></div> <!-- 下半部 scroll bar -->
		</div>
      </div>

      <div class="right-col">
        <div class="product-name">${productName}</div>
        <div class="product-price">$ ${norm(variant['價格']) || ''}</div>
        <div class="product-detail">${norm(variant['詳細資訊']) || ''}</div>
        <div class="product-option"></div>
        <div class="product-others">
          <div class="sale-status-block">狀態: ${norm(variant['販售狀態']) || ''}</div>
          <div class="product-quantity">
            <div class="quantity-block">
              <span class="stock-text">還剩 ${norm(variant['庫存']) || 0} 件</span>
              <div class="qty-ctrls">
                <button class="qty-btn" data-type="minus" type="button">−</button>
                <input class="quantity-input" type="number" value="1" min="1" max="${norm(variant['庫存']) || 0}" readonly>
                <button class="qty-btn" data-type="plus" type="button">＋</button>
              </div>
            </div>
          </div>
          <div class="product-cart">
            <button class="cart-btn" type="button">加入購物車</button>
          </div>
        </div>
      </div>
    `;
  }
  
  /** 初始化選項群組 + 邏輯 */
  function initOptions(productDiv, state) {
    const wrap = productDiv.querySelector('.product-option');
    wrap.innerHTML = '';

    // 只顯示「有超過一種值」的選項
    const displayKeys = state.optionKeys.filter(k => {
      const uniq = new Set(state.optionValues[k] || []);
      return uniq.size > 1;
    });
    state.displayKeys = displayKeys;

    displayKeys.forEach(k => {
      const group = document.createElement('div');
      group.className = 'option-group';

      const title = document.createElement('div');
      title.className = 'option-title';
      title.textContent = k.replace('選項-', '');
      group.appendChild(title);

      const btns = document.createElement('div');
      btns.className = 'option-buttons';
      (state.optionValues[k] || []).forEach(val => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.dataset.optionKey = k;
        btn.dataset.optionValue = val;
        btn.textContent = val;
        if (state.selection[k] === val) btn.classList.add('selected');
        btns.appendChild(btn);
      });

      group.appendChild(btns);
      wrap.appendChild(group);
    });

    // 委派事件：互斥選擇 + 更新其他區塊
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.option-btn');
      if (!btn) return;
      if (btn.classList.contains('disabled')) return;

      const key = btn.dataset.optionKey;
      const val = btn.dataset.optionValue;

      // 同一群互斥
      const group = btn.closest('.option-buttons');
      group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      // 更新 selection
      state.selection[key] = val;

      // 若組合無效，強制修正
      autoFixInvalidSelections(productDiv, state);

      // 取得當前有效變體
      const variant = findVariantBySelection(state.variants, state.selection) || state.variants[0];

      // 欄位刷新
      applyVariantFields(productDiv, variant);

      // 重建圖片（重設為 A 當主圖）
		// 更新 activeVariant
		state.activeVariant = variant;

		// 直接重渲染主圖與縮圖（主圖回到商品圖片）
		renderMainAndThumbs(productDiv, state, true);

      // 依目前 selection 灰掉不可能的選項
      updateOptionDisabling(productDiv, state);
    });

    // 初次渲染時就做一次 disable
    updateOptionDisabling(productDiv, state);
  }

  /** 灰掉不可能的按鈕 */
  function updateOptionDisabling(productDiv, state) {
    state.displayKeys.forEach(k => {
      const validSet = calcValidValues(state.variants, state.selection, k);
      productDiv.querySelectorAll(`.option-btn[data-option-key="${CSS.escape(k)}"]`).forEach(btn => {
        const v = btn.dataset.optionValue;
        if (validSet.size === 0 || !validSet.has(v)) {
          btn.classList.add('disabled');
          btn.disabled = true;
        } else {
          btn.classList.remove('disabled');
          btn.disabled = false;
        }
      });
    });
  }

  /** 若某群目前選擇變無效，改成該群第一個可用值 */
  function autoFixInvalidSelections(productDiv, state) {
    let variant = findVariantBySelection(state.variants, state.selection);
    if (variant) return;

    // 依序檢查每個顯示中的 option-group
    for (const k of state.displayKeys) {
      const validSet = calcValidValues(state.variants, state.selection, k);
      if (!validSet.has(state.selection[k])) {
        const first = Array.from(validSet)[0];
        if (first) state.selection[k] = first;

        // 同步 UI 按鈕 selected 樣式
        const btns = productDiv.querySelectorAll(`.option-btn[data-option-key="${CSS.escape(k)}"]`);
        btns.forEach(b => b.classList.toggle('selected', b.dataset.optionValue === state.selection[k]));
      }
    }
  }

/**
 * 渲染主圖與縮圖
 * @param {HTMLElement} productDiv - 單一商品區塊
 * @param {Object} state - 商品狀態
 * @param {boolean} hardSet - 當切換角色或初始化時，強制重設主圖
 */
function renderMainAndThumbs(productDiv, state, hardSet = false) {
  const mainImgEl = productDiv.querySelector('.main-image');
  const subGroup = productDiv.querySelector('.sub-group');
  const wrapper = productDiv.querySelector('.sub-group-wrapper');
  const scrollbar = productDiv.querySelector('.sub-scrollbar');

  // 清空舊縮圖
  subGroup.innerHTML = '';
  scrollbar.innerHTML = '';

  const variant = state.activeVariant;
  const imgList = buildImageArray(variant);

  if (!imgList || imgList.length === 0) {
    console.warn('⚠️ 找不到圖片', variant);
    mainImgEl.src = '';
    wrapper.style.overflowX = 'hidden';
    scrollbar.style.display = 'none';
    return;
  }

  // 主圖
  if (hardSet || !state.mainSrc || !imgList.includes(state.mainSrc)) {
    state.mainSrc = imgList[0];
  }
  mainImgEl.src = state.mainSrc;

  // 生成 sub-image
  imgList.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'sub-image';
    if (src === state.mainSrc) img.classList.add('active');

    img.addEventListener('click', () => {
      state.mainSrc = src;
      mainImgEl.src = src;
      subGroup.querySelectorAll('.sub-image').forEach(el => el.classList.remove('active'));
      img.classList.add('active');
    });

    subGroup.appendChild(img);
  });

  // scrollbar 顯示邏輯
  if (imgList.length > 4) {
    wrapper.style.overflowX = 'scroll';
    scrollbar.style.display = 'block';
    // scrollbar 連動 sub-group
    scrollbar.scrollLeft = 0;
    scrollbar.addEventListener('scroll', () => {
      wrapper.scrollLeft = scrollbar.scrollLeft;
    });
  } else {
    wrapper.style.overflowX = 'hidden';
    scrollbar.style.display = 'none';
  }

  state.images = imgList;
}




function initGallery(productDiv, state) {
  // 確保 activeVariant 一定指向有商品圖片的那筆
  if (!state.activeVariant || !state.activeVariant['商品圖片']) {
    const firstValid = state.variants.find(v => v['商品圖片']);
    if (firstValid) state.activeVariant = firstValid;
  }

  // 初始化主圖與縮圖
  renderMainAndThumbs(productDiv, state, true);
}

  /** ===== 放大鏡（局部放大，正方形） ===== */
  function initMagnifier(productDiv) {
    const block = productDiv.querySelector(".product-image-block");
    if (!block) return;

    const img = block.querySelector(".main-image");     // 主圖
    const btn = block.querySelector(".magnifier-btn");  // 按鈕
    if (!img || !btn) return;

    // 鏡片
    let lens = block.querySelector(".magnifier-lens");
    if (!lens) {
      lens = document.createElement("div");
      lens.className = "magnifier-lens";
      lens.setAttribute("aria-hidden", "true");
      block.appendChild(lens);
    }

    const ZOOM = 2.5;
    let active = false;

    function fitLensSize() {
      const r = block.getBoundingClientRect();
      const s = Math.round(Math.max(100, Math.min(220, Math.min(r.width, r.height) * 0.28)));
      lens.style.width = s + "px";
      lens.style.height = s + "px";
    }

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

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      active ? disable() : enable(e);
    });

    document.addEventListener("click", (e) => { if (!block.contains(e.target)) disable(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") disable(); });
    window.addEventListener("resize", () => { if (active) fitLensSize(); });
  }

  /** 數量與購物車（維持你的邏輯） */
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

  /** 建立商品卡片 + 綁定全部功能 */
  function createProductCard(productName, variants) {
    // 初始選擇：直接用第一個變體，確保有效
    const optionKeys = extractOptionKeys(variants);
    const optionValues = collectOptionValues(variants, optionKeys);
    const initialVariant = variants[0] || {};
    const selection = {};
    optionKeys.forEach(k => {
      const val = norm(initialVariant[k]);
      if (val) selection[k] = val;
    });

    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';

    const images = buildImageArray(initialVariant);
    productDiv.innerHTML = generateProductHTML(productName, initialVariant, images);

    const state = {
      variants,
      optionKeys,
      optionValues,
      selection,
      images,
      currentMainIndex: 0,
      thumbOffset: 0
    };

    // 綁功能
    initGallery(productDiv, state);       // 主圖 + 縮圖（方案3）
    initMagnifier(productDiv);            // 放大鏡
    initOptions(productDiv, state);       // 選項互斥 + 灰掉
    applyVariantFields(productDiv, initialVariant); // 文字欄位
    initQuantityAndCart(productDiv);      // 數量/購物車

    console.log(productName, variants);

    return productDiv;
  }

  /** ===== 載入頁面 ===== */
  async function loadProducts() {
    const category = getQueryParam('main');
    const subcategory = getQueryParam('sub');

    const sheetNames = [
      '日本寶可夢',
      '日本三麗鷗',
      '日本貓福珊迪',
      '日本親子玩具與母嬰用品',
      '日本童裝品牌',
      '進擊的巨人'
    ];

    const allSheetsData = await fetchMultipleSheets(sheetNames);
    const container = document.getElementById('product-list');
    if (!allSheetsData[category] || allSheetsData[category].length === 0) {
      container.innerHTML = '<p>目前沒有這個分類的商品</p>';
      return;
    }

    const filtered = allSheetsData[category].filter(
      row => norm(row['商品系列']) === norm(subcategory)
    );

    container.innerHTML = '';
    if (!filtered.length) {
      container.innerHTML = '<p>目前沒有這個分類的商品</p>';
      return;
    }

    const grouped = groupByProductName(filtered);
    for (const [productName, variants] of grouped.entries()) {
      const productDiv = createProductCard(productName, variants);
      container.appendChild(productDiv);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProducts);
  } else {
    loadProducts();
  }

document.querySelectorAll('.option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.optionKey;
    const value = btn.dataset.optionValue;
    const productDiv = btn.closest('.product-item');
    const state = productDiv._state;

    // 更新 activeVariant
    const newVariant = state.variants.find(v => v[key] === value);
    if (!newVariant) return;
    state.activeVariant = newVariant;

    // 更新主圖與縮圖
    renderMainAndThumbs(productDiv, state, true);

    // 更新選中按鈕樣式
    btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

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

// ===== 隨 resize 調整 =====
window.addEventListener("resize", () => {
  document.documentElement.style.setProperty('--base-w', window.innerWidth + 'px');
  document.documentElement.style.setProperty('--base-h', window.innerHeight + 'px');
});

// ===== 購物車功能 =====
// === 監聽購物車按鈕，使用事件委派 ===
document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("cart-btn")) return;

  const btn = e.target;
  const productItem = btn.closest(".product-item");
  if (!productItem) return;

  const name = productItem.querySelector(".product-name").textContent.trim();
  const priceText = productItem.querySelector(".product-price").textContent.trim();
  const price = parseInt(priceText.replace(/[^\d]/g, ""), 10);
  const quantity = parseInt(productItem.querySelector(".quantity-input").value, 10);
  const image = productItem.querySelector(".main-image").src;

  const options = {};
  const optionGroups = productItem.querySelectorAll(".option-group");
  optionGroups.forEach((group) => {
    const title = group.querySelector(".option-title").textContent.trim();
    const selectedBtn = group.querySelector(".option-btn.selected");
    options[title] = selectedBtn ? selectedBtn.dataset.optionValue : null;
  });

  // 拿分類參數
  const { main, sub } = getCategoryParams();

  let cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];

  const existingIndex = cart.findIndex(
    (item) =>
      item.name === name &&
      JSON.stringify(item.options) === JSON.stringify(options)
  );

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      name,
      price,
      image,
      options,
      quantity,
      main,
      sub
    });
  }

  localStorage.setItem("shoppingCart", JSON.stringify(cart));
  updateCartBadge();
  console.log(`✅ 已新增 ${name} 到購物車`);
  console.table(cart);

  // 6. 改變按鈕狀態
  btn.classList.add("active");
  btn.textContent = "已加入";
});


// === 測試用：查看 localStorage 內容 ===
const testCartBtn = document.createElement("button");
testCartBtn.textContent = "查看購物車資料";
testCartBtn.style.position = "fixed";
testCartBtn.style.bottom = "20px";
testCartBtn.style.left = "20px";
testCartBtn.style.padding = "10px 15px";
testCartBtn.style.backgroundColor = "#0078d7";
testCartBtn.style.color = "white";
testCartBtn.style.border = "none";
testCartBtn.style.borderRadius = "5px";
testCartBtn.style.cursor = "pointer";
testCartBtn.style.zIndex = "9999";

document.body.appendChild(testCartBtn);

testCartBtn.addEventListener("click", () => {
  const cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];
  console.log("=== 測試購物車資料 ===");
  console.table(cart);
  alert(`購物車目前有 ${cart.length} 筆商品，請查看 console`);
});

// 更新購物車徽章
function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById("cart-badge");
  if (badge) {
    badge.textContent = totalQty;
    badge.style.display = totalQty > 0 ? "inline-block" : "none";
  }
}

// 初始化按鈕狀態
function syncCartStatus() {
  const cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];
  const items = document.querySelectorAll(".product-item");

  items.forEach((item) => {
    const name = item.querySelector(".product-name").textContent.trim();
    const btn = item.querySelector(".cart-btn");

    const inCart = cart.some((p) => p.name === name);
    if (inCart) {
      btn.classList.add("active");
      btn.textContent = "已加入";
    } else {
      btn.classList.remove("active");
      btn.textContent = "加入購物車";
    }
  });
}

// 初始化
updateCartBadge();
syncCartStatus();
