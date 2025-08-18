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
/*
  const state = {
    variants,
    optionKeys,
    selection,
    imgList: imgListInit,
    imgIndex: 0
  };

  // **綁定功能模組**
  initImageNavigation(productDiv, state);
  initMagnifier(productDiv, state);
  initOptionSelection(productDiv, state);
  initQuantityAndCart(productDiv, state);
*/

  return productDiv;
}

//新增 HTML 產生器
function generateProductHTML(productName, variant, imgList) {
  return `
    <div class="left-col">
        <div class="product-image-block">
			<img src="${imgList[0] || ''}" alt="${productName}">
			
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
}

loadProducts();

document.addEventListener("DOMContentLoaded", () => {
  // 以「載入當下」的視窗大小作為 100% 基準（僅做一次）
  const baseW = window.innerWidth;
  const baseH = window.innerHeight;
  document.documentElement.style.setProperty('--base-w', baseW + 'px');
  document.documentElement.style.setProperty('--base-h', baseH + 'px');

  // ===== sub-image 群組的自適應與等比填滿 =====
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

  // ===== 放大鏡（局部放大，正方形） =====
  const ZOOM = 2.5; // 放大倍率（可調）
  let activeBlock = null; // 目前啟用放大鏡的 .product-image-block

  // 讓每個 product-image-block 都可用放大鏡
  document.querySelectorAll(".product-image-block").forEach(block => {
    const img = block.querySelector(".main-image");
    const btn = block.querySelector(".magnifier-btn");
    const lens = block.querySelector(".magnifier-lens");

    if (!img || !btn || !lens) return;

    // 動態依容器大小調整鏡片尺寸（較短邊的 28%，介於 100~220）
    function fitLensSize() {
      const rect = block.getBoundingClientRect();
      const s = Math.round(Math.max(100, Math.min(220, Math.min(rect.width, rect.height) * 0.28)));
      lens.style.width = s + "px";
      lens.style.height = s + "px";
    }

    // 計算圖片在容器中的「實際顯示區域」（object-fit: contain 會留邊）
    function getDisplayedImageRect() {
      const blockRect = block.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      // 相對於 block 的座標
      const left = imgRect.left - blockRect.left;
      const top  = imgRect.top  - blockRect.top;
      return { left, top, width: imgRect.width, height: imgRect.height };
    }

    // 設定鏡片背景（放大）
    function setLensBackground(nx, ny) {
      // nx, ny = 在「圖片顯示區域」中的 0~1 座標
      const disp = getDisplayedImageRect();
      const lensRect = lens.getBoundingClientRect();
      const lensW = lensRect.width;
      const lensH = lensRect.height;

      // 背景圖尺寸 = 圖片顯示寬/高 * 放大倍率
      const bgW = disp.width * ZOOM;
      const bgH = disp.height * ZOOM;
      lens.style.backgroundImage = `url("${img.src}")`;
      lens.style.backgroundSize = `${bgW}px ${bgH}px`;

      // 背景定位 = 以鏡片中心為對應點
      const focusX = nx * bgW;
      const focusY = ny * bgH;
      const bgPosX = -(focusX - lensW / 2);
      const bgPosY = -(focusY - lensH / 2);
      lens.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
    }

    // 將鏡片放在 block 內的某個絕對位置（x,y 為相對於 block 左上角）
    function placeLens(x, y) {
      const lensW = lens.offsetWidth;
      const lensH = lens.offsetHeight;
      const blockW = block.clientWidth;
      const blockH = block.clientHeight;

      // 讓鏡片「整塊」不超出 block
      const clampedX = Math.max(0, Math.min(x - lensW / 2, blockW - lensW));
      const clampedY = Math.max(0, Math.min(y - lensH / 2, blockH - lensH));

      lens.style.left = clampedX + "px";
      lens.style.top  = clampedY + "px";

      // 算出鏡片中心在「圖片顯示區域」中的比例座標
      const disp = getDisplayedImageRect();
      const centerX = clampedX + lensW / 2;
      const centerY = clampedY + lensH / 2;

      // 如果鏡片中心落在邊框區（非圖片區域），要夾回圖片區域範圍
      const nx = Math.max(0, Math.min(1, (centerX - disp.left) / disp.width));
      const ny = Math.max(0, Math.min(1, (centerY - disp.top)  / disp.height));

      setLensBackground(nx, ny);
    }

    // 啟用放大鏡
    function enableMagnifier() {
      fitLensSize();
      lens.style.display = "block";
      activeBlock = block;

      // 初始置中
      const rect = block.getBoundingClientRect();
      placeLens(rect.width / 2, rect.height / 2);

      // 追蹤滑鼠
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
      e.stopPropagation(); // 避免馬上被 document.click 關掉
      if (lens.style.display === "block") {
        disableMagnifier();
      } else {
        // 若另一個 block 正在放大，先關掉它
        if (activeBlock && activeBlock !== block) {
          const otherBtn = activeBlock.querySelector(".magnifier-btn");
          otherBtn && otherBtn.click();
        }
        enableMagnifier();
      }
    }

    function onMove(ev) {
      const blockRect = block.getBoundingClientRect();
      const x = ev.clientX - blockRect.left;
      const y = ev.clientY - blockRect.top;
      placeLens(x, y);
    }

    function onLeave() {
      // 離開主圖區塊後不自動關閉，維持當前位置
      // 可依需求改成 disableMagnifier();
    }

    // 綁定事件
    btn.addEventListener("click", toggleMagnifier);

    // 點擊頁面任何地方（但不是按鈕）時關閉放大鏡
    document.addEventListener("click", (ev) => {
      if (!block.contains(ev.target)) {
        disableMagnifier();
      }
    });

    // ESC 也可關閉
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") disableMagnifier();
    });

    // 視窗尺寸改變時，調整鏡片大小並重新對位
    window.addEventListener("resize", () => {
      if (lens.style.display === "block") {
        fitLensSize();
        const rect = block.getBoundingClientRect();
        placeLens(rect.width / 2, rect.height / 2);
      }
    });
  });

  // 初始、resize 時維持左上錨點 + 調整 sub 群組
  function initOrResize() {
    window.scrollTo(0, 0);
    adjustSubBlocks();
  }

  requestAnimationFrame(() => {
    adjustSubBlocks();
  });

  window.addEventListener('resize', initOrResize);
});
