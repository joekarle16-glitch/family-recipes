document.addEventListener("DOMContentLoaded", init);

async function init() {
  const recipes = await loadRecipes();
  initStats(recipes);
  if (document.getElementById("grid")) {
    initGrid(recipes);
  }
  if (document.getElementById("preview-grid")) {
    initPreview(recipes);
  }
  if (document.getElementById("coll-grid")) {
    initCollections(recipes);
  }
  const detail = document.getElementById("recipe-detail");
  if (detail) {
    renderDetail(recipes, detail);
  }
  const gallery = document.getElementById("family-gallery");
  if (gallery) {
    initGallery(gallery);
  }
  initCollage();
}

async function initCollage() {
  const bg = document.getElementById("collage-bg");
  if (!bg) return;
  let photos = [];
  try {
    const res = await fetch("family-photos.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      photos = Array.isArray(data.photos) ? data.photos : [];
    }
  } catch (err) {
    /* plain hero background until photos arrive */
  }
  if (!photos.length) {
    bg.style.display = "none";
    return;
  }
  // Hide the collage if the photo files are not actually reachable yet.
  const probe = new Image();
  probe.onerror = () => { bg.style.display = "none"; };
  probe.src = photos[0].src;
  bg.innerHTML = photos
    .map(
      (p, i) =>
        `<div class="ph${i === 0 ? " active" : ""}" role="img" aria-label="Family photo ${i + 1} of ${photos.length}"` +
        ` style="background-image:url('${esc(p.src)}')"></div>`
    )
    .join("");
  const frames = Array.from(bg.children);
  if (frames.length < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let current = 0;
  let timer = setInterval(next, 6000);
  function next() {
    frames[current].classList.remove("active");
    current = (current + 1) % frames.length;
    frames[current].classList.add("active");
  }
  const hero = bg.closest(".hero-collage");
  hero.addEventListener("mouseenter", () => clearInterval(timer));
  hero.addEventListener("mouseleave", () => {
    clearInterval(timer);
    timer = setInterval(next, 6000);
  });
}

async function initGallery(gallery) {
  try {
    const res = await fetch("family-photos.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const photos = Array.isArray(data.photos) ? data.photos : [];
    const emptyNote = document.getElementById("gallery-empty");
    if (emptyNote) emptyNote.hidden = photos.length > 0;
    gallery.innerHTML = photos
      .map(
        (p) =>
          `<figure><img src="${esc(p.src)}" alt="Family photo" loading="lazy"></figure>`
      )
      .join("");
  } catch (err) {
    /* gallery stays empty until photos arrive */
  }
}

async function loadRecipes() {
  try {
    const res = await fetch("recipes.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load recipes.json");
    const data = await res.json();
    collectionUpdated = typeof data.updated === "string" ? data.updated : "";
    return Array.isArray(data.recipes) ? data.recipes : [];
  } catch (err) {
    return [];
  }
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}

function photoFor(recipe) {
  return recipe.photo || "images/placeholder.svg";
}

function exampleBadge(recipe) {
  return recipe.example
    ? '<span class="example-ribbon">Example entry</span>'
    : "";
}

var collectionUpdated = "";

function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "–";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[parseInt(m[2], 10) - 1] + " " + parseInt(m[3], 10) + ", " + m[1];
}

function fmtMonth(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(iso || "");
  if (!m) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[parseInt(m[2], 10) - 1] + " " + m[1];
}

function provenanceText(r) {
  const when = r.added ? fmtMonth(r.added) : "";
  const dated = when ? "added " + when : "";
  if (r.source === "memory") {
    const from = r.attribution ? "From " + r.attribution + ", shared from memory" : "Shared from memory";
    return [from, dated].filter(Boolean).join(" · ");
  }
  const box = r.attribution ? "From " + r.attribution + "’s recipe box" : "";
  return [box, dated].filter(Boolean).join(" · ");
}

function initStats(recipes) {
  const statRecipes = document.getElementById("stat-recipes");
  if (statRecipes) statRecipes.textContent = recipes.length;
  const statCooks = document.getElementById("stat-cooks");
  if (statCooks) {
    statCooks.textContent = new Set(
      recipes.map((r) => r.attribution).filter(Boolean)
    ).size;
  }
  const statUpdated = document.getElementById("stat-updated");
  if (statUpdated) statUpdated.textContent = fmtDate(collectionUpdated);
}

function parseMinutes(s) {
  if (!s) return 0;
  let m = 0;
  const h = /(\d+)\s*hour/i.exec(s);
  if (h) m += parseInt(h[1], 10) * 60;
  const mi = /(\d+)\s*min/i.exec(s);
  if (mi) m += parseInt(mi[1], 10);
  return m;
}

function fmtMinutes(m) {
  if (!m) return "";
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? h + " hr " + rest + " min" : h + " hr";
}

function cardMeta(r) {
  const total = fmtMinutes(parseMinutes(r.prepTime) + parseMinutes(r.cookTime));
  const parts = [];
  if (total) parts.push(total);
  if (r.servings) parts.push("Serves " + r.servings);
  return parts.join(" · ");
}

var SAVE_KEY = "kk-saved-box";

function getSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

function isSaved(id) {
  return getSaved().indexOf(id) !== -1;
}

function toggleSave(id) {
  let saved = getSaved();
  const nowSaved = saved.indexOf(id) === -1;
  saved = nowSaved ? saved.concat([id]) : saved.filter((x) => x !== id);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch (e) {}
  document
    .querySelectorAll('[data-save="' + id + '"]')
    .forEach((b) => {
      b.classList.toggle("saved", nowSaved);
      b.setAttribute("aria-pressed", String(nowSaved));
    });
  window.dispatchEvent(new CustomEvent("kk-saved-changed"));
  return nowSaved;
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-save]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const nowSaved = toggleSave(btn.getAttribute("data-save"));
  showToast(nowSaved ? "Saved to your box." : "Removed from your box.");
});

