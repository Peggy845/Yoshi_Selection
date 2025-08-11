document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const data = await fetchData();
        createMainCategories(data);
    } catch (error) {
        console.error('初始化失敗:', error);
    }
}

async function fetchData() {
    const url = 'https://script.google.com/macros/s/KfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`);
    }
    const result = await response.json();

    // 如果 Apps Script 回傳格式是 { data: [...] }，取出 data
    if (Array.isArray(result)) {
        return result;
    } else if (result && Array.isArray(result.data)) {
        return result.data;
    } else {
        throw new Error('取得的資料格式錯誤');
    }
}

function createMainCategories(data) {
    const container = document.getElementById('main-category-container');
    if (!container) {
        console.warn('找不到 main-category-container');
        return;
    }

    data.forEach(item => {
        const block = document.createElement('div');
        block.className = 'main-category-block';

        const img = document.createElement('img');
        img.src = `images/${item.mainCategoryImg}`;
        img.alt = item.mainCategory;

        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = item.mainCategory;

        block.appendChild(img);
        block.appendChild(name);
        container.appendChild(block);

        // 監聽點擊，跳到商品列表
        block.addEventListener('click', () => {
            window.location.href = `product_list.html?main=${encodeURIComponent(item.mainCategory)}`;
        });
    });
}
