document.addEventListener("DOMContentLoaded", () => {
  // 以「載入當下」的視窗大小作為 100% 基準（僅做一次）
  const baseW = window.innerWidth;
  const baseH = window.innerHeight;
  document.documentElement.style.setProperty('--base-w', baseW + 'px');
  document.documentElement.style.setProperty('--base-h', baseH + 'px');

  // sub-image 群組的自適應顯示與等比例放大
  function adjustSubBlocks() {
    document.querySelectorAll(".sub-image-block").forEach(block => {
      const group = block.querySelector(".sub-group");
      if (!group) return;

      const arrows = group.querySelectorAll(".sub-arrow");
      const images = Array.from(group.querySelectorAll(".sub-image"));

      const blockWidth = block.clientWidth;
      const arrowW = arrows[0] ? arrows[0].offsetWidth : 0;
      const imgW = images[0] ? images[0].offsetWidth : 0;

      // 預設 3 張，不足則依序減為 2、1、0；箭頭永遠保留
      let imgCount = 3;
      while (imgCount > 0 && (arrowW * 2 + imgW * imgCount) > blockWidth) {
        imgCount--;
      }

      // 顯示對應數量的圖片
      images.forEach((img, i) => {
        img.style.display = i < imgCount ? "flex" : "none";
      });

      // 以等比縮放填滿可用寬度
      const groupWidth = arrowW * 2 + imgW * imgCount;
      const scale = groupWidth > 0 ? (blockWidth / groupWidth) : 1;
      group.style.transform = `scale(${scale})`;
    });
  }

  // 初始調整
  requestAnimationFrame(adjustSubBlocks);

  // 縮放瀏覽器時：回到左上角為錨點，並重算 sub-group
  window.addEventListener('resize', () => {
    window.scrollTo(0, 0);
    adjustSubBlocks();
  });
});
