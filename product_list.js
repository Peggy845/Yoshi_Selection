const API_URL = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';

function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  const subCategoryName = urlParams.get('sub') || '';
  
  // DOMContentLoaded 確保 HTML 都載入完成
	document.addEventListener('DOMContentLoaded', () => {
	  // 設定標題
	  const titleEl = document.getElementById('sub-category-title');
	  titleEl.textContent = subCategoryName;
	  
	  // 額外：你可以加一點樣式
	  titleEl.style.textAlign = 'center';
	  titleEl.style.fontSize = '1.5em';
	  titleEl.style.margin = '20px 0';
	});

  return urlParams.get(name);
}

function renderProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  // 圖片處理
  const images = [product['商品圖片'], ...(product['額外圖片們'] ? product['額外圖片們'].split('、') : [])];
  let currentImageIndex = 0;

  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';
  const img = document.createElement('img');
  img.src = `https://github.com/Peggy845/Yoshi_Selection/images/${images[0]}`;
  imageContainer.appendChild(img);

  if (images.length > 1) {
    const leftBtn = document.createElement('button');
    leftBtn.className = 'image-nav left';
    leftBtn.textContent = '<';
    leftBtn.onclick = () => {
      currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
      img.src = `https://github.com/Peggy845/Yoshi_Selection/images/${images[currentImageIndex]}`;
    };

    const rightBtn = document.createElement('button');
    rightBtn.className = 'image-nav right';
    rightBtn.textContent = '>';
    rightBtn.onclick = () => {
      currentImageIndex = (currentImageIndex + 1) % images.length;
      img.src = `https://github.com/Peggy845/Yoshi_Selection/images/${images[currentImageIndex]}`;
    };

    imageContainer.appendChild(leftBtn);
    imageContainer.appendChild(rightBtn);
  }

  // 狀態
  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = `狀態: ${product['販售狀態']}`;


  // 右側資訊
  const info = document.createElement('div');
  info.className = 'product-info';
  info.innerHTML = `
    <div class="product-name">${product['商品名稱']}</div>
    <div class="product-price">$ ${product['價格']}</div>
    <div class="product-detail">${product['詳細資訊'] || ''}</div>
  `;

  // 選項（依照「選項-xxx」欄位動態生成）
  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'options';
  Object.keys(product).forEach(key => {
    if (key.startsWith('選項-') && product[key]) {
      const values = product[key].split('、');
      values.forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'option-button';
        btn.textContent = val;
        btn.onclick = () => {
          // 單選行為
          [...optionsDiv.querySelectorAll('.option-button')]
            .filter(b => b.textContent.startsWith(val.split('-')[0]))
            .forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        };
        optionsDiv.appendChild(btn);
      });
    }
  });
  info.appendChild(optionsDiv);

  // 底部數量與購物車
  const bottom = document.createElement('div');
  bottom.className = 'bottom-section';

  const qtyDiv = document.createElement('div');
  qtyDiv.className = 'quantity-section';
  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.value = 1;
  qtyInput.min = 1;
  qtyInput.max = product['庫存'];
  qtyDiv.textContent = '數量 ';
  qtyDiv.appendChild(qtyInput);
  const stockText = document.createElement('span');
  stockText.textContent = ` 還剩${product['庫存']}件`;
  qtyDiv.appendChild(stockText);

  const cartDiv = document.createElement('div');
  cartDiv.className = 'cart-section';
  const cartBtn = document.createElement('button');
  cartBtn.textContent = '加入購物車';
  cartDiv.appendChild(cartBtn);

  bottom.appendChild(qtyDiv);
  bottom.appendChild(cartDiv);
  info.appendChild(bottom);

  // 組合
  const leftSide = document.createElement('div');
  leftSide.appendChild(imageContainer);
  leftSide.appendChild(status);

  card.appendChild(leftSide);
  card.appendChild(info);

  return card;
}

async function loadProducts() {
  const category = getQueryParam('category');
  const subcategory = getQueryParam('subcategory');

  const res = await fetch(`${API_URL}?category=${category}&subcategory=${subcategory}`);
  const data = await res.json();
  const products = data.categoryImages || []; // 這裡改成正確 key
  
  console.log(data); // 看一下實際回傳格式
  
  // 如果 API 是 { products: [...] }
  const products = data.products || [];

  const list = document.getElementById('product-list');
  if (!list) 
  {
	console.error("找不到 #product-list 元素，請檢查 HTML 結構");
    return;
  }

  list.innerHTML = '';
	products.forEach(p => {
	  list.appendChild(renderProductCard(p));
	});
}

loadProducts();
