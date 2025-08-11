/*  JavaScript 使網頁從靜態的文字和圖片，轉變為動態、互動的數位體驗 */

/* getElementById: 當要與網頁上的特定元素互動，需要一種方式來「選取」它。getElementById允許
直接通過 HTML 元素的 id 屬性來選取該元素 */

const sheetAPI = 'https://script.google.com/macros/s/AKfycbzR_kTmx5QdrHCMmoPCCYV6iXX_KFsphdmW-_-C0gudItIg1yflD6CyfUl1A4KwI6KIKw/exec';

/* categoryContainer = 選取頂層分類區塊 */
const categoryContainer = document.getElementById('main-category-container');

/* subCategoryContainer = 選取第二層分類選單容器 */
const subCategoryContainer = document.getElementById('sub-category-container');

/* subCategoryContainer = 頂層商品細分區塊 */
const productSections = document.getElementById('product-sections');

let currentExpanded = null;


/* fetch() : 會依照參數裡指定的url去取得資料 */
async function fetchData() 
{
  const res = await fetch(sheetAPI);
  const data = await res.json();
  return data;
}

/* *************************** 頂層分類區塊 ******************************** */
function createCategoryBlock(name, imgFile) 
{
  const block = document.createElement('div');
  block.className = 'category-block';

  const imgWrap = document.createElement('div');
  imgWrap.className = 'circle-image';
  const img = document.createElement('img');
  img.src = `images/${imgFile}`;
  img.alt = name;
  imgWrap.appendChild(img);

  const text = document.createElement('div');
  text.className = 'category-name';
  text.textContent = name;

  block.appendChild(imgWrap);
  block.appendChild(text);

  return block;
}

/* *************************** 關於我的設計 ******************************** */
/* display = 'block'，元素內容沒有填滿一整行，也不會和其他元素並排顯示*/
function showAboutMe()  
{
  document.getElementById('about-me').style.display = 'block';
}
function closeAboutMe() 
{
  document.getElementById('about-me').style.display = 'none';
}
window.onclick = (event) => 
{
  const modal = document.getElementById('about-me');
  if (event.target === modal) 
	  modal.style.display = 'none';
}

/* *************************** 第二層分類選單容器 ******************************** */
/* subCategoryContainer = 第二層分類選單容器*/
function createSubCategoryMenu(mainCat, subCategories) 
{	
  /* 用.innerHTML來新增html 標籤，要用單引號包住新增的內容(會先把原本的內容給清空之後，再插入新的值) */
  subCategoryContainer.innerHTML = '';
  const menu = document.createElement('div');
  const all = document.createElement('button');
  all.textContent = '全部';
  all.className = 'sub-category-button';
  
  /* appendChild: 將結果插入到父節點的最後一個位置 */
  menu.appendChild(all);
  subCategories.forEach(name => 
  {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.className = 'sub-category-button';
	
	/*  綁定點擊事件 */
	btn.addEventListener('click', () => 
	{
		goToProductList(mainCat, subCategories.name);
	});
    menu.appendChild(btn);
  });
  subCategoryContainer.appendChild(menu);
}

/* *************************** 頂層商品細分區塊 ******************************** */
function createProductSection(mainCat, subData) 
{
  const section = document.createElement('div');
  section.className = 'product-section';

  const title = document.createElement('h2');
  title.textContent = mainCat;
  section.appendChild(title);

  const blockContainer = document.createElement('div');
  blockContainer.className = 'sub-category-blocks';

  subData.forEach(({ subCat, subImg }) => 
  {
    const block = document.createElement('div');
    block.className = 'sub-category-block';
	
	/*  綁定點擊事件 */
    block.addEventListener('click', () => 
	{
        goToProductList(mainCat, subCat.name);
    });

    const img = document.createElement('img');
    img.src = `images/${subImg}`;
    img.alt = subCat;

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = subCat;

    block.appendChild(img);
    block.appendChild(name);
    blockContainer.appendChild(block);
  });

  section.appendChild(blockContainer);
  productSections.appendChild(section);
}

/* *************************** 圖片等等的加載 ******************************** */
window.onload = async () => 
{
  const { categoryImages } = await fetchData();

  const mainCats = [...new Set(categoryImages.map(row => row.mainCat))];

  mainCats.forEach(mainCat => 
  {
    const mainRow = categoryImages.find(row => row.mainCat === mainCat);
    const block = createCategoryBlock(mainCat, mainRow.mainImg);
    block.onclick = () => 
	{
      if (currentExpanded === mainCat) {
        subCategoryContainer.innerHTML = '';
        currentExpanded = null;
      } else {
        const subCats = categoryImages
          .filter(row => row.mainCat === mainCat && row.subCat)
          .map(row => row.subCat);
        createSubCategoryMenu(mainCat, subCats);
        currentExpanded = mainCat;
      }
    };
    categoryContainer.appendChild(block);

    const subData = categoryImages
      .filter(row => row.mainCat === mainCat && row.subCat)
      .map(row => ({ subCat: row.subCat, subImg: row.subImg }));
    createProductSection(mainCat, subData);
  });
};

// 跳轉到商品列表頁面
function goToProductList(mainCat, subCat) 
{
    const url = `product_list.html?main=${encodeURIComponent(mainCat)}&sub=${encodeURIComponent(subCat)}`;
    window.location.href = url;
}