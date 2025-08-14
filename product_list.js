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

/** 將 right-col 的內容依變體更新（價格、詳情、庫存、狀態、圖片區按鈕顯示） */
function applyVariantToUI(productRoot, variant, state) {
  // 右欄內容
  productRoot.querySelector('.product-name').textContent = variant['商品名稱'] || '';
  productRoot.querySelector('.product-price').textContent = `\$ ${variant['價格'] || ''}`;
  productRoot.querySelector('.product-detail').textContent = variant['詳細資訊'] || '';
  productRoot.querySelector('.stock-text').textContent = `還剩 ${variant['庫存'] || 0} 件`;
  productRoot.querySelector('.quantity-input').max = variant['庫存'] || 0;
  // 左欄狀態
  const statusEl = productRoot.querySelector('.sale-status-block');
  statusEl.textContent = `狀態: ${variant['販售狀態'] || ''}`;

  // 圖片
  const imgList = buildImageList(variant);
  state.imgList = imgList;
  state.imgIndex = 0;

  const imgEl = productRoot.querySelector('.product-image-block img');
  imgEl.src = imgList[0] || '';

  // 箭頭顯示
  const leftArrow = productRoot.querySelector('.arrow-left');
  const rightArrow = productRoot.querySelector('.arrow-right');
  const showArrows = imgList.length > 1;
  leftArrow.style.display = showArrows ? '' : 'none';
  rightArrow.style.display = showArrows ? '' : 'none';

  // 放大鏡的 lens 也要更新底圖大小（在滑動時會設定）
}

/** 生成選項群組（每個 選項-xxx 一行） */
function renderOptionGroups(optionWrap, optionKeys, optionValues, initialSelection) {
  optionWrap.innerHTML = '';
  optionKeys.forEach(k => {
    const group = document.createElement('div');
    group.className = 'option-group';

    const title = document.createElement('div');
    title.className = 'option-title';
    title.textContent = k.replace('選項-', '');
    group.appendChild(title);

    const buttons = document.createElement('div');
    buttons.className = 'option-buttons';

    (optionValues[k] || []).forEach((val, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.type = 'button';
      btn.dataset.optionKey = k;
      btn.dataset.optionValue = val;
      btn.textContent = val;
      if (!initialSelection[k] && idx === 0) {
        // 若未指定，預設選第一個
        initialSelection[k] = val;
      }
      if (initialSelection[k] === val) {
        btn.classList.add('selected');
      }
      buttons.appendChild(btn);
    });

    group.appendChild(buttons);
    optionWrap.appendChild(group);
  });
}

