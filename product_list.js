document.addEventListener("DOMContentLoaded", () => {
  const subImageBlocks = document.querySelectorAll(".sub-image-block");

  function adjustSubImages() {
    subImageBlocks.forEach(block => {
      const images = block.querySelectorAll(".sub-image");
      const arrows = block.querySelectorAll(".sub-arrow");
      const blockWidth = block.clientWidth;
      const arrowWidth = arrows[0].offsetWidth + arrows[1].offsetWidth;
      const availableWidth = blockWidth - arrowWidth;
      const imageWidth = images[0].offsetWidth;
      const maxImages = Math.floor(availableWidth / imageWidth);

      // 顯示對應數量
      images.forEach((img, index) => {
        img.style.display = index < maxImages ? "flex" : "none";
      });
    });
  }

  adjustSubImages();
  window.addEventListener("resize", adjustSubImages);
});
