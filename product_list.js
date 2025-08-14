// 模擬商品資料
const filtered = [
    {
        id: 1,
        name: "測試商品A",
        price: 299,
        details: "這是一個詳細資訊的範例",
        stock: 5,
        image: "https://via.placeholder.com/150",
        status: "熱賣中"
    },
    {
        id: 2,
        name: "測試商品B",
        price: 599,
        details: "另一個詳細資訊的範例",
        stock: 10,
        image: "https://via.placeholder.com/150",
        status: "促銷中"
    }
];

// 渲染商品列表
const productList = document.getElementById("product-list");

filtered.forEach(product => {
    const productContainer = document.createElement("div");
    productContainer.classList.add("product-item");

    // 左半部
    const leftDiv = document.createElement("div");
    leftDiv.classList.add("product-left");

    const imgDiv = document.createElement("div");
    imgDiv.classList.add("product-image");
    const img = document.createElement("img");
    img.src = product.image;
    imgDiv.appendChild(img);

    const statusDiv = document.createElement("div");
    statusDiv.classList.add("product-status");
    statusDiv.textContent = product.status;

    leftDiv.appendChild(imgDiv);
    leftDiv.appendChild(statusDiv);

    // 右半部
    const rightDiv = document.createElement("div");
    rightDiv.classList.add("product-right");

    // 商品名稱區
    const nameDiv = document.createElement("div");
    nameDiv.classList.add("product-name");
    nameDiv.textContent = product.name;

    // 價錢區
    const priceDiv = document.createElement("div");
    priceDiv.classList.add("product-price");
    priceDiv.textContent = ` $ ${product.price}`;

    // 詳細資訊區
    const detailsDiv = document.createElement("div");
    detailsDiv.classList.add("product-details");
    detailsDiv.textContent = product.details;

    // 選項區（暫時空）
    const optionsDiv = document.createElement("div");
    optionsDiv.classList.add("product-options");

    // 選購區
    const quantityDiv = document.createElement("div");
    quantityDiv.classList.add("product-quantity");

    const quantityLabel = document.createElement("span");
    quantityLabel.textContent = "數量";

    const quantityControls = document.createElement("div");
    quantityControls.classList.add("quantity-controls");

    const minusBtn = document.createElement("button");
    minusBtn.textContent = "-";
    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.value = 1;
    quantityInput.min = 1;
    quantityInput.max = product.stock;
    const plusBtn = document.createElement("button");
    plusBtn.textContent = "+";

    minusBtn.addEventListener("click", () => {
        let value = parseInt(quantityInput.value);
        if (value > 1) quantityInput.value = value - 1;
    });

    plusBtn.addEventListener("click", () => {
        let value = parseInt(quantityInput.value);
        if (value < product.stock) quantityInput.value = value + 1;
    });

    quantityControls.appendChild(minusBtn);
    quantityControls.appendChild(quantityInput);
    quantityControls.appendChild(plusBtn);

    const stockText = document.createElement("span");
    stockText.classList.add("stock-text");
    stockText.textContent = `還剩 ${product.stock} 件`;

    quantityDiv.appendChild(quantityLabel);
    quantityDiv.appendChild(quantityControls);
    quantityDiv.appendChild(stockText);

    // 購物車區
    const cartDiv = document.createElement("div");
    cartDiv.classList.add("product-cart");
    const cartButton = document.createElement("button");
    cartButton.classList.add("add-to-cart");
    cartButton.textContent = "加入購物車";
    cartButton.addEventListener("click", () => {
        cartButton.classList.toggle("active");
    });
    cartDiv.appendChild(cartButton);

    // 組裝右半部
    rightDiv.appendChild(nameDiv);
    rightDiv.appendChild(priceDiv);
    rightDiv.appendChild(detailsDiv);
    rightDiv.appendChild(optionsDiv);
    rightDiv.appendChild(quantityDiv);
    rightDiv.appendChild(cartDiv);

    // 組裝整個商品區塊
    productContainer.appendChild(leftDiv);
    productContainer.appendChild(rightDiv);
    productList.appendChild(productContainer);
});
