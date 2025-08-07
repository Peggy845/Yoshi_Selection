const scriptBase = "https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec";
const cart = [];

async function fetchCategories() {
  const res = await fetch(`${scriptBase}?action=categories`);
  return await res.json();
}
async function fetchProducts(topCat, subCat = "全部") {
  const res = await fetch(`${scriptBase}?action=products&cat=${encodeURIComponent(topCat)}&sub=${encodeURIComponent(subCat)}`);
  return await res.json();
}

function renderCategories() {
  fetchCategories().then(data => {
    const container = document.getElementById("categories");
    container.innerHTML = "";
    data.forEach((cat, idx) => {
      const div = document.createElement("div");
      div.className = "category-block";
      div.innerHTML = \`
        <img src="\${cat.image}" class="category-img"><br>
        <strong>\${cat.name}</strong><br>
        <select style="display:none;">
          <option value="全部">全部</option>
          \${cat.subCategories.map(s => \`<option value="\${s.name}">\${s.name}</option>\`).join("")}
        </select>
      \`;
      const select = div.querySelector("select");
      div.onclick = () => {
        document.querySelectorAll(".category-block select").forEach(s => s.style.display = "none");
        select.style.display = "inline-block";
      };
      select.onchange = () => renderProducts(cat.name, select.value);
      container.appendChild(div);
    });
  });
}

function renderProducts(topCat, subCat) {
  fetchProducts(topCat, subCat).then(data => {
    const container = document.getElementById("products");
    container.innerHTML = "";
    data.forEach(p => {
      const div = document.createElement("div");
      div.className = "product-card";

      const images = p.images || [];
      let currentIdx = 0;
      const img = document.createElement("img");
      img.className = "product-image";
      img.src = images[0] || "";

      const left = document.createElement("div");
      left.className = "image-nav left";
      left.innerText = "<";
      left.onclick = () => {
        currentIdx = (currentIdx - 1 + images.length) % images.length;
        img.src = images[currentIdx];
      };

      const right = document.createElement("div");
      right.className = "image-nav right";
      right.innerText = ">";
      right.onclick = () => {
        currentIdx = (currentIdx + 1) % images.length;
        img.src = images[currentIdx];
      };

      const imgBox = document.createElement("div");
      imgBox.style.position = "relative";
      imgBox.appendChild(img);
      if (images.length > 1) {
        imgBox.appendChild(left);
        imgBox.appendChild(right);
      }

      const options = (p["選項"] || "").split(/[,，、]/).filter(o => o !== "無");
      const optionBtns = options.map(opt => {
        const btn = document.createElement("button");
        btn.innerText = opt;
        btn.onclick = () => {
          optionBtns.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        };
        return btn;
      });

      const quantity = document.createElement("div");
      quantity.className = "quantity-selector";
      const qtyInput = document.createElement("input");
      qtyInput.type = "text";
      qtyInput.value = 1;
      qtyInput.readOnly = true;
      const btnAdd = document.createElement("button");
      btnAdd.innerText = "+";
      btnAdd.onclick = () => {
        const stock = parseInt(p["庫存"] || 1);
        let val = parseInt(qtyInput.value);
        if (val < stock) qtyInput.value = val + 1;
      };
      const btnSub = document.createElement("button");
      btnSub.innerText = "-";
      btnSub.onclick = () => {
        let val = parseInt(qtyInput.value);
        if (val > 1) qtyInput.value = val - 1;
      };
      quantity.append(btnSub, qtyInput, btnAdd);

      const addBtn = document.createElement("button");
      addBtn.innerText = "🛒 加入購物車";
      addBtn.onclick = () => {
        const selectedOpt = optionBtns.find(b => b.classList.contains("active"));
        cart.push({
          name: p["商品名稱"],
          price: parseInt(p["價格"]),
          qty: parseInt(qtyInput.value),
          option: selectedOpt ? selectedOpt.innerText : "",
        });
        showToast("商品已加入購物車");
      };

      const info = document.createElement("div");
      info.className = "product-info";
      info.innerHTML = \`
        <h3>\${p["商品名稱"]}</h3>
        <div>💰 \$\${p["價格"]}</div>
        <div>🚚 \${p["販售狀態"]}（\${p["預計配達時間"]}）</div>
        <div>\${p["詳細資訊"]}</div>
      \`;
      const optBox = document.createElement("div");
      optBox.className = "option-buttons";
      optionBtns.forEach(btn => optBox.appendChild(btn));
      info.appendChild(optBox);
      info.innerHTML += \`<div>庫存：還剩 \${p["庫存"]} 件</div>\`;
      info.appendChild(quantity);
      info.appendChild(addBtn);

      div.appendChild(imgBox);
      div.appendChild(info);
      container.appendChild(div);
    });
  });
}

function toggleCart() {
  const modal = document.getElementById("cart-modal");
  modal.classList.toggle("hidden");
  renderCart();
}
function renderCart() {
  const container = document.getElementById("cart-items");
  container.innerHTML = "";
  let total = 0;
  let count = 0;
  cart.forEach((item, i) => {
    const row = document.createElement("div");
    row.innerHTML = \`
      <input type="checkbox" class="cart-check" data-idx="\${i}" onchange="renderCart()">
      \${item.name} \${item.option ? " - " + item.option : ""} x \${item.qty} = \$\${item.qty * item.price}
      <button onclick="removeFromCart(\${i})">刪除</button>
    \`;
    const checkbox = row.querySelector("input");
    if (checkbox.checked) {
      total += item.qty * item.price;
      count += item.qty;
    }
    container.appendChild(row);
  });
  document.getElementById("cart-total").innerText = "$" + total;
  document.getElementById("cart-count").innerText = count;
}
function removeFromCart(i) {
  cart.splice(i, 1);
  renderCart();
}
function closeCart() {
  document.getElementById("cart-modal").classList.add("hidden");
}
function checkout() {
  alert("尚未實作結帳流程");
}
function showToast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3000);
}

renderCategories();
