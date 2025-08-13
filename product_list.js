/* =========================
 * product_list.js  (完整覆蓋版)
 * ========================= */

const API_URL = "https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec";

// 取得所有商品分頁名稱（強韌處理：支援 Array / {sheetNames} / {categoryImages}）
async function getSheetNames() {
  const res = await fetch(`${API_URL}?action=getSheetNames`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet names: ${res.status}`);

  const data = await res.json();
  console.log("[getSheetNames] raw:", data);

  // 情境 A：純陣列
  if (Array.isArray(data)) {
    return data.filter(n => n && n !== "分類圖片");
  }
  // 情境 B：物件包陣列
  if (data && Array.isArray(data.sheetNames)) {
    return data.sheetNames.filter(n => n && n !== "分類圖片");
  }
  // 情境 C：目前你實際拿到的 { categoryImages: [...] }
  if (data && Array.isArray(data.categoryImages)) {
    const names = Array.from(
      new Set(
        data.categoryImages
          .map(x => x && x.mainCat)
          .filter(Boolean)
      )
    );
    // 這些 mainCat 就是商品分頁名稱（你的 Excel 設計是一個 main 對一個商品分頁）
    return names.filter(n => n && n !== "分類圖片");
  }

  throw new Error("Invalid sheet names format");
}

// 讀取單一分頁資料（商品）
async function getSheetData(sheetName) {
  const url = `${API_URL}?type=product&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${sheetName} (${res.status})`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.products || [];
}

// 主流程：取得所有商品分頁並合併顯示
async function loadProducts() {
  try {
    const sheetNames = await getSheetNames(); // ← 一定已定義
    console.log("[loadProducts] sheetNames:", sheetNames);

    if (!Array.isArray(sheetNames) || sheetNames.length === 0) {
      document.getElementById("product-list").innerHTML = "<p>目前沒有可顯示的商品分頁</p>";
      return;
    }

    let allProducts = [];
    for (const name of sheetNames) {
      try {
        const products = await getSheetData(name);
        allProducts = allProducts.concat(products);
      } catch (innerErr) {
        console.warn(`[loadProducts] 無法讀取分頁 ${name}:`, innerErr);
      }
    }

    if (allProducts.length === 0) {
      document.getElementById("product-list").innerHTML = "<p>目前沒有商品資料</p>";
      return;
    }

    renderProducts(allProducts);
  } catch (err) {
    console.error(err);
    document.getElementById("product-list").innerHTML = "<p>載入商品失敗</p>";
  }
}

// 渲染商品卡片（保留你的原樣式與互動）
function renderProducts(products) {
  const container = document.getElementById("product-list");
  if (!container) {
    console.error("找不到 #product-list 容器");
    return;
  }
  container.innerHTML = ""; // 先清空

  products.forEach(product => {
    const card_product_1 = document.createElement("div");
    card_product_1.className = "product-card-1";

    // 圖片處理
    const imageContainer = document.createElement("div");
    imageContainer.className = "product-image-container";

    const rawExtra = (product["額外圖片們"] || "").trim();
    const extraList = rawExtra ? rawExtra.split("、").map(s => s.trim()).filter(Boolean) : [];
    const images = [product["商品圖片"], ...extraList].filter(Boolean);

    let imgIndex = 0;
    const img = document.createElement("img");
    img.className = "product-image";

    // 提醒：如果 GitHub 圖片顯示不出來，請改用 raw 連結：
    // const BASE_IMAGE = "https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/";
    const BASE_IMAGE = "https://github.com/Peggy845/Yoshi_Selection/images/";

    img.src = images.length ? `${BASE_IMAGE}${images[0]}` : "";
    imageContainer.appendChild(img);

    if (images.length > 1) {
      const leftArrow = document.createElement("button");
      leftArrow.className = "image-arrow left";
      leftArrow.innerHTML = "&#8249;";
      leftArrow.onclick = () => {
        imgIndex = (imgIndex - 1 + images.length) % images.length;
        img.src = `${BASE_IMAGE}${images[imgIndex]}`;
      };
      imageContainer.appendChild(leftArrow);

      const rightArrow = document.createElement("button");
      rightArrow.className = "image-arrow right";
      rightArrow.innerHTML = "&#8250;";
      rightArrow.onclick = () => {
        imgIndex = (imgIndex + 1) % images.length;
        img.src = `${BASE_IMAGE}${images[imgIndex]}`;
      };
      imageContainer.appendChild(rightArrow);
    }

    // 狀態
    const status = document.createElement("div");
    status.className = "status";
    status.textContent = `狀態: ${product["販售狀態"] || ""}`;

    // 詳細資料
    const rightSide = document.createElement("div");
    rightSide.className = "product-details";

    const name = document.createElement("div");
    name.className = "product-name";
    name.textContent = product["商品名稱"] || "";

    const price = document.createElement("div");
    price.className = "product-price";
    price.textContent = product["價格"] ? `$ ${product["價格"]}` : "";

    const desc = document.createElement("div");
    desc.className = "product-description";
    desc.textContent = product["詳細資訊"] || "";

    // 選項
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "options";
    Object.keys(product).forEach(key => {
      if (key.startsWith("選項-") && product[key]) {
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

    const stock = parseInt(product["庫存"], 10) || 0;

    minusBtn.onclick = () => {
      const val = parseInt(qty.textContent, 10);
      if (val > 1) qty.textContent = String(val - 1);
    };
    plusBtn.onclick = () => {
      const val = parseInt(qty.textContent, 10);
      if (val < stock) qty.textContent = String(val + 1);
    };

    const stockInfo = document.createElement("span");
    stockInfo.textContent = stock ? `還剩${stock}件` : "無庫存";

    qtyControl.append(minusBtn, qty, plusBtn, stockInfo);

    const cartBtn = document.createElement("button");
    cartBtn.className = "add-to-cart";
    cartBtn.textContent = "加入購物車";
    cartBtn.onclick = () => {
      alert(`${product["商品名稱"] || "此商品"} 已加入購物車`);
    };

    purchaseSection.append(qtyControl, cartBtn);

    // 左右區塊組裝
    const leftSide = document.createElement("div");
    leftSide.append(imageContainer, status);

    rightSide.append(name, price, desc, optionsContainer, purchaseSection);

    const card = document.createElement("div");
    card.className = "product-card";
    card.append(leftSide, rightSide);

    container.appendChild(card);
  });
}

// 確保 DOM 讀取完成後才執行（避免載入順序造成未定義）
window.addEventListener("DOMContentLoaded", loadProducts);