document.addEventListener("click", (e) => {
  const cook = e.target.closest(".cookmode-btn");
  if (cook) {
    e.preventDefault();
    setCookMode(!document.body.classList.contains("cook-mode"));
    return;
  }
  const surprise = e.target.closest("[data-surprise]");
  if (surprise) {
    e.preventDefault();
    goSurprise();
  }
});

async function goSurprise() {
  const recipes = await loadRecipes();
  if (!recipes.length) return;
  const pick = recipes[Math.floor(Math.random() * recipes.length)];
  window.location.href = "recipe.html?id=" + encodeURIComponent(pick.id);
}

function heartSvg() {
  return (
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
  );
}

function cardHtml(r, num) {
  const saved = isSaved(r.id);
  const meta = cardMeta(r);
  return (
    `<article class="card">` +
    (num ? `<span class="card-num">No. ${num}</span>` : "") +
    `<button type="button" class="save-btn${saved ? " saved" : ""}" data-save="${esc(r.id)}" aria-pressed="${saved}" aria-label="Save ${esc(r.title)} to your box">${heartSvg()}</button>` +
    `<a class="card-link" href="recipe.html?id=${encodeURIComponent(r.id)}">` +
    `<span class="card-media">` +
    `<img src="${esc(photoFor(r))}" alt="${esc(r.title)}" loading="lazy">` +
    `<span class="view"><span>View recipe</span><span aria-hidden="true">&rarr;</span></span>` +
    `</span>` +
    `<div class="card-body">` +
    (r.category ? `<span class="card-eyebrow">${esc(r.category)}</span>` : "") +
    `<h2>${esc(r.title)}</h2>` +
    (meta ? `<p class="card-meta">${esc(meta)}</p>` : "") +
    (r.attribution ? `<p class="byline">From ${esc(r.attribution)}</p>` : "") +
    exampleBadge(r) +
    `</div></a></article>`
  );
}

function wireImageFallback(scope) {
  scope.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = "1";
        img.src = "images/placeholder.svg";
      }
    });
  });
}

function initPreview(recipes) {
  const grid = document.getElementById("preview-grid");
  grid.innerHTML = skeletonCards(3);
  const latest = recipes.slice(-3).reverse();
  grid.innerHTML = latest
    .map((r) => cardHtml(r, recipes.indexOf(r) + 1))
    .join("");
  wireImageFallback(grid);
}

