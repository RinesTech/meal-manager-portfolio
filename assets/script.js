// ---------- Image loader: accepts .jpg, .jpeg, .png (and .webp), any letter case ----------
// Give it a path WITHOUT an extension (e.g. "assets/images/r001"); it tries each
// extension until one loads, remembers which ones work, and calls onFail if none do.
const IMG_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"];
const imgExtHits = {};
function loadImage(img, base, onFail) {
  const order = IMG_EXTS.slice().sort((a, b) => (imgExtHits[b] || 0) - (imgExtHits[a] || 0));
  let i = 0;
  const onErr = () => {
    i++;
    if (i < order.length) { img.src = base + order[i]; }
    else { img.removeEventListener("error", onErr); if (onFail) onFail(); }
  };
  img.addEventListener("error", onErr);
  img.addEventListener("load", () => { imgExtHits[order[i]] = (imgExtHits[order[i]] || 0) + 1; }, { once: true });
  img.src = base + order[0];
}

// Team photos on the About page: <img data-photo="assets/images/team/sierra">
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("img[data-photo]").forEach(img => {
    loadImage(img, img.dataset.photo, () => img.remove());
  });
});

// Mobile nav toggle
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.querySelector(".sidebarOpen");
  const closeBtn = document.querySelector(".sidebarClose");
  const links = document.querySelector(".nav-links");

  if (openBtn && links) openBtn.addEventListener("click", () => links.classList.add("open"));
  if (closeBtn && links) closeBtn.addEventListener("click", () => links.classList.remove("open"));

  document.addEventListener("click", (e) => {
    if (links && links.classList.contains("open")) {
      if (!links.contains(e.target) && e.target !== openBtn) {
        links.classList.remove("open");
      }
    }
  });
});
