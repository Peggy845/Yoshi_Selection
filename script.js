// === 全域變數 ===
const cart = [];

// === 加入購物車 ===
function addToCart(product) {
  const existing = cart.find(item =>
    item.name === product.name && item.option === product.option
  );
  if (existing) {
    existing.qty += product.qty;
    if (existing.qty > product.stock) existing.qty = product.stock;
  } else {
    cart.push(product);
  }
  showToast("商品已加入購物車");
}

// === 顯示提示文字 ===
function showToast(text) {
  const toast = document.createElement("div");
  toast.innerText = text;
  toast.style.cssText = `
    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
    background: #333; color: #fff; padding: 10px 20px; border-radius: 20px;
    z-index: 10000; font-family: 'Microsoft JhengHei', Calibri;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// === 建立懸浮購物車按鈕 ===
function createFloatingCartButton() {
  const btn = document.createElement("div");
  btn.id = "floatingCartBtn";
  btn.innerHTML = "🛒";
  btn.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
    background: #f90; color: white; font-size: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 10px rgba(0,0,0,0.3); cursor: pointer; z-index: 9999;
  `;
  btn.onclick = () => toggleCartView(true);
  document.body.appendChild(btn);
}

// === 切換購物車畫面 ===
function toggleCartView(show) {
  const cartView = document.getElementById("cartView");
  if (show) {
    cartView.style.display = "flex";
    renderCartItems();
  } else {
    cartView.style.display = "none";
  }
}

// === 建立購物車畫面容器 ===
function createCartView() {
  const cartView = document.createElement("div");
  cartView.id = "cartView";
  cartView.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white;
    display: none; flex-direction: column; z-index: 9998;
    font-family: 'Microsoft JhengHei', Calibri;
  `;

  const cartList = document.createElement("div");
  cartList.id = "cartList";
  cartList.style.cssText = `
    flex: 1; overflow-y: auto; padding: 20px;
  `;

  const cartSummary = document.createElement("div");
  cartSummary.id = "cartSummary";
  cartSummary.style.cssText = `
    background: #d6f5d6; padding: 10px 20px; border-top: 1px solid #ccc;
    display: flex; justify-content: space-between; align-items: center;
    position: sticky; bottom: 0;
  `;
  cartSummary.innerHTML = `
    <label><input type="checkbox" id="selectAll"> 全選</label>
    <span id="cartTotal"></span>
    <div>
      <button onclick="toggleCartView(false)">繼續購物</button>
      <button onclick="goCheckout()">結帳</button>
    </div>
  `;

  cartView.appendChild(cartList);
  cartView.appendChild(cartSummary);
  document.body.appendChild(cartView);

  document.getElementById("selectAll").addEventListener("change", e => {
    document.querySelectorAll(".cart-check").forEach(chk => chk.checked = e.target.checked);
    updateCartTotal();
  });
}

// === 渲染購物車內容 ===
function renderCartItems() {
  const list = document.getElementById("cartList");
  list.innerHTML = "";
  cart.forEach((item, index) => {
    const row = document.createElement("div");
    row.style.cssText = "display: flex; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 10px;";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "cart-check";
    chk.checked = true;
    chk.onchange = updateCartTotal;

    const img = document.createElement("img");
    img.src = item.image;
    img.style.cssText = "width: 60px; height: 60px; object-fit: cover; margin: 0 10px;";

    const info = document.createElement("div");
    info.style.flex = "1";
    info.innerHTML = `
      <div><strong>\${item.name}</strong></div>
      \${item.option ? `<div>選項：\${item.option}</div>` : ""}
      <div>單價：\$ \${item.price}</div>
    `;

    const qtyBox = document.createElement("div");
    qtyBox.style.cssText = "display: flex; align-items: center; gap: 4px;";
    const minus = document.createElement("button");
    minus.innerText = "-";
    const qty = document.createElement("input");
    qty.type = "number";
    qty.value = item.qty;
    qty.min = 1;
    qty.max = item.stock;
    qty.style.width = "50px";
    const plus = document.createElement("button");
    plus.innerText = "+";

    minus.onclick = () => {
      if (item.qty > 1) item.qty--;
      qty.value = item.qty;
      updateCartTotal();
    };
    plus.onclick = () => {
      if (item.qty < item.stock) item.qty++;
      qty.value = item.qty;
      updateCartTotal();
    };
    qty.onchange = () => {
      let v = parseInt(qty.value);
      if (v < 1) v = 1;
      if (v > item.stock) v = item.stock;
      item.qty = v;
      qty.value = v;
      updateCartTotal();
    };

    qtyBox.append(minus, qty, plus);

    const del = document.createElement("button");
    del.innerText = "刪除";
    del.onclick = () => {
      cart.splice(index, 1);
      renderCartItems();
      updateCartTotal();
    };

    row.append(chk, img, info, qtyBox, del);
    list.appendChild(row);
  });
  updateCartTotal();
}

// === 更新購物車金額與商品數 ===
function updateCartTotal() {
  const checks = document.querySelectorAll(".cart-check:checked");
  let total = 0, count = 0;
  checks.forEach((chk, i) => {
    const item = cart[i];
    total += item.price * item.qty;
    count += item.qty;
  });
  document.getElementById("cartTotal").innerText = `共 \${count} 件 / \$ \${total}`;
}

// === 結帳 ===
function goCheckout() {
  alert("尚未設計結帳頁面");
}

// === 初始化 ===
window.addEventListener("DOMContentLoaded", () => {
  createFloatingCartButton();
  createCartView();
});
