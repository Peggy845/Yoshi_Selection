const API_URL = "https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec";

// 取得所有分頁名稱（排除「分類圖片」）
async function getSheetNames() {
  const res = await fetch(`${API_URL}?action=getSheetNames`);
  if (!res.ok) throw new Error("Failed to fetch sheet names");
  const data = await res.json();
  console.log("sheetNames raw data:", data);
  if (!Array.isArray(data)) throw new Error("Invalid sheet names format");
  return data;
}

// 讀取單一分頁資料
async function getSheetData(sheetName) {
  const res = await fetch(`${API_URL}?action=product&sheet=${encodeURIComponent(sheetName)}`);
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${sheetName}`);
  const json = await res.json();
  return json.products || [];
}

// 主流程：依序取得所有分頁資料合併
async function loadProducts() {
  try {
    const sheetNames = await getSheetNames();
    let allProducts = [];

    for (const name of sheetNames) {
      const products = await getSheetData(name);
      allProducts = allProducts.concat(products);
    }

    renderProducts(allProducts);
  } catch (err) {
    console.error(err);
    document.getElementById("product-list").innerHTML = "<p>載入商品失敗</p>";
  }
}

// 渲染商品卡片
function renderProducts(products) {
  const container = document.getElementById("product-list");
  container.innerHTML = ""; // 先清空

  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    // 圖片處理
    const imageContainer = document.createElement("div");
    imageContainer.className = "product-image-container";
    const images = [product["商品圖片"], ...(product["額外圖片們"] ? product["額外圖片們"].split("、") : [])];
    let imgIndex = 0;
    const img = document.createElement("img");
    img.className = "product-image";
    img.src = `https://github.com/Peggy845/Yoshi_Selection/images/${images[0]}`;
    imageContainer.appendChild(img);

    if (images.length > 1) {
      const leftArrow = document.createElement("button");
      leftArrow.className = "image-arrow left";
      leftArrow.innerHTML = "&#8249;";
      leftArrow.onclick = () => {
        imgIndex = (imgIndex - 1 + images.length) % images.length;
        img.src = `https://github.com/Peggy845/Yoshi_Selection/images/${images[imgIndex]}`;
      };
      imageContainer.appendChild(leftArrow);

      const rightArrow = document.createElement("button");
      rightArrow.className = "image-arrow right";
      rightArrow.innerHTML = "&#8250;";
      rightArrow.onclick = () => {
        imgIndex = (imgIndex + 1) % images.length;
        img.src = `https://github.com/Peggy845/Yoshi_Selection/images/${images[imgIndex]}`;
      };
      imageContainer.appendChild(rightArrow);
    }

    // 狀態
    const status = document.createElement("div");
    status.className = "status";
    status.textContent = `狀態: ${product["販售狀態"]}`;

    // 詳細資料
    const details = document.createElement("div");
    details.className = "product-details";
    const name = document.createElement("div");
    name.className = "product-name";
    name.textContent = product["商品名稱"];
    const price = document.createElement("div");
    price.className = "product-price";
    price.textContent = `$ ${product["價格"]}`;
    const desc = document.createElement("div");
    desc.className = "product-description";
    desc.textContent = product["詳細資訊"] || "";

    // 選項
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "options";
    Object.keys(product).forEach(key => {
      if (key.startsWith("選項-")) {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = product[key];
        btn.onclick = () => {
          [...optionsContainer.querySelectorAll(".option-btn")].forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        };
        optionsContainer.appendChild(btn);
      }
    });

    // 選購區
    const purchaseSection = document.createElement("div");
    purchaseSection.className = "purchase-section";

    const qtyControl = document.createElement("div");
    qtyControl.className = "quantity-control";
    const minusBtn = document.createElement("button");
    minusBtn.textContent = "-";
    const qty = document.createElement("span");
    qty.textContent = "1";
    const plusBtn = document.createElement("button");
    plusBtn.textContent = "+";

    let stock = parseInt(product["庫存"], 10) || 0;
    minusBtn.onclick = () => {
      let val = parseInt(qty.textContent, 10);
      if (val > 1) qty.textContent = val - 1;
    };
    plusBtn.onclick = () => {
      let val = parseInt(qty.textContent, 10);
      if (val < stock) qty.textContent = val + 1;
    };

    const stockInfo = document.createElement("span");
    stockInfo.textContent = `還剩${stock}件`;

    qtyControl.append(minusBtn, qty, plusBtn, stockInfo);

    // 購物車按鈕
    const cartBtn = document.createElement("button");
    cartBtn.className = "add-to-cart";
    cartBtn.textContent = "加入購物車";
    cartBtn.onclick = () => {
      alert(`${product["商品名稱"]} 已加入購物車`);
    };

    purchaseSection.append(qtyControl, cartBtn);

    // 組裝卡片
    const leftSide = document.createElement("div");
    leftSide.append(imageContainer, status);
    const rightSide = document.createElement("div");
    rightSide.className = "product-details";
    rightSide.append(name, price, desc, optionsContainer, purchaseSection);

    card.append(leftSide, rightSide);
    container.appendChild(card);
  });
}

// 直接呼叫主流程載入商品
loadProducts();
