// product_list.js
document.addEventListener("DOMContentLoaded", () => {
  // 1) 在載入時鎖定「當下視窗大小」為基準（只做一次）
  const baseW = window.innerWidth;
  const baseH = window.innerHeight;
  document.documentElement.style.setProperty('--base-w', baseW + 'px');
  document.documentElement.style.setProperty('--base-h', baseH + 'px');

  // 2) sub-image 群組的自適應邏輯（保留並整合）
  const subBlocks = document.querySelectorAll(".sub-image-block");
  function adjustSubBlocks() {
    subBlocks.forEach(block => {
      const group = block.querySelector(".sub-group");
      if (!group) return;

      const arrows = group.querySelectorAll(".sub-arrow");
      const images = Array.from(group.querySelectorAll(".sub-image"));

      // blockWidth 基於已鎖定的寬度（px），不受之後視窗縮小改變
      const blockWidth = block.clientWidth;
      const arrowW = arrows[0] ? arrows[0].offsetWidth : 0;
      const imgW = images[0] ? images[0].offsetWidth : 0;

      // 從 3 張開始嘗試，若不夠寬就減少圖片數
      let imgCount = 3;
      while (imgCount > 0 && (arrowW * 2 + imgW * imgCount) > blockWidth) {
        imgCount--;
      }

      // 控制顯示數量
      images.forEach((img, i) => {
        img.style.display = i < imgCount ? "flex" : "none";
      });

      // 計算群組未縮放時的寬度，並等比例放大到填滿可用寬度
      const groupWidth = arrowW * 2 + imgW * imgCount;
      const scale = groupWidth > 0 ? (blockWidth / groupWidth) : 1;

      group.style.transform = `scale(${scale})`;
    });
  }

  // 等畫面渲染完再做一次（確保 offsetWidth 正確）
  requestAnimationFrame(() => {
    adjustSubBlocks();

    // 3) 把 product-list 的左上設定為錨點：在使用者調整視窗大小時，保持左上角可見
    const productList = document.querySelector('.product-list');
    if (productList) {
      // 初始保持在左上
      productList.scrollLeft = 0;
      productList.scrollTop = 0;

      // 當視窗大小改變時，維持左上為錨點（不把內容居中或自動偏移）
      window.addEventListener('resize', () => {
        // 維持左上角為可見區
        productList.scrollLeft = 0;
        productList.scrollTop = 0;
        // 但仍重新調整 sub-group 的顯示（若需要）
        adjustSubBlocks();
      });
    }
  });
});
