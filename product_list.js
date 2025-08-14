function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

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
      const cols = json.table.cols.map(col => col.label.trim());
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
    row => (row['商品系列'] || '').trim() === subcategory
  );

  const container = document.getElementById('product-list');
  container.innerHTML = '';
  if (!filtered.length) {
    container.innerHTML = '<p>目前沒有這個分類的商品</p>';
    return;
  }

  filtered.forEach(product => {
    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';

    const mainImage = product['商品圖片']
      ? `https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/${product['商品圖片']}`
      : '';
    const extraImages = (product['額外圖片'] && product['額外圖片'] !== '無')
      ? product['額外圖片'].split('、').map(img => `https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/${img}`)
      : [];
    const imgList = [mainImage, ...extraImages].filter(Boolean);
    let idx = 0;

    productDiv.innerHTML = `
      <div class="left-col">
        <div class="product-image-block">
          <div class="arrow-block arrow-left" style="${extraImages.length ? '' : 'display:none'}">
            <svg viewBox="0 0 24 24"><path d="M15 6 L9 12 L15 18" stroke="#fff" stroke-width="2" fill="none"/></svg>
          </div>
          <img src="${imgList[0] || ''}" alt="${product['商品名稱'] || ''}">
          <div class="arrow-block arrow-right" style="${extraImages.length ? '' : 'display:none'}">
            <svg viewBox="0 0 24 24"><path d="M9 6 L15 12 L9 18" stroke="#fff" stroke-width="2" fill="none"/></svg>
          </div>
        </div>
        <div class="sale-status-block">狀態: ${product['販售狀態'] || ''}</div>
      </div>

      <div class="right-col">
        <div class="product-name">${product['商品名稱'] || ''}</div>
        <div class="product-price">$ ${product['價格'] || ''}</div>
        <div class="product-detail">${product['詳細資訊'] || ''}</div>
        <div class="product-option">選項區域</div>
        <div class="product-quantity">
          <div class="quantity-block">
            <span>數量</span>
            <button class="qty-btn" data-type="minus">−</button>
            <input class="quantity-input" type="number" value="1" min="1" max="${product['庫存'] || 0}" readonly>
            <button class="qty-btn" data-type="plus">＋</button>
            <span class="stock-text">還剩 ${product['庫存'] || 0} 件</span>
          </div>
        </div>
        <div class="product-cart">
          <button class="cart-btn">加入購物車</button>
        </div>
      </div>
    `;

    const imgEl = productDiv.querySelector('.product-image-block img');
    const leftBtn = productDiv.querySelector('.arrow-left');
    const rightBtn = productDiv.querySelector('.arrow-right');

    leftBtn?.addEventListener('click', () => {
      idx = (idx - 1 + imgList.length) % imgList.length;
      imgEl.src = imgList[idx];
    });
    rightBtn?.addEventListener('click', () => {
      idx = (idx + 1) % imgList.length;
      imgEl.src = imgList[idx];
    });
	
	   const imgEl = productDiv.querySelector('.product-image-block img');
    const leftBtn = productDiv.querySelector('.left-arrow');
    const rightBtn = productDiv.querySelector('.right-arrow');

    // 左右箭頭切換圖片
    leftBtn?.addEventListener('click', () => { idx=(idx-1+imgList.length)%imgList.length; imgEl.src=imgList[idx]; });
    rightBtn?.addEventListener('click',()=>{ idx=(idx+1)%imgList.length; imgEl.src=imgList[idx]; });

    // 放大鏡
    const magnifierBtn = document.createElement('div');
    magnifierBtn.className='magnifier-btn';
    magnifierBtn.innerHTML=`<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="16" y1="16" x2="22" y2="22"/></svg>`;
    productDiv.querySelector('.product-image-block').appendChild(magnifierBtn);

    const lens = document.createElement('div');
    lens.className='magnifier-lens';
    const lensImg = imgEl.cloneNode(true);
    lens.appendChild(lensImg);
    productDiv.querySelector('.product-image-block').appendChild(lens);

    let zoomActive=false;
    magnifierBtn.addEventListener('click',()=>{ zoomActive=!zoomActive; lens.style.display=zoomActive?'block':'none'; });

    productDiv.querySelector('.product-image-block').addEventListener('mousemove',(e)=>{
      if(!zoomActive) return;
      const rect=imgEl.getBoundingClientRect();
      const x=e.clientX-rect.left;
      const y=e.clientY-rect.top;
      const lensWidth=lens.offsetWidth;
      const lensHeight=lens.offsetHeight;
      const zoom=2;
      let lensX=x-lensWidth/2;
      let lensY=y-lensHeight/2;
      lensX=Math.max(0,Math.min(rect.width-lensWidth,lensX));
      lensY=Math.max(0,Math.min(rect.height-lensHeight,lensY));
      lens.style.left=lensX+'px';
      lens.style.top=lensY+'px';
      lensImg.src=imgList[idx];
      lensImg.style.width=rect.width*zoom+'px';
      lensImg.style.height=rect.height*zoom+'px';
      lensImg.style.left=-lensX*zoom+'px';
      lensImg.style.top=-lensY*zoom+'px';
    });

    // 離開鏡片隱藏
    productDiv.querySelector('.product-image-block').addEventListener('mouseleave',()=>{ if(zoomActive) lens.style.display='none'; });

    productDiv.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('qty-btn')) {
        const block = target.closest('.quantity-block');
        const input = block.querySelector('.quantity-input');
        const max = parseInt(input.max || '0', 10);
        let val = parseInt(input.value || '1', 10);

        if (target.dataset.type === 'plus') val = Math.min(max, val + 1);
        if (target.dataset.type === 'minus') val = Math.max(1, val - 1);

        input.value = val;
      }

      if (target.classList.contains('cart-btn')) {
        target.classList.toggle('active');
        target.textContent = target.classList.contains('active') ? '已加入' : '加入購物車';
      }
    });

    container.appendChild(productDiv);
  });
}

loadProducts();