async function loadProducts() {
  const category = getQueryParam('main');
  const subcategory = getQueryParam('sub');
  document.getElementById('subcategory-title').textContent = subcategory || '商品列表';

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

  // 只取該子分類
  const filtered = allSheetsData[category].filter(
    row => (row['商品系列'] || '').toString().trim() === (subcategory || '').toString().trim()
  );
  const container = document.getElementById('product-list');
  container.innerHTML = '';
  if (!filtered.length) {
    container.innerHTML = '<p>目前沒有這個分類的商品</p>';
    return;
  }
  
  // **請把這段加在這裡**
  const groupedProducts = {};
  filtered.forEach(p => {
    if (!groupedProducts[p['商品名稱']]) groupedProducts[p['商品名稱']] = [];
    groupedProducts[p['商品名稱']].push(p);
  });

  const productOptionMeta = {};
  Object.keys(groupedProducts).forEach(name => {
    const variants = groupedProducts[name];
    const optionKeys = Object.keys(variants[0]).filter(k => k.startsWith('選項-'));
    const validOptions = optionKeys.filter(key => {
      const values = [...new Set(variants.map(v => v[key]).filter(v => v))];
      return values.length > 1; // 只保留有多個值的選項
    });
    productOptionMeta[name] = { variants, validOptions };
  });
  // **新增段落結束**

  // 依商品名稱分組
  const grouped = groupByProductName(filtered);

  // 逐商品名稱渲染一個 product-item
  for (const [productName, variants] of grouped.entries()) {
    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';

    // 找出選項欄位與值
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

    // HTML 結構（含左右箭頭 + 放大鏡）
    productDiv.innerHTML = `
      <div class="left-col">
        <div class="product-image-block">
          <div class="arrow-block arrow-left" style="${imgListInit.length > 1 ? '' : 'display:none'}">
            <svg viewBox="0 0 24 24"><path d="M15 6 L9 12 L15 18"/></svg>
          </div>
          <img src="${imgListInit[0] || ''}" alt="${productName}">
          <div class="arrow-block arrow-right" style="${imgListInit.length > 1 ? '' : 'display:none'}">
            <svg viewBox="0 0 24 24"><path d="M9 6 L15 12 L9 18"/></svg>
          </div>
          <div class="magnifier-btn">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="16" y1="16" x2="22" y2="22"></line>
            </svg>
          </div>
        </div>
        <div class="sale-status-block">狀態: ${initialVariant['販售狀態'] || ''}</div>
      </div>

      <div class="right-col">
        <div class="product-name">${productName}</div>
        <div class="product-price">$ ${initialVariant['價格'] || ''}</div>
        <div class="product-detail">${initialVariant['詳細資訊'] || ''}</div>
        <div class="product-option"></div>
        <div class="product-quantity">
          <div class="quantity-block">
            <span>數量</span>
            <button class="qty-btn" data-type="minus" type="button">−</button>
            <input class="quantity-input" type="number" value="1" min="1" max="${initialVariant['庫存'] || 0}" readonly>
            <button class="qty-btn" data-type="plus" type="button">＋</button>
            <span class="stock-text">還剩 ${initialVariant['庫存'] || 0} 件</span>
          </div>
        </div>
        <div class="product-cart">
          <button class="cart-btn" type="button">加入購物車</button>
        </div>
      </div>
    `;

    // 狀態管理（此商品用）
    const state = {
      variants,
      optionKeys,
      selection,
      imgList: imgListInit,
      imgIndex: 0
    };

    // 渲染選項群組
    const optionWrap = productDiv.querySelector('.product-option');
    renderOptionGroups(optionWrap, optionKeys, optionValues, state.selection);

    // 左右箭頭事件
    const imgEl = productDiv.querySelector('.product-image-block img');
    const leftBtn = productDiv.querySelector('.arrow-left');
    const rightBtn = productDiv.querySelector('.arrow-right');

    leftBtn?.addEventListener('click', () => {
      if (!state.imgList.length) return;
      state.imgIndex = (state.imgIndex - 1 + state.imgList.length) % state.imgList.length;
      imgEl.src = state.imgList[state.imgIndex];
    });
    rightBtn?.addEventListener('click', () => {
      if (!state.imgList.length) return;
      state.imgIndex = (state.imgIndex + 1) % state.imgList.length;
      imgEl.src = state.imgList[state.imgIndex];
    });

    // 放大鏡初始化
    const imgBlock = productDiv.querySelector('.product-image-block');
    const magnifierBtn = productDiv.querySelector('.magnifier-btn');
    const lens = document.createElement('div');
    lens.className = 'magnifier-lens';
    const lensImg = imgEl.cloneNode(true);
    lens.appendChild(lensImg);
    imgBlock.appendChild(lens);

    let zoomActive = false;
    const ZOOM = 2;

    magnifierBtn.addEventListener('click', () => {
      zoomActive = !zoomActive;
      lens.style.display = zoomActive ? 'block' : 'none';
      if (zoomActive) {
        // 初次打開時把鏡片放在正中央
        const rect = imgEl.getBoundingClientRect();
        const lensW = lens.offsetWidth, lensH = lens.offsetHeight;
        lens.style.left = (rect.width - lensW) / 2 + 'px';
        lens.style.top  = (rect.height - lensH) / 2 + 'px';
        // 設定鏡片中的圖
        lensImg.src = state.imgList[state.imgIndex] || '';
        lensImg.style.width  = rect.width * ZOOM + 'px';
        lensImg.style.height = rect.height * ZOOM + 'px';
        lensImg.style.left   = -(rect.width/2 - lensW/2) * ZOOM + 'px';
        lensImg.style.top    = -(rect.height/2 - lensH/2) * ZOOM + 'px';
      }
    });

    imgBlock.addEventListener('mousemove', (e) => {
      if (!zoomActive) return;
      const rect = imgEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const lensW = lens.offsetWidth, lensH = lens.offsetHeight;

      let lensX = x - lensW / 2;
      let lensY = y - lensH / 2;
      lensX = Math.max(0, Math.min(rect.width  - lensW, lensX));
      lensY = Math.max(0, Math.min(rect.height - lensH, lensY));

      lens.style.left = lensX + 'px';
      lens.style.top  = lensY + 'px';

      lensImg.src = state.imgList[state.imgIndex] || '';
      lensImg.style.width  = rect.width * ZOOM + 'px';
      lensImg.style.height = rect.height * ZOOM + 'px';
      lensImg.style.left   = -lensX * ZOOM + 'px';
      lensImg.style.top    = -lensY * ZOOM + 'px';
    });

    imgBlock.addEventListener('mouseleave', () => {
      if (zoomActive) lens.style.display = 'none';
    });
    imgBlock.addEventListener('mouseenter', () => {
      if (zoomActive) lens.style.display = 'block';
    });

    // 右欄互動（事件委派）
    productDiv.addEventListener('click', (e) => {
      const target = e.target;

      // 選項切換
      if (target.classList.contains('option-btn')) {
        const optKey = target.dataset.optionKey;
        const optVal = target.dataset.optionValue;

        // 同一行互斥
        const group = target.closest('.option-buttons');
        group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        target.classList.add('selected');

        // 更新選擇
        state.selection[optKey] = optVal;

        // 找到對應變體
        const variant = findVariantBySelection(state.variants, state.selection);
        if (variant) {
          applyVariantToUI(productDiv, variant, state);

          // 若目前數量 > 新庫存，調整數量
          const input = productDiv.querySelector('.quantity-input');
          const max = parseInt(input.max || '0', 10);
          let val = parseInt(input.value || '1', 10);
          if (max > 0 && val > max) input.value = Math.max(1, max);

          // 變體切換後，鏡片底圖需同步
          const rect = imgEl.getBoundingClientRect();
          lensImg.src = state.imgList[state.imgIndex] || '';
          lensImg.style.width  = rect.width * ZOOM + 'px';
          lensImg.style.height = rect.height * ZOOM + 'px';
        } else {
          // 沒有符合的組合（少見情況）：提示並還原按鈕狀態
          target.classList.remove('selected');
        }
        return;
      }

      // 數量 +/- 按鈕
      if (target.classList.contains('qty-btn')) {
        const block = target.closest('.quantity-block');
        const input = block.querySelector('.quantity-input');
        const max = parseInt(input.max || '0', 10);
        let val = parseInt(input.value || '1', 10);

        if (target.dataset.type === 'plus') {
          if (max > 0) val = Math.min(max, val + 1);
          else val = val + 1;
        } else if (target.dataset.type === 'minus') {
          val = Math.max(1, val - 1);
        }
        input.value = val;
        return;
      }

      // 加入購物車
      if (target.classList.contains('cart-btn')) {
        target.classList.toggle('active');
        target.textContent = target.classList.contains('active') ? '已加入' : '加入購物車';
        return;
      }
    });

    container.appendChild(productDiv);
  }
}

