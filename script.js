const API_URL = "https://script.google.com/macros/s/KfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec";

document.addEventListener("DOMContentLoaded", () => {
  const categoryContainer = document.getElementById("category-container");
  if (categoryContainer) {
    loadCategories();
  }
});

async function loadCategories() {
  const res = await fetch(API_URL + "?type=categories");
  const data = await res.json();

  const container = document.getElementById("category-container");
  if (!container) return;

  container.innerHTML = "";
  data.forEach(cat => {
    const div = document.createElement("div");
    div.className = "category-block";
    div.innerHTML = `<img src="${cat.mainImage}" alt="${cat.mainCat}" />
                     <p>${cat.mainCat}</p>`;
    div.onclick = () => showSubCategories(cat);
    container.appendChild(div);
  });
}

function showSubCategories(cat) {
  const subList = document.createElement("div");
  subList.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.innerText = "全部";
  allBtn.onclick = () => window.location.href = `product_list.html?main=${cat.mainCat}`;
  subList.appendChild(allBtn);

  cat.subCategories.forEach(sub => {
    const btn = document.createElement("button");
    btn.innerText = sub.subCat;
    btn.onclick = () => window.location.href = `product_list.html?main=${cat.mainCat}&sub=${sub.subCat}`;
    subList.appendChild(btn);
  });

  document.body.appendChild(subList);
}

async function loadProducts(mainCat, subCat) {
  const url = `${API_URL}?type=products&main=${encodeURIComponent(mainCat)}${subCat ? "&sub=" + encodeURIComponent(subCat) : ""}`;
  const res = await fetch(url);
  const products = await res.json();

  const list = document.getElementById("product-list");
  if (!list) return;
  list.innerHTML = "";

  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `<img src="${p.image}" width="100%" />
                      <h3>${p.name}</h3>
                      <p>價格：${p.price}</p>`;
    list.appendChild(card);
  });
}
