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
