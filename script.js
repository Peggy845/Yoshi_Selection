const SHEET_API = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  setupCartButton();
});

function setupCartButton() {
  const cartBtn = document.getElementById('floating-cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      window.location.href = 'cart.html'; // 尚未建立，可先跳轉用
    });
  }
}

function loadCategories() {
  fetch(`${SHEET_API}?action=getCategories`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('category-container');
      container.innerHTML = ''; // 清空舊內容

      // 加入「關於我」分類區塊
      const aboutBlock = createCategoryBlock('關於我', 'Yoshi_Selection_logo.jpg', true);
      container.appendChild(aboutBlock);

      data.forEach(cat => {
        const block = createCategoryBlock(cat.name, cat.image);
        container.appendChild(block);
      });
    });
}

function createCategoryBlock(name, image, isAbout = false) {
  const block = document.createElement('div');
  block.className = 'category-block';

  const imgDiv = document.createElement('div');
  imgDiv.className = 'category-image';
  const img = document.createElement('img');
  img.src = `images/${image}`;
  img.alt = name;
  imgDiv.appendChild(img);

  const textDiv = document.createElement('div');
  textDiv.className = 'category-text';
  textDiv.innerText = name;

  block.appendChild(imgDiv);
  block.appendChild(textDiv);

  if (isAbout) {
    block.addEventListener('click', () => {
      document.getElementById('about-modal').style.display = 'block';
    });
  } else if (name === '範例商品變體') {
    block.addEventListener('click', () => {
      document.getElementById('main-content').innerHTML = ''; // 清空分類區塊等畫面
      loadVariantProducts();
    });
  }

  return block;
}

function loadVariantProducts() {
  fetch(`${SHEET_API}?action=getVariantProducts`)
    .then(res => res.json())
    .then(products => {
      const container = document.getElementById('main-content');
      container.innerHTML = ''; // 清空畫面

      products.forEach(product => {
        const block = document.createElement('div');
        block.className = 'product-block';

        // 左邊圖片區塊
        const imageContainer = document.createElement('div');
        imageContainer.className = 'product-image-container';

        const images = (product.image || '').split('、').map(img => img.trim()).filter(img => img);
        let currentIndex = 0;
        const imgEl = document.createElement('img');
        imgEl.className = 'product-image';
        imgEl.src = images.length > 0 ? `images/${images[currentIndex]}` : '';
        imageContainer.appendChild(imgEl);

        if (images.length > 1) {
          const left = document.createElement('div');
          left.className = 'image-arrow left-arrow';
          left.textContent = '◀';
          left.onclick = () => {
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            imgEl.src = `images/${images[currentIndex]}`;
          };

          const right = document.createElement('div');
          right.className = 'image-arrow right-arrow';
          right.textContent = '▶';
          right.onclick = () => {
            currentIndex = (currentIndex + 1) % images.length;
            imgEl.src = `images/${images[currentIndex]}`;
          };

          imageContainer.appendChild(left);
          imageContainer.appendChild(right);
        }

        // 狀態小區
        const status = document.createElement('div');
        status.className = 'product-status';
        status.textContent = `狀態: ${product.status}`;

        const leftCol = document.createElement('div');
        leftCol.className = 'product-left';
        leftCol.appendChild(imageContainer);
        leftCol.appendChild(status);

        // 右邊文字區塊
        const rightCol = document.createElement('div');
        rightCol.className = 'product-right';

        const title = document.createElement('div');
        title.className = 'product-title';
        title.textContent = product.name;

        const price = document.createElement('div');
        price.className = 'product-price';
        price.textContent = `$ ${product.price}`;

        const desc = document.createElement('div');
        desc.className = 'product-desc';
        desc.textContent = product.desc || '';

        const options = document.createElement('div');
        options.className = 'product-options';

        const variantGroups = [
          { title: product.variant1Name, values: [...new Set(product.allVariants.map(v => v.variant1))] },
          { title: product.variant2Name, values: [...new Set(product.allVariants.map(v => v.variant2))] },
          { title: product.variant3Name, values: [...new Set(product.allVariants.map(v => v.variant3))] },
        ];

        const selected = {};

        variantGroups.forEach(group => {
          const groupDiv = document.createElement('div');
          group.values.forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'option-button';
            btn.textContent = val;
            btn.addEventListener('click', () => {
              // 同一組內互斥選擇
              groupDiv.querySelectorAll('button').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              selected[group.title] = val;
            });
            groupDiv.appendChild(btn);
          });
          options.appendChild(groupDiv);
        });

        // 數量控制區
        const quantityRow = document.createElement('div');
        quantityRow.className = 'product-quantity-row';

        const quantityLabel = document.createElement('span');
        quantityLabel.textContent = '數量：';

        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.min = 1;
        qtyInput.max = product.stock;
        qtyInput.value = 1;

        const stockText = document.createElement('span');
        stockText.textContent = ` 還剩 ${product.stock} 件`;

        quantityRow.appendChild(quantityLabel);
        quantityRow.appendChild(qtyInput);
        quantityRow.appendChild(stockText);

        // 加入購物車按鈕
        const addToCartBtn = document.createElement('button');
        addToCartBtn.className = 'add-to-cart-btn';
        addToCartBtn.textContent = '加入購物車';
        addToCartBtn.addEventListener('click', () => {
          alert('🛒 商品已加入購物車（尚未串接邏輯）');
        });

        rightCol.appendChild(title);
        rightCol.appendChild(price);
        rightCol.appendChild(desc);
        rightCol.appendChild(options);
        rightCol.appendChild(quantityRow);
        rightCol.appendChild(addToCartBtn);

        block.appendChild(leftCol);
        block.appendChild(rightCol);
        container.appendChild(block);
      });
    })
    .catch(err => {
      console.error('載入商品變體失敗：', err);
      alert('商品載入失敗，請稍後再試');
    });
}
