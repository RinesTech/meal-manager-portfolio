document.addEventListener("DOMContentLoaded", () => {
  const tabGroup = document.getElementById("tabGroup");
  const grid = document.getElementById("recipeGrid");
  const searchBox = document.getElementById("searchBox");
  const countEl = document.getElementById("resultsCount");
  const moreBtn = document.getElementById("moreBtn");
  const modalOverlay = document.getElementById("modalOverlay");
  const modalBody = document.getElementById("modalBody");

  const PAGE = 48;
  let activeCat = "all";
  let shown = PAGE;
  let lastFocus = null;

  // ---------- IMAGES ----------
  // Put photos in assets/images/ named after the recipe id (r001, r002, ...).
  // .jpg, .jpeg and .png (and .webp) all work, in any letter case.
  // To use a specific file for one recipe, add  image: "assets/images/whatever.png"  to it in recipes-data.js.
  const IMAGE_DIR = "assets/images/";

  // Shown automatically when a recipe has no photo yet (or the file is missing)
  const CAT_EMOJI = {
    "main-pork": "🥓",
    "main-beef": "🥩",
    "main-chicken": "🍗",
    "main-seafood": "🦐",
    "main-fish": "🐟",
    "side": "🥗",
    "appetizer": "🥟",
    "soup": "🍲",
    "dessert": "🍮",
    "beverage": "🥤"
  };

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const catLabel = (key) => (CATEGORIES.find(c => c.key === key) || {}).label || key;

  // "Beef Nilaga (Boiled Beef Soup Main)" -> main title + subtitle
  function splitTitle(t) {
    const m = t.match(/^(.*?)\s*\((.+)\)\s*$/);
    return m ? { main: m[1], sub: m[2] } : { main: t, sub: "" };
  }

  function placeholder(r, extraClass) {
    const ph = document.createElement("div");
    ph.className = "thumb placeholder " + extraClass;
    ph.setAttribute("role", "img");
    ph.setAttribute("aria-label", "No photo yet for " + splitTitle(r.title).main);
    ph.textContent = CAT_EMOJI[r.category] || "🍽️";
    return ph;
  }

  // Returns a .thumb element with the recipe photo; swaps itself for a placeholder if the file is missing
  function makeThumb(r, extraClass) {
    const wrap = document.createElement("div");
    wrap.className = "thumb " + extraClass;
    const img = document.createElement("img");
    img.alt = splitTitle(r.title).main;
    img.loading = "lazy";
    img.decoding = "async";
    const fail = () => wrap.replaceWith(placeholder(r, extraClass));
    if (r.image) {
      img.addEventListener("error", fail, { once: true });
      img.src = r.image;
    } else {
      loadImage(img, IMAGE_DIR + r.id, fail);
    }
    wrap.appendChild(img);
    return wrap;
  }

  function addTab(key, label, count) {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (key === "all" ? " active" : "");
    btn.dataset.cat = key;
    btn.innerHTML = `${esc(label)} <span class="tab-count">${count}</span>`;
    tabGroup.appendChild(btn);
  }
  addTab("all", "All", RECIPES.length);
  CATEGORIES.forEach(c => addTab(c.key, c.label, RECIPES.filter(r => r.category === c.key).length));

  tabGroup.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeCat = btn.dataset.cat;
    shown = PAGE;
    render();
  });

  searchBox.addEventListener("input", () => { shown = PAGE; render(); });
  moreBtn.addEventListener("click", () => { shown += PAGE; render(); });

  function filtered() {
    const q = searchBox.value.trim().toLowerCase();
    let list = RECIPES;
    if (activeCat !== "all") list = list.filter(r => r.category === activeCat);
    if (q) {
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.ingredients.some(i => i.toLowerCase().includes(q)));
    }
    return list;
  }

  function cardMeta(r) {
    const bits = [catLabel(r.category)];
    if (r.prep) bits.push("Prep " + r.prep);
    if (r.cook) bits.push("Cook " + r.cook);
    if (r.servings) bits.push("Serves " + r.servings);
    return bits.join(" · ");
  }

  function render() {
    const list = filtered();
    countEl.textContent = `${list.length} recipe${list.length === 1 ? "" : "s"}` +
      (searchBox.value.trim() ? " match your search" : "");
    grid.innerHTML = "";

    if (list.length === 0) {
      grid.innerHTML = `<div class="no-results">No recipes match that search. Try a dish name or an ingredient like "calamansi".</div>`;
      moreBtn.hidden = true;
      return;
    }

    list.slice(0, shown).forEach(r => {
      const t = splitTitle(r.title);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "recipe-card";
      card.appendChild(makeThumb(r, "card-thumb"));

      const body = document.createElement("div");
      body.className = "card-body";
      body.innerHTML = `
        <h3>${esc(t.main)}</h3>
        ${t.sub ? `<div class="sub">${esc(t.sub)}</div>` : ""}
        ${r.description ? `<p class="desc">${esc(r.description)}</p>` : ""}
        <div class="meta">${esc(cardMeta(r))}</div>`;
      card.appendChild(body);

      card.addEventListener("click", () => openModal(r, card));
      grid.appendChild(card);
    });

    moreBtn.hidden = list.length <= shown;
    if (!moreBtn.hidden) moreBtn.textContent = `Show more (${list.length - shown} left)`;
  }

  function openModal(r, trigger) {
    lastFocus = trigger;
    const t = splitTitle(r.title);
    const ings = r.ingredients.map(i =>
      i.startsWith("## ") ? `<li class="ing-head">${esc(i.slice(3))}</li>` : `<li>${esc(i)}</li>`).join("");
    modalBody.innerHTML = `
      <button class="modal-close" aria-label="Close recipe">&times;</button>
      <div id="modalThumbSlot"></div>
      <h2 id="modalTitle">${esc(t.main)}</h2>
      ${t.sub ? `<div class="sub">${esc(t.sub)}</div>` : ""}
      <div class="meta">${esc(cardMeta(r))}</div>
      ${r.description ? `<p class="modal-desc">${esc(r.description)}</p>` : ""}
      <h4>Ingredients</h4>
      <ul class="ing-list">${ings}</ul>
      <h4>Steps</h4>
      <ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
      ${r.note ? `<div class="note"><b>Nutritionist note:</b> ${esc(r.note)}</div>` : ""}`;
    modalBody.querySelector("#modalThumbSlot").replaceWith(makeThumb(r, "modal-thumb"));
    modalBody.scrollTop = 0;
    modalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
    const close = modalBody.querySelector(".modal-close");
    close.addEventListener("click", closeModal);
    close.focus();
  }

  function closeModal() {
    modalOverlay.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  render();
});