const COLL_ICONS = {
  "Desserts":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21h14"/><path d="M7 21v-6.5L12 9l5 5.5V21"/><path d="M12 9V6"/><path d="M10.5 4.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 0 0-3 0"/></svg>',
  "Mains":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 19h18"/><path d="M5 19a7 7 0 0 1 14 0"/><path d="M12 12v-1.5"/><circle cx="12" cy="9" r="1"/></svg>',
  "Cocktails":
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16l-8 8z"/><path d="M12 13v6"/><path d="M8.5 19h7"/><path d="M16.5 7.5l1.8-1.8"/></svg>',
};

const COLL_ICON_DEFAULT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/></svg>';

function initCollections(recipes) {
  const wrap = document.getElementById("coll-grid");
  if (!wrap) return;
  const cats = [];
  recipes.forEach((r) => {
    if (r.category && !cats.includes(r.category)) cats.push(r.category);
  });
  wrap.innerHTML = cats
    .map((c) => {
      const n = recipes.filter((r) => r.category === c).length;
      const icon = COLL_ICONS[c] || COLL_ICON_DEFAULT;
      return (
        `<a class="coll-card" href="recipes.html?cat=${encodeURIComponent(c)}">` +
        `<span class="coll-icon">${icon}</span>` +
        `<span class="coll-text"><h3>${esc(c)}</h3><p>${n} recipe${n === 1 ? "" : "s"}</p></span>` +
        `<span class="coll-arrow" aria-hidden="true">&rarr;</span></a>`
      );
    })
    .join("");
}

function contributeCard() {
  return (
    `<article class="card contribute-card"><a href="add.html">` +
    `<span class="plus" aria-hidden="true">+</span>` +
    `<h2>Add a family recipe</h2>` +
    `<p>Have a card, a memory, or a fix? It takes a minute.</p>` +
    `</a></article>`
  );
}

function skeletonCards(n) {
  return Array.from({ length: n }, () =>
    `<div class="card skel" aria-hidden="true"><span class="skel-media"></span>` +
    `<div class="card-body"><span class="skel-line"></span><span class="skel-line short"></span></div></div>`
  ).join("");
}