loadProducts();

// 加在任意位置（建議 loadProducts 外面）
function generateOptionsUI(container, optionKeys, variants) {
  container.innerHTML = '';

  const MAX_HEIGHT = 200; // 假設 product-option 高度限制
  const lineHeight = 40;
  const needTwoCol = (optionKeys.length * lineHeight) > MAX_HEIGHT;

  let arrangedOptions = [...optionKeys];
  if (needTwoCol && optionKeys.length >= 2) {
    arrangedOptions.sort((a, b) => {
      const lenA = getOptionLength(a, variants);
      const lenB = getOptionLength(b, variants);
      return lenA - lenB;
    });
  }

  for (let i = 0; i < arrangedOptions.length; i++) {
    const key = arrangedOptions[i];
    const values = [...new Set(variants.map(v => v[key]).filter(v => v))];

    if (needTwoCol && i === 0 && arrangedOptions.length >= 2) {
      const nextKey = arrangedOptions[1];
      const nextValues = [...new Set(variants.map(v => v[nextKey]).filter(v => v))];
      const row = document.createElement('div');
      row.className = 'option-row two-col';
      row.innerHTML = `
        <div class="option-group"><span>${key.replace('選項-', '')}</span> ${values.map(v => `<button>${v}</button>`).join('')}</div>
        <div class="option-group"><span>${nextKey.replace('選項-', '')}</span> ${nextValues.map(v => `<button>${v}</button>`).join('')}</div>
      `;
      container.appendChild(row);
      i++;
    } else {
      const row = document.createElement('div');
      row.className = 'option-row';
      row.innerHTML = `<span>${key.replace('選項-', '')}</span> ${values.map(v => `<button>${v}</button>`).join('')}`;
      container.appendChild(row);
    }
  }
}

function getOptionLength(key, variants) {
  const values = [...new Set(variants.map(v => v[key]).filter(v => v))];
  return key.length + values.join('').length;
}
