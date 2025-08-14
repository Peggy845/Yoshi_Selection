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
  initMagnifier(productDiv, state);
  initOptionSelection(productDiv, state);
  initQuantityAndCart(productDiv, state);

  return productDiv;
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
        <div class="magnifier-btn">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="16" y1="16" x2="22" y2="22"></line>
          </svg>
        </div>
      </div>
      <div class="sale-status-block">狀態: ${variant['販售狀態'] || ''}</div>
    </div>

    <div class="right-col">
      <div class="product-name">${productName}</div>
      <div class="product-price">$ ${variant['價格'] || ''}</div>
      <div class="product-detail">${variant['詳細資訊'] || ''}</div>
      <div class="product-option"></div>
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

function getOptionTotalLength(key, variants) {
  const values = collectOptionValues(variants, [key])[key] || [];
  const totalLength = key.length + values.reduce((sum, v) => sum + v.length, 0);
  return totalLength;
}

function mergeTwoOptions(keys, shortestKey) {
  const idx = keys.indexOf(shortestKey);
  if (idx < keys.length - 1) {
    // 跟下一個併排
    const combined = [shortestKey, keys[idx + 1]];
    return [...keys.slice(0, idx), combined, ...keys.slice(idx + 2)];
  } else {
    // 如果是最後一個，就跟前一個併排
    const combined = [keys[idx - 1], shortestKey];
    return [...keys.slice(0, idx - 1), combined];
  }
}

function renderOptionGroupHTML(labelName, key, values, state) {
  const group = document.createElement('div');
  group.className = 'option-group';

  const label = document.createElement('span');
  label.className = 'option-label';
  label.textContent = labelName;
  group.appendChild(label);

  values.forEach(value => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = value;
    btn.className = 'option-btn';
    if (state.selection[key] === value) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;

      // 單選切換
      const siblings = group.querySelectorAll('.option-btn');
      siblings.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 更新狀態
      state.selection[key] = value;

      // 聯動更新
      updateOptionAvailability(state, group.parentElement.parentElement);
    });
    group.appendChild(btn);
  });

  return group;
}

function updateOptionAvailability(state, container) {
  const currentSelection = { ...state.selection };

  container.querySelectorAll('.option-group').forEach(group => {
    const keyLabel = group.querySelector('.option-label').textContent;
    const fullKey = state.optionKeys.find(k => k.replace(/^選項-/, '') === keyLabel);
    const btns = group.querySelectorAll('.option-btn');

    btns.forEach(btn => {
      const testSelection = { ...currentSelection, [fullKey]: btn.textContent };
      const isValid = state.variants.some(v => {
        return Object.keys(testSelection).every(k => {
          return !testSelection[k] || v[k] === testSelection[k];
        });
      });
      btn.classList.toggle('disabled', !isValid);
    });
  });
}

function initOptionSelection(productDiv, state) {
  const optionWrap = productDiv.querySelector('.product-option');

  // 1. 過濾掉只有一種值的選項，並去掉 "選項-" 前綴
  const filteredKeys = state.optionKeys.filter(key => {
    const values = collectOptionValues(state.variants, [key])[key] || [];
    return values.length > 1;
  });

  if (filteredKeys.length === 0) {
    optionWrap.innerHTML = '';
    return;
  }

  // 2. 測試高度（先渲染一次）
  optionWrap.innerHTML = '';
  filteredKeys.forEach(key => {
    const cleanName = key.replace(/^選項-/, '');
    const values = collectOptionValues(state.variants, [key])[key] || [];
    if (!state.selection[key]) state.selection[key] = values[0]; // 預設選第一個
    const group = renderOptionGroupHTML(cleanName, key, values, state);
    optionWrap.appendChild(group);
  });

  const maxHeight = optionWrap.clientHeight;
  const allowedHeight = 120;

  if (maxHeight > allowedHeight && filteredKeys.length > 1) {
    // 找最短的選項
    let shortestKey = filteredKeys[0];
    let shortestLen = getOptionTotalLength(shortestKey, state.variants);

    filteredKeys.forEach(key => {
      const len = getOptionTotalLength(key, state.variants);
      if (len < shortestLen) {
        shortestKey = key;
        shortestLen = len;
      }
    });

    // 重新排版，把最短Key和下一個Key合併顯示
    const reordered = mergeTwoOptions(filteredKeys, shortestKey);
    optionWrap.innerHTML = '';
    reordered.forEach(entry => {
      if (Array.isArray(entry)) {
        const combinedRow = document.createElement('div');
        combinedRow.className = 'option-row-combined';
        entry.forEach(k => {
          const cleanName = k.replace(/^選項-/, '');
          const values = collectOptionValues(state.variants, [k])[k] || [];
          if (!state.selection[k]) state.selection[k] = values[0];
          const group = renderOptionGroupHTML(cleanName, k, values, state);
          combinedRow.appendChild(group);
        });
        optionWrap.appendChild(combinedRow);
      } else {
        const cleanName = entry.replace(/^選項-/, '');
        const values = collectOptionValues(state.variants, [entry])[entry] || [];
        if (!state.selection[entry]) state.selection[entry] = values[0];
        optionWrap.appendChild(renderOptionGroupHTML(cleanName, entry, values, state));
      }
    });
  }

  // 3. 初始化禁用狀態
  updateOptionAvailability(state, optionWrap);
}


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
