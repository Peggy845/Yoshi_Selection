document.addEventListener("DOMContentLoaded", async () => {
  // ====================================================
  // 1. 動態生成商品 (可換成從 API / Excel 載入)
  // ====================================================
  async function loadProducts() {
    const productList = document.querySelector(".product-list");
	if (!productList) {
		console.error(".product-list 元素找不到！");
		return; // 停止後續動作
	}

    // 假資料，之後可改成 fetch 從後端取
    const products = [
      {
        name: "商品 A",
        price: "NT$1000",
        mainImage: "images/Yoshi_Selection_logo.jpg",
        subImages: ["images/Yoshi_Selection_logo.jpg", "images/Yoshi_Selection_logo.jpg", "images/Yoshi_Selection_logo.jpg"]
      },
      {
        name: "商品 B",
        price: "NT$2000",
        mainImage: "iimages/Yoshi_Selection_logo.jpg",
        subImages: ["images/Yoshi_Selection_logo.jpg", "images/Yoshi_Selection_logo.jpg"]
      }
    ];

    // 動態生成商品卡片
    products.forEach(p => {
      const item = document.createElement("div");
      item.className = "product-item";

      item.innerHTML = `
        <div class="product-image-block">
          <img src="${p.mainImage}" class="main-image" alt="${p.name}">
          <button class="magnifier-btn">🔍</button>
          <div class="magnifier-lens"></div>
        </div>
        <div class="sub-image-block">
          <div class="sub-group">
            <button class="sub-arrow left">◀</button>
            ${p.subImages.map(src => `<img src="${src}" class="sub-image">`).join("")}
            <button class="sub-arrow right">▶</button>
          </div>
        </div>
        <h3>${p.name}</h3>
        <p>${p.price}</p>
      `;
      productList.appendChild(item);
    });
  }

  // ====================================================
  // 2. 功能：sub-image 自適應 + 放大鏡
  // ====================================================
  function initInteractions() {
    // --- 記錄當前視窗大小 (baseW, baseH) ---
    const baseW = window.innerWidth;
    const baseH = window.innerHeight;
    document.documentElement.style.setProperty('--base-w', baseW + 'px');
    document.documentElement.style.setProperty('--base-h', baseH + 'px');

    // ===== sub-image 群組的自適應與等比填滿 =====
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

    // ===== 放大鏡（局部放大，正方形） =====
    const ZOOM = 2.5; // 放大倍率
    let activeBlock = null; // 目前啟用放大鏡的 .product-image-block

    document.querySelectorAll(".product-image-block").forEach(block => {
      const img = block.querySelector(".main-image");
      const btn = block.querySelector(".magnifier-btn");
      const lens = block.querySelector(".magnifier-lens");

      if (!img || !btn || !lens) return;

      // 動態依容器大小調整鏡片尺寸
      function fitLensSize() {
        const rect = block.getBoundingClientRect();
        const s = Math.round(Math.max(100, Math.min(220, Math.min(rect.width, rect.height) * 0.28)));
        lens.style.width = s + "px";
        lens.style.height = s + "px";
      }

      function getDisplayedImageRect() {
        const blockRect = block.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        return {
          left: imgRect.left - blockRect.left,
          top: imgRect.top - blockRect.top,
          width: imgRect.width,
          height: imgRect.height
        };
      }

      function setLensBackground(nx, ny) {
        const disp = getDisplayedImageRect();
        const lensRect = lens.getBoundingClientRect();
        const lensW = lensRect.width;
        const lensH = lensRect.height;

        const bgW = disp.width * ZOOM;
        const bgH = disp.height * ZOOM;
        lens.style.backgroundImage = `url("${img.src}")`;
        lens.style.backgroundSize = `${bgW}px ${bgH}px`;

        const focusX = nx * bgW;
        const focusY = ny * bgH;
        const bgPosX = -(focusX - lensW / 2);
        const bgPosY = -(focusY - lensH / 2);
        lens.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
      }

      function placeLens(x, y) {
        const lensW = lens.offsetWidth;
        const lensH = lens.offsetHeight;
        const blockW = block.clientWidth;
        const blockH = block.clientHeight;

        const clampedX = Math.max(0, Math.min(x - lensW / 2, blockW - lensW));
        const clampedY = Math.max(0, Math.min(y - lensH / 2, blockH - lensH));

        lens.style.left = clampedX + "px";
        lens.style.top = clampedY + "px";

        const disp = getDisplayedImageRect();
        const centerX = clampedX + lensW / 2;
        const centerY = clampedY + lensH / 2;
        const nx = Math.max(0, Math.min(1, (centerX - disp.left) / disp.width));
        const ny = Math.max(0, Math.min(1, (centerY - disp.top) / disp.height));
        setLensBackground(nx, ny);
      }

      function enableMagnifier() {
        fitLensSize();
        lens.style.display = "block";
        activeBlock = block;

        const rect = block.getBoundingClientRect();
        placeLens(rect.width / 2, rect.height / 2);

        block.addEventListener("mousemove", onMove);
        block.addEventListener("mouseleave", onLeave);
      }

      function disableMagnifier() {
        lens.style.display = "none";
        if (activeBlock === block) activeBlock = null;
        block.removeEventListener("mousemove", onMove);
        block.removeEventListener("mouseleave", onLeave);
      }

      function toggleMagnifier(e) {
        e.stopPropagation();
        if (lens.style.display === "block") {
          disableMagnifier();
        } else {
          if (activeBlock && activeBlock !== block) {
            const otherBtn = activeBlock.querySelector(".magnifier-btn");
            otherBtn && otherBtn.click();
          }
          enableMagnifier();
        }
      }

      function onMove(ev) {
        const blockRect = block.getBoundingClientRect();
        const x = ev.clientX - blockRect.left;
        const y = ev.clientY - blockRect.top;
        placeLens(x, y);
      }

      function onLeave() {
        // 離開主圖區塊後不自動關閉
      }

      btn.addEventListener("click", toggleMagnifier);

      document.addEventListener("click", (ev) => {
        if (!block.contains(ev.target)) {
          disableMagnifier();
        }
      });

      document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") disableMagnifier();
      });

      window.addEventListener("resize", () => {
        if (lens.style.display === "block") {
          fitLensSize();
          const rect = block.getBoundingClientRect();
          placeLens(rect.width / 2, rect.height / 2);
        }
      });
    });

    function initOrResize() {
      window.scrollTo(0, 0);
      adjustSubBlocks();
    }

    requestAnimationFrame(() => adjustSubBlocks());
    window.addEventListener('resize', initOrResize);
  }

  // ====================================================
  // 3. 執行：先載入商品，再套互動
  // ====================================================
  await loadProducts();
  initInteractions();
});