function initGrid(recipes) {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const search = document.getElementById("search");
  const chipsWrap = document.getElementById("categories");
  const count = document.getElementById("result-count");

  grid.innerHTML = skeletonCards(6);

  const categories = ["All", "Saved"];
  const counts = {};
  recipes.forEach((r) => {
    if (r.category) {
      if (!categories.includes(r.category)) categories.push(r.category);
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
  });

  let activeCategory = "All";
  let query = "";

  const catParam = new URLSearchParams(window.location.search).get("cat");
  if (catParam && categories.includes(catParam)) activeCategory = catParam;

  function chipLabel(c) {
    if (c === "All") return `All (${recipes.length})`;
    if (c === "Saved") return "Saved";
    return `${c} (${counts[c] || 0})`;
  }

  chipsWrap.innerHTML = categories
    .map(
      (c) =>
        `<button class="chip${c === activeCategory ? " active" : ""}" data-cat="${esc(c)}">${esc(chipLabel(c))}</button>`
    )
    .join("");

  chipsWrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.cat;
      chipsWrap
        .querySelectorAll(".chip")
        .forEach((el) => el.classList.remove("active"));
      chip.classList.add("active");
      draw();
    });
  });

  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    draw();
  });

  window.addEventListener("kk-saved-changed", () => {
    if (activeCategory === "Saved") draw();
  });

  function matches(r) {
    if (activeCategory === "Saved") {
      if (!isSaved(r.id)) return false;
    } else if (activeCategory !== "All" && r.category !== activeCategory) {
      return false;
    }
    if (!query) return true;
    const hay = [
      r.title,
      r.description,
      r.attribution,
      (r.ingredients || []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  }

  function draw() {
    const list = recipes.filter(matches);
    grid.innerHTML =
      list.map((r) => cardHtml(r, recipes.indexOf(r) + 1)).join("") +
      (activeCategory === "Saved" || query ? "" : contributeCard());
    empty.hidden = list.length > 0;
    if (!list.length) {
      if (activeCategory === "Saved" && !query) {
        empty.innerHTML =
          "Your box is empty. Tap the heart on any recipe to save it here.";
      } else if (query) {
        empty.innerHTML =
          `Nothing called &ldquo;${esc(search.value.trim())}&rdquo; yet. ` +
          `<a href="add.html">Add it to the collection</a>.`;
      } else {
        empty.innerHTML = "Nothing here yet.";
      }
    }
    if (count) {
      count.textContent =
        query || activeCategory !== "All"
          ? `Showing ${list.length} of ${recipes.length} recipes`
          : `${recipes.length} family recipe${recipes.length === 1 ? "" : "s"}`;
    }
    wireImageFallback(grid);
  }

  draw();
}

function ingredientItem(i) {
  if (typeof i === "string" && i.indexOf("# ") === 0) {
    return `<li class="ing-group"><span>${esc(i.slice(2))}</span></li>`;
  }
  return `<li><span>${esc(i)}</span></li>`;
}

function relatedHtml(recipes, current) {
  const others = recipes.filter((r) => r.id !== current.id);
  const picks = others
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  if (!picks.length) return "";
  return (
    `<section class="related" aria-label="More recipes">` +
    `<h2>More from the Karle kitchen</h2>` +
    `<div class="grid">${picks
      .map((r) => cardHtml(r, recipes.indexOf(r) + 1))
      .join("")}</div></section>`
  );
}

var wakeLock = null;
var wakeLockListenerAdded = false;

function refreshCookButtons() {
  const on = document.body.classList.contains("cook-mode");
  document.querySelectorAll(".cookmode-btn").forEach((b) => {
    b.textContent = on ? "Cook mode: on" : "Start cook mode";
    b.setAttribute("aria-pressed", String(on));
  });
}

function setCookMode(on) {
  if (!("wakeLock" in navigator)) {
    showToast("Cook mode isn't available right now.");
    return;
  }
  if (on) {
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        wakeLock = lock;
        document.body.classList.add("cook-mode");
        refreshCookButtons();
        lock.addEventListener("release", () => {
          wakeLock = null;
        });
      })
      .catch(() => showToast("Cook mode isn't available right now."));
  } else {
    if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
    document.body.classList.remove("cook-mode");
    refreshCookButtons();
  }
  if (!wakeLockListenerAdded) {
    wakeLockListenerAdded = true;
    document.addEventListener("visibilitychange", () => {
      if (
        document.visibilityState === "visible" &&
        document.body.classList.contains("cook-mode") &&
        !wakeLock &&
        "wakeLock" in navigator
      ) {
        navigator.wakeLock
          .request("screen")
          .then((lock) => {
            wakeLock = lock;
            lock.addEventListener("release", () => {
              wakeLock = null;
            });
          })
          .catch(() => {});
      }
    });
  }
}

