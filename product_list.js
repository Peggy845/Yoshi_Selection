// ====== 注意：把下面這個 URL 換成你自己部署的 Apps Script exec URL ======
const API_URL = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';
// ========================================================================

/**
 * 取得 URL query 參數
 */
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * 取得商品資料（從指定分頁取整張分頁資料）
 * 透過 Apps Script API: ?type=product&sheet=分頁名稱
 * 回傳格式預期為 { products: [...] }
 */
async function fetchProductsFromSheet(sheetName) {
  if (!sheetName) return { error: 'missing sheet' };
  const url = `${API_URL}?type=product&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const data = await res.json();
  return data;
}

/**
 * 將 Excel row object 轉為可用的欄位（安全取值）
 */
function getField(row, key) {
  return (row && row[key] !== undefined && row[key] !== null) ? String(row[key]) : '';
}

/**
 * 建立單一商品卡 DOM（依你提供的版面規格）
 */
function renderProductCard(product) {
  // 重要欄位（名稱必須與試算表標題一致）
  const name = getField(product, '商品名稱');
  const price = getField(product, '價格');
  const detail = getField(product, '詳細資訊');
  const statusText = getField(product, '販售狀態');
  const stockNum = Number(getField(product, '庫存')) || 0;
  const mainImage = getField(product, '商品圖片');
  const extraImages = getField(product, '額外圖片們'); // 用頓號「、」分隔

  // 圖片陣列
  const imgs = [];
  if (mainImage) imgs.push(mainImage.trim());
  if (extraImages) {
    extraImages.split('、').map(s => s.trim()).filter(Boolean).forEach(i => imgs.push(i));
  }
  // 若沒有圖片，放一個預設
  if (imgs.length === 0) imgs.push('placeholder.jpg');

  // Card 結構
  const card = document.createElement('article');
  card.className = 'product-card';

  // left column: image + status
  const left = document.createElement('div');
  left.className = 'left-col';
  const imageBox = document.createElement('div');
  imageBox.className = 'image-box';

  const imgEl = document.createElement('img');
  imgEl.src = getGitImageUrl(imgs[0]);
  imageBox.appendChild(imgEl);

  // arrows if multiple images
  if (imgs.length > 1) {
    const leftArrow = document.createElement('div');
    leftArrow.className = 'image-arrow left';
    leftArrow.textContent = '‹';
    const rightArrow = document.createElement('div');
    rightArrow.className = 'image-arrow right';
    rightArrow.textContent = '›';
    let idx = 0;
    leftArrow.addEventListener('click', () => {
      idx = (idx - 1 + imgs.length) % imgs.length;
      imgEl.src = getGitImageUrl(imgs[idx]);
    });
    rightArrow.addEventListener('click', () => {
      idx = (idx + 1) % imgs.length;
      imgEl.src = getGitImageUrl(imgs[idx]);
    });
    imageBox.appendChild(leftArrow);
    imageBox.appendChild(rightArrow);
  }

  left.appendChild(imageBox);
  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = `狀態: ${statusText || '未知'}`;
  left.appendChild(status);

  // right column: info
  const right = document.createElement('div');
  right.className = 'right-col';

  const titleEl = document.createElement('div');
  titleEl.className = 'product-name';
  titleEl.textContent = name;
  right.appendChild(titleEl);

  const priceEl = document.createElement('div');
  priceEl.className = 'product-price';
  priceEl.textContent = `$ ${price || '0'}`;
  right.appendChild(priceEl);

  const detailEl = document.createElement('div');
  detailEl.className = 'product-detail';
  detailEl.textContent = detail || '';
  right.appendChild(detailEl);

  // options: 將所有 key 開頭為 "選項-" 的群組化
  const optionKeys = Object.keys(product).filter(k => k.startsWith('選項-'));
  if (optionKeys.length > 0) {
    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'options';

    optionKeys.forEach(key => {
      const groupTitle = key.replace(/^選項-/, '');
      const group = document.createElement('div');

      const gTitle = document.createElement('div');
      gTitle.className = 'option-group-title';
      gTitle.textContent = groupTitle;
      group.appendChild(gTitle);

      const values = (getField(product, key) || '').split('、').map(s => s.trim()).filter(Boolean);
      const btnWrap = document.createElement('div');
      btnWrap.className = 'option-buttons';

      values.forEach(val => {
        const b = document.createElement('button');
        b.className = 'option-button';
        b.textContent = val;
        b.addEventListener('click', () => {
          // 單選（在同組內）
          btnWrap.querySelectorAll('.option-button').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
        });
        btnWrap.appendChild(b);
      });

      group.appendChild(btnWrap);
      optionsWrap.appendChild(group);
    });

    right.appendChild(optionsWrap);
  }

  // bottom: quantity + stock + cart button
  const bottom = document.createElement('div');
  bottom.className = 'bottom-row';

  const qty = document.createElement('div');
  qty.className = 'quantity';
  qty.innerHTML = '數量 ';

  const minus = document.createElement('button');
  minus.className = 'qty-btn';
  minus.textContent = '-';
  const input = document.createElement('input');
  input.className = 'qty-input';
  input.type = 'number';
  input.value = 1;
  input.min = 1;
  input.max = Math.max(0, stockNum);
  const plus = document.createElement('button');
  plus.className = 'qty-btn';
  plus.textContent = '+';

  minus.addEventListener('click', () => {
    let v = Number(input.value) || 1;
    if (v > 1) input.value = v - 1;
  });
  plus.addEventListener('click', () => {
    let v = Number(input.value) || 1;
    if (v < input.max) input.value = v + 1;
  });

  const stockText = document.createElement('span');
  stockText.className = 'stock-text';
  stockText.textContent = ` 還剩${stockNum}件`;

  qty.appendChild(minus);
  qty.appendChild(input);
  qty.appendChild(plus);
  qty.appendChild(stockText);

  const cartWrap = document.createElement('div');
  cartWrap.className = 'cart-wrap';
  const cartBtn = document.createElement('button');
  cartBtn.className = 'cart-btn';
  cartBtn.textContent = '加入購物車';
  cartBtn.addEventListener('click', () => {
    // 收集已選的選項（所有 option-buttons active）
    const chosen = {};
    const groups = right.querySelectorAll('.options > div');
    groups.forEach(g => {
      const title = (g.querySelector('.option-group-title') || {textContent:''}).textContent;
      const act = g.querySelector('.option-button.active');
      if (act) chosen[title] = act.textContent;
    });
    const qtyVal = Math.max(1, Math.min(Number(input.value) || 1, input.max || 9999));
    if (qtyVal > stockNum) {
      alert('數量超過庫存');
      return;
    }

    // 生成 cart item
    const cartItem = {
      name: name,
      price: price,
      qty: qtyVal,
      options: chosen,
      productRow: product // 儲存整列以便未來檢視
    };

    pushToCart(cartItem);
    alert(`已加入購物車：${name} x${qtyVal}`);
  });

  cartWrap.appendChild(cartBtn);

  bottom.appendChild(qty);
  bottom.appendChild(cartWrap);
  right.appendChild(bottom);

  // 組合左右
  card.appendChild(left);
  card.appendChild(right);
  return card;
}

/* helper: 如果圖片放在 GitHub repo 的 images 資料夾，組出 raw URL (注意 CORS/權限) */
/* 這裡採用 GitHub raw 的形式：根據你的 repo 路徑調整 */
function getGitImageUrl(filename) {
  // 你的 images 放在 https://github.com/Peggy845/Yoshi_Selection/blob/main/images/xxx
  // raw URL 範例： https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/xxx
  if (!filename) return '';
  return `https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/${encodeURIComponent(filename)}`;
}

/* localStorage 簡單購物車，key 可自訂 */
const CART_KEY = 'yoshi_cart_v1';
function pushToCart(item) {
  const raw = localStorage.getItem(CART_KEY);
  const arr = raw ? JSON.parse(raw) : [];
  arr.push(item);
  localStorage.setItem(CART_KEY, JSON.stringify(arr));
}

/* 主流程：載入資料並渲染 */
(async function main() {
  // 取得傳入參數（index.html 會傳 main=分頁名 & sub=子分類名稱）
  const sheetParam = qs('sheet'); // 若有人直接用 ?sheet=xxx
  const mainParam = qs('main');   // index.html 傳的分頁名
  const subParam = qs('sub') || '全部'; // 要顯示的商品系列

  // 決定要讀哪一個 sheet（優先 sheet=，否則 main=）
  const sheetName = sheetParam || mainParam;
  const titleEl = document.getElementById('sub-category-title');

  if (!sheetName) {
    titleEl.textContent = '參數錯誤：找不到分頁名稱';
    console.error('product_list 需要 ?sheet=或?main= 參數');
    return;
  }
  // 顯示標題（子分類）
  titleEl.textContent = decodeURIComponent(subParam);

  // 取得該分頁的所有商品
  const data = await fetchProductsFromSheet(sheetName);
  if (!data || data.error) {
    titleEl.textContent = `讀取失敗：${data && data.error ? data.error : 'API 無回應'}`;
    console.error('API 回傳：', data);
    return;
  }

  // data.products 預期為陣列；有些版本可能直接回傳陣列，做容錯
  let rows = [];
  if (Array.isArray(data.products)) rows = data.products;
  else if (Array.isArray(data)) rows = data; // 若 API 直接回傳陣列
  else if (Array.isArray(data.data)) rows = data.data;
  else {
    console.error('無法辨識 API 回傳結構', data);
    titleEl.textContent = '讀取格式錯誤';
    return;
  }

  // 過濾：根據「商品系列」欄位與 subParam（若 subParam==='全部' 代表不過濾）
  const filtered = rows.filter(r => {
    const series = getField(r, '商品系列') || '';
    if (subParam === '全部') return true;
    return series === decodeURIComponent(subParam);
  });

  // 若無符合項目顯示提示
  const list = document.getElementById('product-list');
  list.innerHTML = '';
  if (filtered.length === 0) {
    const none = document.createElement('div');
    none.textContent = '找不到符合的商品';
    none.style.padding = '18px';
    list.appendChild(none);
    return;
  }

  // 逐筆渲染（每筆為 product-card）
  filtered.forEach(p => {
    const card = renderProductCard(p);
    list.appendChild(card);
  });
})();
