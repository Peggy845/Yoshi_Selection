/* =========================
 * product_list.js  (加上 mainCat / subCat 過濾 + 分類圖片排除 + subCat 圖片渲染)
 * ========================= */

const API_URL = "https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec";

// 從 URL 抓取 query 參數
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

// 取得所有商品分頁名稱（排除 "分類圖片"）
async function getSheetNames() {
  const res = await fetch(`${API_URL}?action=getSheetNames`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet names: ${res.status}`);

  const data = await res.json();
  console.log("[getSheetNames] raw:", data);

  if (Array.isArray(data)) {
    return data.filter(n => n && n !== "分類圖片");
  }
  if (data && Array.isArray(data.sheetNames)) {
    return data.sheetNames.filter(n => n && n !== "分類圖片");
  }
  if (data && Array.isArray(data.categoryImages)) {
    const names = Array.from(
      new Set(
        data.categoryImages
          .map(x => x && x.mainCat) // mainCat 當成分頁名稱
          .filter(Boolean)
      )
    );
    return names.filter(n => n && n !== "分類圖片");
  }

  throw new Error("Invalid sheet names format");
}

// 讀取單一分頁資料
async function getSheetData(sheetName) {
  const url = `${API_URL}?type=product&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${sheetName} (${res.status})`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.products || [];
}

// 讀取分類圖片資料
async function getCategoryImages() {
  const res = await fetch(`${API_URL}?action=getCategoryImages`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch category images: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.categoryImages) ? data.categoryImages : [];
}

// 主流程
async function loadProducts() {
  try {
    const mainCat = getQueryParam("mainCat");
    const subCat = getQueryParam("subCat");
    console.log("[loadProducts] mainCat:", mainCat, "subCat:", subCat);

    const sheetNames = await getSheetNames();
    console.log("[loadProducts] sheetNames:", sheetNames);

    if (!mainCat || !sheetNames.includes(mainCat)) {
      document.getElementById("product-list").innerHTML = "<p>找不到該分類</p>";
      return;
    }

    let products = await getSheetData(mainCat);

    // 如果有 subCat，就過濾商品系列
    if (subCat) {
      products = products.filter(
        p => (p["商品系列"] || "").trim() === subCat.trim()
      );
    }

    if (products.length === 0) {
      document.getElementById("product-list").innerHTML = "<p>目前沒有商品資料</p>";
      return;
    }

    // 取得 subCat 對應的分類圖片
    const categoryImages = await getCategoryImages();
    const subCatImageObj = categoryImages.find(ci => ci.subCat === subCat);
    const subCatImage = subCatImageObj ? subCatImageObj.image : "";

    renderProducts(products, subCatImage);
  } catch (err) {
    console.error(err);
    document.getElementById("product-list").innerHTML = "<p>載入商品失敗</p>";
  }
}

// 渲染商品卡片
function renderProducts(products, subCatImage = "") {
  const container = document.getElementById("product-list");
  if (!container) {
    console.error("找不到 #product-list 容器");
    return;
  }
  container.innerHTML = "";

  products.forEach(product => {
    const card_product_1 = document.createElement("div");
    card_product_1.className = "product-card-1";

    const imageContainer = document.createElement("div");
    imageContainer.className = "product-image-container";

    const rawExtra = (product["額外圖片們"] || "").trim();
    const extraList = rawExtra ? rawExtra.split("、").map(s => s.trim()).filter(Boolean) : [];
    const images = [];

    // 如果有 subCat 專屬圖片，放在第一張
    if (subCatImage) {
      images.push(subCatImage);
    }

    // 再加上商品圖片
    if (product["商品圖片"]) {
      images.push(product["商品圖片"]);
    }

    // 再加上額外圖片
    images.push(...extraList);

    let imgIndex = 0;
    const img = document.createElement("img");
    img.className = "product-image";

    const BASE_IMAGE = "https://raw.githubusercontent.com/Peggy845/Yoshi_Selection/main/images/";
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

    const status = document.createElement("div");
    status.className = "status";
    status.textContent = `狀態: ${product["販售狀態"] || ""}`;

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

    const leftSide = document.createElement("div");
    leftSide.append(imageContainer, status);

    rightSide.append(name, price, desc, optionsContainer, purchaseSection);

    const card = document.createElement("div");
    card.className = "product-card";
    card.append(leftSide, rightSide);

    container.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", loadProducts);
