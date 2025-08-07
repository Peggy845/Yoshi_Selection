// script.js

const cart = [];
let selectedItemIds = new Set();

function showToast(msg) {
  const tip = document.createElement("div");
  tip.textContent = msg;
  tip.style.position = "fixed";
  tip.style.top = "10px";
  tip.style.right = "10px";
  tip.style.background = "#ff8a65";
  tip.style.color = "white";
  tip.style.padding = "10px 20px";
  tip.style.borderRadius = "8px";
  tip.style.zIndex = 1001;
  document.body.appendChild(tip);
  setTimeout(() => document.body.removeChild(tip), 5000);
}

function addToCart(itemData) {
  cart.push(itemData);
  selectedItemIds.add(cart.length - 1);
  showToast("商品已加入購物車");
}

function toggleCart() {
  const popup = document.getElementById("cart-popup");
  popup.classList.toggle("hidden");
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items-container");
  container.innerHTML = "";

  cart.forEach((item, index) => {
    const isSelected = selectedItemIds.has(index);
    const total = item.price * item.qty;
    const optionHtml = item.option && item.option !== "無"
      ? `<div>選項：${item.option}</div>`
      : "";

    container.innerHTML += `
      <div class="cart-item" style="display:flex;align-items:center;margin-bottom:1rem;border-bottom:1px solid #ccc;padding-bottom:1rem;">
        <input type="checkbox" onchange="toggleItem(${index})" ${isSelected ? 'checked' : ''}>
        <img src="${item.image}" alt="${item.name}" style="width:80px;height:80px;object-fit:cover;margin:0 1rem;">
        <div style="flex:1;">
          <div>${item.name}</div>
          ${optionHtml}
        </div>
        <div style="width:80px;">$${item.price}</div>
        <div style="width:120px;">
          <button onclick="changeQty(${index}, -1)">－</button>
          <span style="margin: 0 0.5rem;">${item.qty}</span>
          <button onclick="changeQty(${index}, 1)">＋</button>
        </div>
        <div style="width:80px;">$${total}</div>
        <div style="width:60px;"><button onclick="removeFromCart(${index})">刪除</button></div>
      </div>
    `;
  });

  updateCartSummary();
}

function toggleItem(index) {
  if (selectedItemIds.has(index)) {
    selectedItemIds.delete(index);
  } else {
    selectedItemIds.add(index);
  }
  updateCartSummary();
}

function toggleSelectAll(checkbox) {
  selectedItemIds = new Set();
  if (checkbox.checked) {
    cart.forEach((_, idx) => selectedItemIds.add(idx));
  }
  renderCart();
}

function updateCartSummary() {
  let totalQty = 0;
  let totalPrice = 0;
  selectedItemIds.forEach(idx => {
    const item = cart[idx];
    totalQty += item.qty;
    totalPrice += item.price * item.qty;
  });

  document.getElementById("cart-total-count").textContent = totalQty;
  document.getElementById("cart-total-price").textContent = totalPrice;
}

function changeQty(index, delta) {
  const item = cart[index];
  const newQty = item.qty + delta;
  if (newQty >= 1 && newQty <= item.stock) {
    item.qty = newQty;
    renderCart();
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  selectedItemIds.delete(index);
  renderCart();
}

function goToCheckout() {
  alert("結帳頁面尚未設計");
}
