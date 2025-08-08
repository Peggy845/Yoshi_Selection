// ===== 共用常數 =====
const SHEET_API = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';

// ===== 初始載入 =====
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
});

// ===== 載入頂層分類 =====
async function loadCategories() {
  const res = await fetch(SHEET_API + '?action=getCategories');
  const data = await res.json();
  const section = document.getElementById('category-section');

  data.forEach(cat => {
    const block = document.createElement('div');
    block.className = 'category-block';
    block.innerHTML = `
      <div class="category-img-circle">
        <img src="images/${cat.image}" alt="${cat.name}" />
      </div>
      <div class="category-text">${cat.name}</div>
    `;
    block.addEventListener('click', () => {
      if (cat.name === '範例商品變體') {
        loadVariantProducts();
      } else {
        alert('尚未設定跳轉功能');
      }
    });
    section.appendChild(block);
  });
}

// ===== 顯示 About 我彈窗 =====
function showAboutModal() {
  document.getElementById('about-modal').classList.remove('hidden');
}

function hideAboutModal(event) {
  if (event.target.id === 'about-modal' || event.target.tagName === 'BUTTON') {
    document.getElementById('about-modal').classList.add('hidden');
  }
}

function goToCartPage() {
  window.location.href = 'cart.html';
}

// ===== 載入變體商品 =====
async function loadVariantProducts() {
  document.getElementById('category-section').classList.add('hidden');
  const page = document.getElementById('product-selection-page');
  page.classList.remove('hidden');

  const res = await fetch(SHEET_API + '?action=getVariantProducts');
  const products = await res.json();

  page.innerHTML = '';

  products.forEach((item, index) => {
    const container = document.createElement('div');
    container.className = 'product-card';

    // 圖片區（切換圖片）
    const images = item.image.split('、');
    let current = 0;
    const imgBox = document.createElement('div');
    imgBox.className = 'product-image-container';
    const img = document.createElement('img');
    img.src = `images/${images[0]}`;

    if (images.length > 1) {
      const left = document.createElement('button');
      left.className = 'image-arrow left';
      left.innerHTML = '&#8592;';
      left.onclick = () => {
        current = (current - 1 + images.length) % images.length;
        img.src = `images/${images[current]}`;
      };
      const right = document.createElement('button');
      right.className = 'image-arrow right';
      right.innerHTML = '&#8594;';
      right.onclick = () => {
        current = (current + 1) % images.length;
        img.src = `images/${images[current]}`;
      };
      imgBox.appendChild(left);
      imgBox.appendChild(right);
    }
    imgBox.appendChild(img);

    const status = document.createElement('div');
    status.className = 'product-status';
    status.innerText = `狀態: ${item.status}`;

    const infoBox = document.createElement('div');
    infoBox.className = 'product-info';
    infoBox.innerHTML = `
      <div class="product-name">${item.name}</div>
      <div class="product-price">$ ${item.price}</div>
      <div class="product-description">${item.desc || ''}</div>
    `;

    // 選項區塊
    ['variant1', 'variant2', 'variant3'].forEach((key, vi) => {
      if (item[key + 'Name']) {
        const group = document.createElement('div');
        group.className = 'option-group';

        const label = document.createElement('div');
        label.className = 'option-label';
        label.textContent = item[key + 'Name'];

        const buttonBox = document.createElement('div');
        buttonBox.className = 'option-buttons';

        const unique = [...new Set(item.allVariants.map(v => v[key]))];
        unique.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'option-button';
          btn.textContent = opt;
          btn.onclick = () => {
            [...buttonBox.children].forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          };
          buttonBox.appendChild(btn);
        });
        group.appendChild(label);
        group.appendChild(buttonBox);
        infoBox.appendChild(group);
      }
    });

    const purchaseRow = document.createElement('div');
    purchaseRow.className = 'purchase-row';
    purchaseRow.innerHTML = `
      <div class="quantity-selector">
        數量 <button onclick="this.nextElementSibling.stepDown()">-</button>
        <input type="number" value="1" min="1" max="${item.stock}" />
        <button onclick="this.previousElementSibling.stepUp()">+</button>
        <span>還剩 ${item.stock} 件</span>
      </div>
      <button class="add-to-cart-btn">加入購物車</button>
    `;

    container.appendChild(imgBox);
    container.appendChild(status);
    container.appendChild(infoBox);
    container.appendChild(purchaseRow);
    page.appendChild(container);
  });
}