function renderDetail(recipes, root) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const recipe = recipes.find((r) => r.id === id);

  if (!recipe) {
    root.innerHTML =
      "<div class='recipe-head'><h1>Recipe not found</h1>" +
      "<p class='byline'>That recipe isn't here yet. " +
      "<a href='recipes.html'>Back to all recipes</a>.</p></div>";
    return;
  }

  document.title = recipe.title + " | The Karle Family Kitchen";

  const notes = (recipe.handwritingNotes || [])
    .map((n) => `<p><span class="ref">${esc(n.ref)}:</span> ${esc(n.note)}</p>`)
    .join("");

  const exampleBanner = recipe.example
    ? `<div class="note-box"><h3>Example entry</h3>` +
      `<p>This recipe shows the format every entry follows. It will be replaced with a real family recipe soon.</p></div>`
    : "";

  const cookNotes = (recipe.notes || [])
    .map((n) => `<li>${esc(n)}</li>`)
    .join("");

  const crumbs =
    `<p class="crumbs"><a href="recipes.html">Recipes</a>` +
    (recipe.category
      ? ` <span aria-hidden="true">/</span> <a href="recipes.html?cat=${encodeURIComponent(
          recipe.category
        )}">${esc(recipe.category)}</a>`
      : "") +
    ` <span aria-hidden="true">/</span> ${esc(recipe.title)}</p>`;

  const whyBox =
    recipe.whyItWorks && recipe.whyItWorks.length
      ? `<div class="why-box"><h3>Why it works</h3><ul>${recipe.whyItWorks
          .map((w) => `<li>${esc(w)}</li>`)
          .join("")}</ul></div>`
      : "";

  root.innerHTML =
    exampleBanner +
    `<div class="recipe-sticky" id="recipe-sticky"><span class="rs-title">${esc(
      recipe.title
    )}</span><span class="rs-links"><a href="#recipe-body">Ingredients</a><a href="#steps-anchor">Steps</a><button type="button" class="cookmode-btn rs-cook" aria-pressed="false">Start cook mode</button></span></div>` +
    `<div class="cookbar"><span class="cb-title">${esc(
      recipe.title
    )}</span><button type="button" class="btn cookmode-btn" aria-pressed="false">Start cook mode</button></div>` +
    crumbs +
    `<div class="recipe-head">` +
    (recipe.category
      ? `<span class="card-tag">${esc(recipe.category)}</span>`
      : "") +
    `<h1>${esc(recipe.title)}</h1>` +
    `<p class="provenance">${esc(provenanceText(recipe))}</p>` +
    (recipe.description
      ? `<p class="desc lede">${esc(recipe.description)}</p>`
      : "") +
    whyBox +
    `<p class="action-links"><button type="button" class="linklike" id="listen-btn" aria-pressed="false">Listen to this recipe</button><button type="button" class="linklike" id="share-btn">Share</button><button type="button" class="linklike" id="suggest-fix-btn">Suggest a correction</button><a href="#recipe-body">Jump to recipe</a></p>` +
    `</div>` +
    `<img class="recipe-photo" src="${esc(photoFor(recipe))}" alt="${esc(recipe.title)}">` +
    `<div class="meta-row">` +
    (recipe.servings ? `<div><span>Servings</span><strong>${esc(recipe.servings)}</strong></div>` : "") +
    (recipe.prepTime ? `<div><span>Prep</span><strong>${esc(recipe.prepTime)}</strong></div>` : "") +
    (recipe.cookTime ? `<div><span>Cook</span><strong>${esc(recipe.cookTime)}</strong></div>` : "") +
    `</div>` +
    (notes ? `<div class="note-box"><h3>A note on the original card</h3>${notes}</div>` : "") +
    `<div class="two-col" id="recipe-body">` +
    `<div><h2>Ingredients</h2><p class="cook-hint">Tap an ingredient to check it off as you go.</p><ul class="ingredients">${(recipe.ingredients || [])
      .map(ingredientItem)
      .join("")}</ul></div>` +
    `<div id="steps-anchor"><h2>Steps</h2><p class="step-progress" id="step-progress"></p><p class="cook-hint">Tap a step to mark it done.</p><ol class="steps">${(recipe.steps || [])
      .map((s) => `<li><span class="step-text">${esc(s)}</span></li>`)
      .join("")}</ol></div>` +
    `</div>` +
    (cookNotes ? `<div class="note-box cook-notes"><h3>Good to know</h3><ul>${cookNotes}</ul></div>` : "") +
    (recipe.sourceNote ? `<p class="source-note">${esc(recipe.sourceNote)}</p>` : "") +
    relatedHtml(recipes, recipe);

  injectRecipeSchema(recipe);

  function updateProgress() {
    const steps = root.querySelectorAll("ol.steps li");
    const done = root.querySelectorAll("ol.steps li.done").length;
    const el = document.getElementById("step-progress");
    if (el)
      el.textContent = done
        ? done + " of " + steps.length + " steps done"
        : steps.length + " steps";
  }

  root
    .querySelectorAll("ul.ingredients li:not(.ing-group), ol.steps li")
    .forEach((li) => {
      li.addEventListener("click", () => {
        li.classList.toggle("done");
        updateProgress();
      });
    });
  updateProgress();

  const photo = root.querySelector(".recipe-photo");
  photo.addEventListener("error", () => {
    if (!photo.dataset.fallback) {
      photo.dataset.fallback = "1";
      photo.src = "images/placeholder.svg";
    }
  });

  wireReadAloud(recipe);

  const shareBtn = document.getElementById("share-btn");
  if (shareBtn) shareBtn.addEventListener("click", () => shareRecipe(recipe));

  const sticky = document.getElementById("recipe-sticky");
  const head = root.querySelector(".recipe-head");
  if (sticky && head && "IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      const e = entries[0];
      sticky.classList.toggle(
        "visible",
        !e.isIntersecting && e.boundingClientRect.top < 0
      );
    }).observe(head);
  }

  wireImageFallback(root);

  wireCorrectionButton(recipe, function () {
    renderDetail(recipes, root);
  });
}

