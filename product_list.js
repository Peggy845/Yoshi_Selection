// ====== 注意：把下面這個 URL 換成你自己部署的 Apps Script exec URL ======
const API_URL = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';


// 讀取網址參數
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

async function loadProducts() {
  const category = getQueryParam('category');
  const subcategory = getQueryParam('subcategory');
	const titleEl = document.getElementById('subcategory-title');
	if (titleEl) {
	  titleEl.textContent = subcategory || '商品列表';
	}


  try {
    const res = await fetch(`${API_URL}?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}`);
    const data = await res.json();

    /**
     * 如果 API 回傳格式是：
     * {
     *   "分類圖片": [...],
     *   "其他分頁1": [...],
     *   "其他分頁2": [...]
     * }
     * 就先刪掉 "分類圖片"
     */
    if (data['分類圖片']) {
      delete data['分類圖片'];
    }

    // 將剩下所有分頁的商品合併成一個陣列
    let products = [];
    if (typeof data === 'object' && !Array.isArray(data)) {
      Object.values(data).forEach(sheetData => {
        if (Array.isArray(sheetData)) {
          products = products.concat(sheetData);
        }
      });
    } else if (Array.isArray(data)) {
      products = data;
    }

    if (!Array.isArray(products) || products.length === 0) {
      console.warn('沒有符合的商品資料');
      return;
    }

    // 篩選符合子分類的商品
    products = products.filter(p => p['子分類'] === subcategory);

    const list = document.getElementById('product-list');
    list.innerHTML = '';

    products.forEach(p => {
      list.appendChild(renderProductCard(p));
    });

  } catch (err) {
    console.error('載入商品失敗', err);
  }
}

// 建立商品卡片
function renderProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const img = document.createElement('img');
  img.src = product['圖片'] || 'placeholder.jpg';
  img.alt = product['商品名稱'] || '';

  const name = document.createElement('h3');
  name.textContent = product['商品名稱'] || '未命名商品';

  const price = document.createElement('p');
  price.textContent = product['價格'] ? `$${product['價格']}` : '';

  const detail = document.createElement('p');
  detail.className = 'product-detail';
  detail.textContent = product['詳細資訊'] || '';

  card.appendChild(img);
  card.appendChild(name);
  card.appendChild(price);
  card.appendChild(detail);

  return card;
}

window.onload = loadProducts;
