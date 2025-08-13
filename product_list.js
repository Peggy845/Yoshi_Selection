const API_URL = "https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec";

// 從 URL 抓取 query 參數
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

// --- Debug: 印出 URL 與參數 ---
console.log("完整 URL:", window.location.href);
const mainCatParam = getQueryParam("main");
const subCatParam = getQueryParam("sub");
console.log("main 參數:", mainCatParam);
console.log("sub 參數:", subCatParam);

// 取得所有商品分頁名稱及分類圖片
async function getSheetNames() {
  try {
    const res = await fetch(`${API_URL}?action=getSheetNames`, { cache: "no-store" });
    const data = await res.json();
    console.log("[Debug] getSheetNames raw data:", data);

    if (Array.isArray(data.categoryImages)) {
      // 用 categoryImages 推 sheetNames
      const sheetNames = Array.from(new Set(data.categoryImages.map(ci => ci.mainCat)));
      console.log("[Debug] sheetNames:", sheetNames);
      return { sheetNames, categoryImages: data.categoryImages };
    } else {
      throw new Error("categoryImages 格式不正確");
    }
  } catch (err) {
    console.error("[Debug] 抓取 sheetNames 發生錯誤:", err);
    return { sheetNames: [], categoryImages: [] };
  }
}

// 讀取單一分頁商品資料，支援 subCategory
async function getSheetData(sheetName, subCategory = "") {
  try {
    console.log(`[Debug] fetch sheetData: sheet=${sheetName}, subCategory=${subCategory}`);
    const url = `${API_URL}?type=product&sheet=${encodeURIComponent(sheetName)}&subCategory=${encodeURIComponent(subCategory)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetch 失敗: ${res.status}`);
    const json = await res.json();
    console.log("[Debug] sheetData raw:", json);
    if (json.error) throw new Error(json.error);
    return json.products || [];
  } catch (err) {
    console.error("[Debug] 抓取 sheetData 發生錯誤:", err);
    return [];
  }
}

// 主流程
async function loadProducts() {
  try {
    console.log("[Debug] loadProducts 開始");
    const { sheetNames, categoryImages } = await getSheetNames();

    if (!mainCatParam) {
      console.warn("[Debug] mainCat 沒有設定");
      document.getElementById("product-list").innerHTML = "<p>找不到該分類</p>";
      return;
    }

    if (!sheetNames.includes(mainCatParam)) {
      console.warn("[Debug] mainCat 不在 sheetNames 裡:", mainCatParam, sheetNames);
      document.getElementById("product-list").innerHTML = "<p>找不到該分類</p>";
      return;
    }

    let products = await getSheetData(mainCatParam, subCatParam);
    console.log("[Debug] 取得的商品數量:", products.length);

    if (!products.length) {
      document.getElementById("product-list").innerHTML = "<p>目前沒有商品資料</p>";
      return;
    }

    const subCatImageObj = categoryImages.find(
      ci => ci.mainCat === mainCatParam && ci.subCat === subCatParam
    );
    const subCatImage = subCatImageObj ? subCatImageObj.subImg : "";
    console.log("[Debug] subCatImage:", subCatImage);

    renderProducts(products, subCatImage);
  } catch (err) {
    console.error("[Debug] loadProducts 發生錯誤:", err);
    document.getElementById("product-list").innerHTML = "<p>載入商品失敗</p>";
  }
}

// 渲染商品卡片
function renderProducts(products, subCatImage = "") {
  const container = document.getElementById("product-list");
  if (!container) return;
  container.innerHTML = "";

  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    // 左側圖片區
    const leftSide = document.createElement("div");
    const imageContainer = document.createElement("div");
    imageContainer.className = "product-image-container";

    const images = [];
    if (subCatImage) images.push(subCatImage);
    if (product["商品圖片"]) images.push(product["商品圖片"]);
    if (product["額外圖片們"]) images.push(...product["額外圖片們"].split("、").map(s => s.trim()).filter(Boolean));

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
      leftArrow.onclick = () => { imgIndex = (imgIndex - 1 + images.length) % images.length; img.src = `${BASE_IMAGE}${images[imgIndex]}`; };
      const rightArrow = document.createElement("button");
      rightArrow.className = "image-arrow right";
      rightArrow.innerHTML = "&#8250;";
      rightArrow.onclick = () => { imgIndex = (imgIndex + 1) % images.length; img.src = `${BASE_IMAGE}${images[imgIndex]}`; };
      imageContainer.appendChild(leftArrow);
      imageContainer.appendChild(rightArrow);
    }

    leftSide.appendChild(imageContainer);
    const status = document.createElement("div");
    status.className = "status";
    status.textContent = `狀態: ${product["販售狀態"] || ""}`;
    leftSide.appendChild(status);

    // 右側商品資訊
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
    const minusBtn = document.createElement("button"); minusBtn.textContent = "-";
    const qty = document.createElement("span"); qty.textContent = "1";
    const plusBtn = document.createElement("button"); plusBtn.textContent = "+";
    const stock = parseInt(product["庫存"],10) || 0;
    minusBtn.onclick = () => { const val = parseInt(qty.textContent,10); if(val>1) qty.textContent=String(val-1); };
    plusBtn.onclick = () => { const val = parseInt(qty.textContent,10); if(val<stock) qty.textContent=String(val+1); };
    const stockInfo = document.createElement("span");
    stockInfo.textContent = stock ? `還剩${stock}件` : "無庫存";
    qtyControl.append(minusBtn, qty, plusBtn, stockInfo);

    const cartBtn = document.createElement("button");
    cartBtn.className = "add-to-cart";
    cartBtn.textContent = "加入購物車";
    cartBtn.onclick = () => alert(`${product["商品名稱"] || "此商品"} 已加入購物車`);
    purchaseSection.append(qtyControl, cartBtn);

    rightSide.append(name, price, desc, optionsContainer, purchaseSection);

    card.append(leftSide, rightSide);
    container.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", loadProducts);
