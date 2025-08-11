document.addEventListener("DOMContentLoaded", () => {
    loadMainCategories();
});

const SCRIPT_URL = "https://script.google.com/macros/s/KfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec";

// 讀取頂層分類
async function loadMainCategories() {
    try {
        const res = await fetch(`${SCRIPT_URL}?action=getMainCategories`);
        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error("回傳資料不是陣列:", data);
            return;
        }

        createMainCategories(data);
    } catch (err) {
        console.error("讀取頂層分類錯誤:", err);
    }
}

// 建立首頁分類
function createMainCategories(data) {
    const container = document.getElementById("mainCategories");
    if (!container) {
        console.error("找不到 #mainCategories 容器");
        return;
    }

    container.innerHTML = ""; // 清空舊內容

    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "category-card";

        card.innerHTML = `
            <img src="https://drive.google.com/uc?id=${item.imageId}" alt="${item.name}">
            <p>${item.name}</p>
        `;

        card.addEventListener("click", () => {
            window.location.href = `product_list.html?category=${encodeURIComponent(item.name)}`;
        });

        container.appendChild(card);
    });
}

// 懸浮購物車跳轉
function goToCart() {
    window.location.href = "cart.html";
}
