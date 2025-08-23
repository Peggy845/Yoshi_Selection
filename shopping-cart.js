const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");

// 取得購物車資料
function getCart() {
  return JSON.parse(localStorage.getItem("shoppingCart")) || [];
}

// 存回購物車
function saveCart(cart) {
  localStorage.setItem("shoppingCart", JSON.stringify(cart));
  updateCartBadge();
}

// 更新購物車徽章
function updateCartBadge() {
  const cart = getCart();
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById("cart-badge");
  if (badge) {
    badge.textContent = totalQty;
    badge.style.display = totalQty > 0 ? "inline-block" : "none";
  }
}

// 渲染購物車頁面
function renderCart() {
  const cart = getCart();
  cartItemsContainer.innerHTML = "";

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = "<p>購物車是空的</p>";
    cartTotal.textContent = "總計: $0";
    return;
  }

  let totalPrice = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    totalPrice += itemTotal;

    const cartItem = document.createElement("div");
    cartItem.classList.add("cart-item");
    cartItem.innerHTML = `
      <img src="${item.image}" class="cart-item-img" alt="${item.name}">
      <div class="cart-item-info">
        <h3>${item.name}</h3>
        <p>單價: $${item.price}</p>
        <div class="cart-item-options">
          ${Object.entries(item.options)
            .map(([k, v]) => `<span>${k}: ${v}</span>`)
            .join(" | ")}
        </div>
        <div class="cart-quantity-control">
          <button class="qty-btn minus" data-index="${index}">−</button>
          <span class="quantity">${item.quantity}</span>
          <button class="qty-btn plus" data-index="${index}">＋</button>
        </div>
        <p class="cart-item-total">小計: $${itemTotal}</p>
        <button class="remove-btn" data-index="${index}">刪除</button>
      </div>
    `;
    cartItemsContainer.appendChild(cartItem);
  });

  cartTotal.textContent = `總計: $${totalPrice}`;
}

// 綁定＋／－按鈕與刪除
cartItemsContainer.addEventListener("click", (e) => {
  const cart = getCart();

  // 增加數量
  if (e.target.classList.contains("plus")) {
    const index = e.target.dataset.index;
    cart[index].quantity++;
    saveCart(cart);
    renderCart();
  }

  // 減少數量
  if (e.target.classList.contains("minus")) {
    const index = e.target.dataset.index;
    if (cart[index].quantity > 1) {
      cart[index].quantity--;
    } else {
      cart.splice(index, 1); // 數量 0 → 移除商品
    }
    saveCart(cart);
    renderCart();
  }

  // 刪除商品
  if (e.target.classList.contains("remove-btn")) {
    const index = e.target.dataset.index;
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  }
});

// 初始化
renderCart();
updateCartBadge();

document.addEventListener("DOMContentLoaded", () => {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotalElement = document.getElementById("cart-total");
  const backBtn = document.getElementById("back-btn");

  let cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];

  function renderCart() {
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = "<p class='empty'>購物車是空的</p>";
      cartTotalElement.textContent = "0";
      return;
    }

    let total = 0;

    cart.forEach((item, index) => {
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("cart-item");

      const optionsHTML = Object.entries(item.options)
        .map(([key, value]) => `<div class="option">${key}：${value}</div>`)
        .join("");

      itemDiv.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="cart-image" />
        <div class="cart-info">
          <div class="cart-name">${item.name}</div>
          <div class="cart-price">單價：$${item.price}</div>
          <div class="cart-options">${optionsHTML}</div>
          <div class="cart-quantity">數量：${item.quantity}</div>
          <div class="cart-subtotal">小計：$${item.price * item.quantity}</div>
        </div>
        <button class="remove-btn" data-index="${index}">刪除</button>
      `;

      cartItemsContainer.appendChild(itemDiv);

      total += item.price * item.quantity;
    });

    cartTotalElement.textContent = total;

    // 綁定刪除按鈕
    const removeBtns = document.querySelectorAll(".remove-btn");
    removeBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = e.target.dataset.index;
        cart.splice(index, 1);
        localStorage.setItem("shoppingCart", JSON.stringify(cart));
        renderCart();
      });
    });
  }

  // 返回商品頁
  backBtn.addEventListener("click", () => {
    window.location.href = "product-list.html";
  });

  renderCart();
});

const backBtn = document.getElementById("back-btn");
const homeBtn = document.getElementById("home-btn");
const checkoutBtn = document.getElementById("checkout-btn");

// 返回商品頁
backBtn.addEventListener("click", () => {
  const cart = JSON.parse(localStorage.getItem("shoppingCart")) || [];

  // 找最後一次加入購物車的商品
  if (cart.length > 0) {
    const lastItem = cart[cart.length - 1];
    const main = encodeURIComponent(lastItem.main);
    const sub = encodeURIComponent(lastItem.sub);
    window.location.href = `product-list.html?main=${main}&sub=${sub}`;
  } else {
    // 如果購物車是空的 → 回首頁
    window.location.href = "index.html";
  }
});

// 回首頁
homeBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

// 前往結帳
checkoutBtn.addEventListener("click", () => {
  window.location.href = "checkout.html";
});
