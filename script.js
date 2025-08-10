// ====== IMPORTANT: 把下面的 URL 換成你部署後 Apps Script 的公開網址（doGet） ======
const SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';

let openedCategory = null; // 目前展開的頂層分類（名稱），點第二次會收合

async function loadCategories() {
  try {
    const res = await fetch(SHEET_API_URL);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();

    // data: { mainCategories: [{name,image},...], subcategories: { "<name>": [{name,image},...] } }
    const categorySection = document.getElementById('category-section');

    // 把 mainCategories 裡的每一個加到關於我後面（關於我已在 index.html）
    data.mainCategories.forEach(cat => {
      // 如果分頁名稱就是「關於我」，跳過（避免重複）
      if (!cat || cat.name === '關於我') return;

      const block = document.createElement('div');
      block.className = 'category-block';
      block.setAttribute('data-cat-name', cat.name);

      const imgDiv = document.createElement('div');
      imgDiv.className = 'category-image';
      const img = document.createElement('img');
      // 若沒有圖片檔名，放 placeholder 或空白（請確保 images/ 裡有 placeholder.png 可選）
      img.src = cat.image ? `images/${cat.image}` : `images/placeholder.png`;
      img.alt = cat.name;
      imgDiv.appendChild(img);

      const textDiv = document.createElement('div');
      textDiv.className = 'category-text';
      textDiv.textContent = cat.name;

      block.appendChild(imgDiv);
      block.appendChild(textDiv);

      block.addEventListener('click', () => {
        // 點擊同一個會 toggle 收合
        if (openedCategory === cat.name) {
          // 收合
          closeSubcategories();
          openedCategory = null;
        } else {
          // 展開這個
          showSubcategories(cat.name, data.subcategories && data.subcategories[cat.name] ? data.subcategories[cat.name] : []);
          openedCategory = cat.name;
        }
      });

      categorySection.appendChild(block);
    });
  } catch (err) {
    console.error('載入分類資料失敗：', err);
    // 可視化錯誤提示（開發時方便）
    const categorySection = document.getElementById('category-section');
    const errDiv = document.createElement('div');
    errDiv.style.color = 'red';
    errDiv.textContent = '無法讀取分類，請檢查 Apps Script 是否已部署並允許公開讀取（Console 會有錯誤訊息）。';
    categorySection.appendChild(errDiv);
  }
}

function showSubcategories(categoryName, subcats) {
  const sec = document.getElementById('subcategory-section');
  sec.innerHTML = ''; // 清掉舊的

  const title = document.createElement('h2');
  title.textContent = categoryName;
  sec.appendChild(title);

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexWrap = 'wrap';
  wrapper.style.alignItems = 'flex-start';
  wrapper.style.padding = '8px 0';

  // 第一個為全部（如果 subcats 沒有，仍建立一個全部）
  if (!subcats || subcats.length === 0) {
    subcats = [{ name: '全部', image: '' }];
  }

  subcats.forEach(sc => {
    const scBlock = document.createElement('div');
    scBlock.className = 'subcategory-block';

    const imgDiv = document.createElement('div');
    imgDiv.className = 'category-image';
    const img = document.createElement('img');
    img.src = sc.image ? `images/${sc.image}` : `images/placeholder.png`;
    img.alt = sc.name;
    imgDiv.appendChild(img);

    const textDiv = document.createElement('div');
    textDiv.className = 'category-text';
    textDiv.textContent = sc.name;

    scBlock.appendChild(imgDiv);
    scBlock.appendChild(textDiv);
    wrapper.appendChild(scBlock);
  });

  sec.appendChild(wrapper);
}

function closeSubcategories() {
  const sec = document.getElementById('subcategory-section');
  sec.innerHTML = '';
}

// about me modal
function openAboutMe() {
  const modal = document.getElementById('aboutMeModal');
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}

function closeAboutMe() {
  const modal = document.getElementById('aboutMeModal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
}

// 點擊 modal 背景關閉
window.addEventListener('click', (e) => {
  const modal = document.getElementById('aboutMeModal');
  if (e.target === modal) closeAboutMe();
});

function goToCart() {
  // 先導到一個簡單的 cart.html（你之後會做）
  window.location.href = 'cart.html';
}

/* 懸浮購物車位置更新
   我採取的邏輯：購物車使用 fixed，在 viewport 的右邊（right:20px），
   並且動態設定 bottom = 20% of viewport height（即視窗高度的 20%）
   這樣不論捲動，按鈕都會保持在視窗的對應位置，並且會在 resize/scroll 時修正。
*/
function updateCartButtonPosition() {
  const cartBtn = document.getElementById('cart-button');
  if (!cartBtn) return;
  const visibleH = window.innerHeight;
  cartBtn.style.bottom = Math.round(visibleH * 0.20) + 'px';
}

window.addEventListener('scroll', updateCartButtonPosition);
window.addEventListener('resize', updateCartButtonPosition);

window.addEventListener('load', () => {
  loadCategories();
  updateCartButtonPosition();
});
