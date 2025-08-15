document.addEventListener("DOMContentLoaded", () => {
  const subBlocks = document.querySelectorAll(".sub-image-block");

  function adjustSubBlocks() {
    subBlocks.forEach(block => {
      const group = block.querySelector(".sub-group");
      const arrows = group.querySelectorAll(".sub-arrow");
      const images = Array.from(group.querySelectorAll(".sub-image"));

      const blockWidth = block.clientWidth;
      const arrowW = arrows[0].offsetWidth; // 單個箭頭寬
      const imageW = images[0].offsetWidth; // 單張圖片寬

      // 從3張圖片開始嘗試，如果空間不夠就減少
      let imgCount = 3;
      while (imgCount > 0 && (arrowW * 2 + imageW * imgCount) > blockWidth) {
        imgCount--;
      }

      // 顯示對應數量的圖片
      images.forEach((img, i) => {
        img.style.display = i < imgCount ? "flex" : "none";
      });

      // 計算顯示後的群組寬
      const groupWidth = arrowW * 2 + imageW * imgCount;
      const scale = blockWidth / groupWidth;

      // 套用等比例放大
      group.style.transform = `scale(${scale})`;
    });
  }

  adjustSubBlocks();
  window.addEventListener("resize", adjustSubBlocks);
});
