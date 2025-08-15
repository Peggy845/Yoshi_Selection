document.addEventListener("DOMContentLoaded", () => {
  const subBlocks = document.querySelectorAll(".sub-image-block");

  function adjustSubBlocks() {
    subBlocks.forEach(block => {
      const arrows = block.querySelectorAll(".sub-arrow");
      const images = Array.from(block.querySelectorAll(".sub-image"));

      const blockWidth = block.clientWidth;
      const arrowW = arrows[0].offsetWidth;
      const imageW = images[0].offsetWidth;

      // 嘗試從 3 張開始往下減
      let imgCount = 3;
      while (imgCount > 0 && (arrowW * 2 + imageW * imgCount) > blockWidth) {
        imgCount--;
      }

      // 顯示需要的圖片數量
      images.forEach((img, i) => {
        img.style.display = i < imgCount ? "flex" : "none";
      });

      // 計算總寬與縮放比例
      const groupWidth = arrowW * 2 + imageW * imgCount;
      const scale = blockWidth / groupWidth;

      // 套用等比例縮放
      block.style.transform = `scale(${scale})`;
      block.style.transformOrigin = "center center";
    });
  }

  adjustSubBlocks();
  window.addEventListener("resize", adjustSubBlocks);
});
