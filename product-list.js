(() => {
  'use strict';

  /** ===== 基本設定 ===== */
  const SHEET_ID = '1KXmggPfKqpg5gZCsUujlpdTcKSFdGJHv4bOux3nc2xo';
  const IMAGE_BASE = 'https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/';

  /** ===== 工具 ===== */
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function norm(v) { return (v ?? '').toString().trim(); }

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
        const cols = json.table.cols.map(col => (col.label || '').trim());
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
    return map;
  }

  /** 取得所有選項欄位（至少某列不為空） */
  function extractOptionKeys(variants) {
    const keys = new Set();
    variants.forEach(v => {
      Object.keys(v).forEach(k => {
        if (k.startsWith('選項-') && norm(v[k]) !== '') keys.add(k);
      });
    });
    return Array.from(keys);
  }

  /** 收集每個選項欄位的所有值（依出現順序去重） */
  function collectOptionValues(variants, optionKeys) {
    const values = {};
    optionKeys.forEach(k => {
      const seen = new Set();
      values[k] = [];
      variants.forEach(v => {
        const val = norm(v[k]);
        if (val && !seen.has(val)) {
          seen.add(val);
          values[k].push(val);
        }
      });
    });
    return values;
  }

  /** 找到完全吻合 selection 的變體；找不到回傳 null */
  function findVariantBySelection(variants, selection) {
    return variants.find(v =>
      Object.keys(selection).every(k => norm(v[k]) === selection[k])
    ) || null;
  }

  /** 計算在特定 selection（排除 targetKey）下，targetKey 可用值集合 */
  function calcValidValues(variants, selection, targetKey) {
    const set = new Set();
    variants.forEach(v => {
      const ok = Object.keys(selection).every(k => {
        if (k === targetKey) return true;
        return selection[k] ? norm(v[k]) === selection[k] : true;
      });
      if (ok) {
        const val = norm(v[targetKey]);
        if (val) set.add(val);
      }
    });
    return set;
  }

  /** 建立圖片陣列：商品圖片 + 額外圖片(頓號分隔) */
  function buildImageArray(variant) {
    const mainImg = norm(variant['商品圖片']);
    const extraRaw = norm(variant['額外圖片']);
    const extras = (extraRaw && extraRaw !== '無')
      ? extraRaw.split('、').map(s => norm(s)).filter(Boolean)
      : [];
    const list = [];
    if (mainImg) list.push(IMAGE_BASE + mainImg);
    extras.forEach(x => list.push(IMAGE_BASE + x));
    // 去重（避免主圖也被寫進額外圖片）
    const seen = new Set();
    const dedup = [];
    list.forEach(src => { if (!seen.has(src)) { seen.add(src); dedup.push(src); } });
    return dedup;
  }

  /** 將價格/庫存/狀態/詳情更新到 UI（不處理圖片） */
  function applyVariantFields(productRoot, variant) {
    productRoot.querySelector('.product-name').textContent = norm(variant['商品名稱']) || '';
    productRoot.querySelector('.product-price').textContent = `\$ ${norm(variant['價格']) || ''}`;
    productRoot.querySelector('.product-detail').textContent = norm(variant['詳細資訊']) || '';
    const stock = Number(norm(variant['庫存']) || '0');
    productRoot.querySelector('.stock-text').textContent = `還剩 ${stock} 件`;
    productRoot.querySelector('.quantity-input').max = String(stock);
    productRoot.querySelector('.sale-status-block').textContent = `狀態: ${norm(variant['販售狀態']) || ''}`;
  }

  /** 產生商品卡片 HTML（保留你的結構，內部我加了 sub-arrow-left/right） */
  function generateProductHTML(productName, variant, imgList) {
    const showMainArrows = imgList.length > 1;
    return `
      <div class="left-col">
        <div class="product-image-block">
          <button class="arrow-block arrow-left" type="button" style="${showMainArrows ? '' : 'display:none'}" aria-label="上一張">
            <svg viewBox="0 0 24 24"><path d="M15 6 L9 12 L15 18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"/></svg>
          </button>

          <img src="${imgList[0] || ''}" class="main-image" alt="${productName}">

          <button class="arrow-block arrow-right" type="button" style="${showMainArrows ? '' : 'display:none'}" aria-label="下一張">
            <svg viewBox="0 0 24 24"><path d="M9 6 L15 12 L9 18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"/></svg>
          </button>

          <!-- 放大鏡按鈕（保留） -->
          <button class="magnifier-btn" type="button" aria-label="啟用放大鏡" title="放大鏡">
            <svg viewBox="0 0 24 24" class="magnifier-icon" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
              <line x1="16.5" y1="16.5" x2="22" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>

          <div class="magnifier-lens" aria-hidden="true"></div>
        </div>

        <div class="sub-image-block">
          <div class="sub-group">
            <div class="sub-arrow sub-arrow-left">←</div>
            <!-- 這裡縮圖我會用 JS 動態產生 1~3 張 -->
            <div class="thumbs"></div>
            <div class="sub-arrow sub-arrow-right">→</div>
          </div>
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

    // 僅顯示 values > 1 的選項
    const optionValues = collectOptionValues(state.variants, state.optionKeys);
    const effectiveKeys = state.optionKeys.filter(k => (optionValues[k] || []).length > 1);

    // 沒有可選的就清空
    if (!effectiveKeys.length) {
      wrap.innerHTML = '';
      return;
    }

    // 渲染
    wrap.innerHTML = '';
    effectiveKeys.forEach(k => {
      const group = document.createElement('div');
      group.className = 'option-group';

      const title = document.createElement('div');
      title.className = 'option-title';
      title.textContent = k.replace('選項-', '');
      group.appendChild(title);

      const btnBox = document.createElement('div');
      btnBox.className = 'option-buttons';

      (optionValues[k] || []).forEach((val, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.type = 'button';
        btn.dataset.optionKey = k;
        btn.dataset.optionValue = val;
        btn.textContent = val;

        // 預設選第一個
        if (!state.selection[k] && idx === 0) state.selection[k] = val;
        if (state.selection[k] === val) btn.classList.add('selected');

        btnBox.appendChild(btn);
      });

      group.appendChild(btnBox);
      wrap.appendChild(group);
    });

    // 初次禁用不可能組合
    updateOptionDisabling(productDiv, state);

    // 綁事件（互斥、更新 UI）
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.option-btn');
      if (!btn) return;
      if (btn.classList.contains('disabled')) return;

      const key = btn.dataset.optionKey;
      const val = btn.dataset.optionValue;

      // 同群互斥
      const group = btn.closest('.option-buttons');
      group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selection[key] = val;

      // 重新評估禁用狀態，並自動修正不再有效的選取
      autoFixInvalidSelections(productDiv, state);
      updateOptionDisabling(productDiv, state);

      // 切換變體、更新右側欄位與圖片
      const newVariant = findVariantBySelection(state.variants, state.selection);
      if (newVariant) {
        state.currentVariant = newVariant;
        applyVariantFields(productDiv, newVariant);
        rebuildGallery(productDiv, state); // 圖片改為該變體
      }
    });
  }

  /** 灰掉不可能的按鈕 */
  function updateOptionDisabling(productDiv, state) {
    const wrap = productDiv.querySelector('.product-option');
    const groups = wrap.querySelectorAll('.option-group');

    groups.forEach(g => {
      const key = g.querySelector('.option-buttons .option-btn')?.dataset.optionKey;
      if (!key) return;
      const valid = calcValidValues(state.variants, state.selection, key);

      g.querySelectorAll('.option-btn').forEach(btn => {
        const v = btn.dataset.optionValue;
        const ok = valid.has(v);
        btn.disabled = !ok;
        btn.classList.toggle('disabled', !ok);
      });
    });
  }

  /** 若某群目前選擇變無效，改成該群第一個可用值 */
  function autoFixInvalidSelections(productDiv, state) {
    const wrap = productDiv.querySelector('.product-option');
    const groups = wrap.querySelectorAll('.option-group');

    groups.forEach(g => {
      const btns = Array.from(g.querySelectorAll('.option-buttons .option-btn'));
      if (!btns.length) return;
      const key = btns[0].dataset.optionKey;
      const valid = calcValidValues(state.variants, state.selection, key);

      const currentVal = state.selection[key];
      if (currentVal && !valid.has(currentVal)) {
        // 換成第一個可用的
        const firstValidBtn = btns.find(b => valid.has(b.dataset.optionValue));
        if (firstValidBtn) {
          btns.forEach(b => b.classList.remove('selected'));
          firstValidBtn.classList.add('selected');
          state.selection[key] = firstValidBtn.dataset.optionValue;
        }
      }
    });
  }

  /** ========== 圖片畫廊（方案3：縮圖不與主圖交換） ========== */
  function fadeMainImage(imgEl, newSrc) {
    imgEl.classList.add('fade-out');
    setTimeout(() => {
      imgEl.src = newSrc || '';
      imgEl.classList.remove('fade-out');
      imgEl.classList.add('fade-in');
      setTimeout(() => imgEl.classList.remove('fade-in'), 250);
    }, 250);
  }

  function rebuildGallery(productDiv, state) {
    // 重建圖片陣列與 index
    state.images = buildImageArray(state.currentVariant);
    if (!state.images.length) state.images = ['']; // 保底
    // 若目前 index 超出，歸 0
    if (state.currentIndex >= state.images.length) state.currentIndex = 0;
    // 讓 sub 起點包含目前主圖
    state.subStart = Math.max(0, Math.min(state.currentIndex, Math.max(0, state.images.length - 3)));
    renderMainAndThumbs(productDiv, state, true);
  }

  function renderMainAndThumbs(productDiv, state, hardSet = false) {
    // 主圖
    const imgEl = productDiv.querySelector('.main-image');
    const leftBtn = productDiv.querySelector('.arrow-left');
    const rightBtn = productDiv.querySelector('.arrow-right');

    if (hardSet) {
      imgEl.src = state.images[state.currentIndex] || '';
    } else {
      fadeMainImage(imgEl, state.images[state.currentIndex] || '');
    }

    // 主圖箭頭顯示
    const showMainArrows = state.images.length > 1;
    if (leftBtn) leftBtn.style.display = showMainArrows ? '' : 'none';
    if (rightBtn) rightBtn.style.display = showMainArrows ? '' : 'none';

    // 縮圖（最多三張視窗）
    const thumbsWrap = productDiv.querySelector('.sub-group .thumbs');
    const subLeft = productDiv.querySelector('.sub-arrow-left');
    const subRight = productDiv.querySelector('.sub-arrow-right');
    thumbsWrap.innerHTML = '';

    const total = state.images.length;
    const visible = Math.min(3, total);
    const start = Math.max(0, Math.min(state.subStart, Math.max(0, total - visible)));
    state.subStart = start;

    for (let i = 0; i < visible; i++) {
      const idx = start + i;
      const src = state.images[idx];
      const thumb = document.createElement('img');
      thumb.className = 'sub-image';
      thumb.alt = '子圖';
      thumb.src = src || '';
      if (idx === state.currentIndex) thumb.classList.add('active-thumb');

      thumb.addEventListener('click', () => {
        state.currentIndex = idx;
        renderMainAndThumbs(productDiv, state); // 動畫切主圖
        // 讓目前主圖落在可視縮圖窗內
        if (state.currentIndex < state.subStart) {
          state.subStart = state.currentIndex;
          renderMainAndThumbs(productDiv, state, true);
        } else if (state.currentIndex >= state.subStart + visible) {
          state.subStart = state.currentIndex - visible + 1;
          renderMainAndThumbs(productDiv, state, true);
        }
      });

      thumbsWrap.appendChild(thumb);
    }

    // 縮圖箭頭顯示規則：總圖數 < 3 → 隱藏；>=3 → 顯示（邊界時半透明）
    const showSubArrows = total >= 3;
    const atLeftMost = state.subStart === 0;
    const atRightMost = state.subStart + visible >= total;

    if (subLeft) {
      subLeft.style.display = showSubArrows ? 'flex' : 'none';
      subLeft.style.opacity = atLeftMost ? '0.35' : '1';
      subLeft.style.pointerEvents = atLeftMost ? 'none' : 'auto';
    }
    if (subRight) {
      subRight.style.display = showSubArrows ? 'flex' : 'none';
      subRight.style.opacity = atRightMost ? '0.35' : '1';
      subRight.style.pointerEvents = atRightMost ? 'none' : 'auto';
    }
  }

  function initGallery(productDiv, state) {
    // 初始資料
    state.images = buildImageArray(state.currentVariant);
    state.currentIndex = 0;
    state.subStart = 0;
    renderMainAndThumbs(productDiv, state, true);

    // 綁主圖箭頭
    const leftBtn = productDiv.querySelector('.arrow-left');
    const rightBtn = productDiv.querySelector('.arrow-right');
    const imgEl = productDiv.querySelector('.main-image');

    if (leftBtn) {
      leftBtn.addEventListener('click', () => {
        const n = state.images.length;
        state.currentIndex = (state.currentIndex - 1 + n) % n;
        renderMainAndThumbs(productDiv, state);
      });
    }
    if (rightBtn) {
      rightBtn.addEventListener('click', () => {
        const n = state.images.length;
        state.currentIndex = (state.currentIndex + 1) % n;
        renderMainAndThumbs(productDiv, state);
      });
    }

    // 觸控滑動（主圖）
    let startX = 0;
    imgEl.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    imgEl.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      if (endX - startX > 50) {
        leftBtn?.click();
      } else if (startX - endX > 50) {
        rightBtn?.click();
      }
    }, { passive: true });

    // 綁縮圖箭頭
    const subLeft = productDiv.querySelector('.sub-arrow-left');
    const subRight = productDiv.querySelector('.sub-arrow-right');
    if (subLeft) {
      subLeft.addEventListener('click', () => {
        if (state.subStart > 0) {
          state.subStart -= 1;
          renderMainAndThumbs(productDiv, state, true);
        }
      });
    }
    if (subRight) {
      subRight.addEventListener('click', () => {
        const total = state.images.length;
        const visible = Math.min(3, total);
        const maxStart = Math.max(0, total - visible);
        if (state.subStart < maxStart) {
          state.subStart += 1;
          renderMainAndThumbs(productDiv, state, true);
        }
      });
    }
  }

	function initProductImageGallery(productEl, productData) {
	  const mainImgEl = productEl.querySelector('.main-image');
	  const subGroupEl = productEl.querySelector('.sub-group');
	  const leftArrow = productEl.querySelector('.sub-arrow.left');
	  const rightArrow = productEl.querySelector('.sub-arrow.right');

	  let images = []; // 全部圖片：A + 額外圖片
	  let extraImages = []; // 額外圖片 B、C、D
	  let currentMainIndex = 0;

	  // 初始化圖片
	  function initImages() {
		const main = productData['商品圖片'];
		extraImages = productData['額外圖片']
		  ? productData['額外圖片'].split('、').map(i => `images/${i}`)
		  : [];

		// A + B、C、D
		images = [main, ...extraImages];
		currentMainIndex = 0;

		mainImgEl.src = images[currentMainIndex];
		renderSubImages();
		updateArrowVisibility();
	  }

	  // 渲染 sub-images，只放 B、C、D
	  function renderSubImages() {
		subGroupEl.innerHTML = '';

		extraImages.forEach((img, idx) => {
		  const imgEl = document.createElement('img');
		  imgEl.src = img;
		  imgEl.classList.add('sub-image');
		  imgEl.addEventListener('click', () => {
			currentMainIndex = idx + 1; // 因為 images[0] 是 A
			mainImgEl.src = images[currentMainIndex];
		  });
		  subGroupEl.appendChild(imgEl);
		});
	  }

	  // 更新箭頭顯示
	  function updateArrowVisibility() {
		const arrows = productEl.querySelectorAll('.sub-arrow');
		arrows.forEach(arrow => {
		  arrow.style.display = extraImages.length > 3 ? 'flex' : 'none';
		});
	  }

	  // 綁定左右箭頭
	  function bindArrows() {
		leftArrow.addEventListener('click', () => {
		  currentMainIndex = (currentMainIndex - 1 + images.length) % images.length;
		  mainImgEl.src = images[currentMainIndex];
		});

		rightArrow.addEventListener('click', () => {
		  currentMainIndex = (currentMainIndex + 1) % images.length;
		  mainImgEl.src = images[currentMainIndex];
		});
	  }

	  // 當切換 option-group 時重設 main image
	  function resetForOptionChange(newProductData) {
		productData = newProductData;
		initImages();
	  }

	  // 初始化
	  initImages();
	  bindArrows();

	  // 對外暴露 API，給 option-group 使用
	  return { resetForOptionChange };
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
        input.value = String(val);
      }

      if (target.classList.contains('cart-btn')) {
        target.classList.toggle('active');
        target.textContent = target.classList.contains('active') ? '已加入' : '加入購物車';
      }
    });
  }

  /** 建立商品卡片 + 綁定全部功能 */
  function createProductCard(productName, variants) {
    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';

    const optionKeys = extractOptionKeys(variants);
    const optionValues = collectOptionValues(variants, optionKeys);

    // 初始選擇 = 第一列的選項值
    const initialVariant = variants[0];
    const selection = {};
    optionKeys.forEach(k => {
      const v = norm(initialVariant[k]);
      if (v) selection[k] = v;
    });

    // 初始圖片清單
    const imgList = buildImageArray(initialVariant);
    productDiv.innerHTML = generateProductHTML(productName, initialVariant, imgList);

    const state = {
      variants,
      optionKeys,
      optionValues,
      selection,
      currentVariant: initialVariant,
      images: imgList,
      currentIndex: 0,
      subStart: 0
    };

    // 套資料
    applyVariantFields(productDiv, initialVariant);
    initOptions(productDiv, state);
    initGallery(productDiv, state);
    initQuantityAndCart(productDiv);

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

    const all = await fetchMultipleSheets(sheetNames);
    const rows = all[category] || [];
    const filtered = rows.filter(
      row => norm(row['商品系列']) === norm(subcategory)
    );

    const container = document.getElementById('product-list');
    container.innerHTML = '';
    if (!filtered.length) {
      container.innerHTML = '<p>目前沒有這個分類的商品</p>';
      return;
    }

    const grouped = groupByProductName(filtered);
    for (const [productName, variants] of grouped.entries()) {
      const card = createProductCard(productName, variants);
      container.appendChild(card);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProducts);
  } else {
    loadProducts();
  }
})();