var CORRECTION_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSc-meB2QzDrGFQPYtYJx9MpTlFVy1rfYH-TnDdHHEnWXLkFtw/viewform";
var CORRECTION_ENTRIES = {
  name: "entry.34cca197",
  recipe: "entry.34da0302",
  title: "entry.4e370f51",
  description: "entry.36943bc6",
  servings: "entry.1f60776b",
  prep: "entry.7583f0d9",
  cook: "entry.10adea09",
  ingredients: "entry.065c720b",
  steps: "entry.4d9d1aa7",
};

function wireCorrectionButton(recipe, rerender) {
  var btn = document.getElementById("suggest-fix-btn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    renderEditMode(recipe, rerender);
  });
}

function editField(label, id, value, opts) {
  opts = opts || {};
  var control;
  if (opts.textarea) {
    control =
      '<textarea id="' + id + '" rows="' + opts.textarea + '">' + esc(value) + "</textarea>";
  } else {
    control =
      '<input id="' + id + '" type="text" value="' + esc(value) + '" autocomplete="off">';
  }
  return (
    '<label class="edit-field">' +
    "<span>" +
    esc(label) +
    (opts.hint ? " <em>" + esc(opts.hint) + "</em>" : "") +
    "</span>" +
    control +
    "</label>"
  );
}

function renderEditMode(recipe, rerender) {
  var root = document.getElementById("recipe-detail");
  if (!root) return;
  window.scrollTo({ top: 0, behavior: "smooth" });

  root.innerHTML =
    '<div class="note-box"><h3>Suggest a correction</h3>' +
    "<p>Fix what's off below, add your name, and hit <strong>Send suggestion</strong>. " +
    "It opens a short form with your edits filled in; submit there and we'll update the site. " +
    "Nothing changes until we've reviewed it.</p></div>" +
    '<div class="edit-form">' +
    editField("Your name", "edit-name", "", { hint: "so we know who to thank" }) +
    editField("Recipe title", "edit-title", recipe.title || "") +
    editField("Description", "edit-desc", recipe.description || "", { textarea: 3 }) +
    '<div class="edit-grid">' +
    editField("Servings", "edit-servings", recipe.servings || "") +
    editField("Prep time", "edit-prep", recipe.prepTime || "") +
    editField("Cook time", "edit-cook", recipe.cookTime || "") +
    "</div>" +
    editField("Ingredients", "edit-ingredients", (recipe.ingredients || []).join("\n"), {
      textarea: 8,
      hint: "one per line; start a line with # for a section header",
    }) +
    editField("Steps", "edit-steps", (recipe.steps || []).join("\n"), {
      textarea: 10,
      hint: "one per line",
    }) +
    '<div class="edit-actions">' +
    '<button type="button" class="btn" id="send-correction-btn">Send suggestion</button>' +
    '<button type="button" class="btn outline" id="cancel-correction-btn">Cancel</button>' +
    "</div></div>";

  document
    .getElementById("cancel-correction-btn")
    .addEventListener("click", rerender);
  document
    .getElementById("send-correction-btn")
    .addEventListener("click", function () {
      sendCorrection(recipe);
    });
}

function editVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function sendCorrection(recipe) {
  var parts = [
    [CORRECTION_ENTRIES.recipe, recipe.title || ""],
    [CORRECTION_ENTRIES.title, editVal("edit-title")],
    [CORRECTION_ENTRIES.description, editVal("edit-desc")],
    [CORRECTION_ENTRIES.servings, editVal("edit-servings")],
    [CORRECTION_ENTRIES.prep, editVal("edit-prep")],
    [CORRECTION_ENTRIES.cook, editVal("edit-cook")],
    [CORRECTION_ENTRIES.ingredients, editVal("edit-ingredients")],
    [CORRECTION_ENTRIES.steps, editVal("edit-steps")],
    [CORRECTION_ENTRIES.name, editVal("edit-name")],
  ];
  var query = parts
    .filter(function (p) {
      return p[1];
    })
    .map(function (p) {
      return p[0] + "=" + encodeURIComponent(p[1]);
    })
    .join("&");
  window.open(CORRECTION_FORM_URL + "?" + query, "_blank", "noopener");
}

function injectRecipeSchema(recipe) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description || undefined,
    author: recipe.attribution
      ? { "@type": "Person", name: recipe.attribution }
      : undefined,
    recipeIngredient: recipe.ingredients || [],
    recipeInstructions: (recipe.steps || []).map((s) => ({
      "@type": "HowToStep",
      text: s,
    })),
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "recipe-schema";
  script.textContent = JSON.stringify(schema);
  const old = document.getElementById("recipe-schema");
  if (old) old.remove();
  document.head.appendChild(script);
}

function shareRecipe(recipe) {
  const url = window.location.href;
  const title = recipe.title + " | The Karle Family Kitchen";
  const text =
    recipe.title +
    (recipe.attribution ? " from " + recipe.attribution : "") +
    " (The Karle Family Kitchen) " +
    url;
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
    return;
  }
  const fallback = text + " " + url;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(fallback)
      .then(() => showToast("Link copied. Paste it anywhere."))
      .catch(() => showToast("Copy this link: " + url));
  } else {
    showToast("Copy this link: " + url);
  }
}

function showToast(message) {
  const old = document.querySelector(".share-toast");
  if (old) old.remove();
  const toast = document.createElement("div");
  toast.className = "share-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function pickReadAloudVoice() {
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang || ""));
    const pool = en.length ? en : voices;
    const natural =
      pool.find((v) => /natural|enhanced|premium|neural/i.test(v.name || "")) || null;
    if (natural) return natural;
    return pool.find((v) => /^en-US/i.test(v.lang || "")) || pool[0] || null;
  } catch (e) {
    return null;
  }
}

function wireReadAloud(recipe) {
  const btn = document.getElementById("listen-btn");
  if (!btn) return;
  if (!("speechSynthesis" in window)) {
    btn.remove();
    return;
  }

  const chunks = [];
  const head = [
    recipe.title + ".",
    recipe.attribution ? "From " + recipe.attribution + "." : "",
    recipe.description || "",
  ]
    .filter(Boolean)
    .join(" ");
  if (head) chunks.push(head);
  const ingredients = recipe.ingredients || [];
  if (ingredients.length) chunks.push("Ingredients. " + ingredients.join(". ") + ".");
  (recipe.steps || []).forEach((s, i) => {
    chunks.push("Step " + (i + 1) + ". " + s);
  });

  let speaking = false;
  function stop() {
    window.speechSynthesis.cancel();
    speaking = false;
    btn.textContent = "Listen to this recipe";
    btn.setAttribute("aria-pressed", "false");
  }
  btn.addEventListener("click", () => {
    if (speaking) {
      stop();
      return;
    }
    window.speechSynthesis.cancel();
    const voice = pickReadAloudVoice();
    chunks.forEach((text, i) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      if (voice) utterance.voice = voice;
      if (i === chunks.length - 1) {
        utterance.onend = stop;
        utterance.onerror = stop;
      }
      window.speechSynthesis.speak(utterance);
    });
    speaking = true;
    btn.textContent = "Stop reading";
    btn.setAttribute("aria-pressed", "true");
  });
  window.addEventListener("beforeunload", () => window.speechSynthesis.cancel());
}
