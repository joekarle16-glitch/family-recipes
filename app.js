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

function photoFor(recipe) {
  return recipe.photo || "images/placeholder.svg";
}

function exampleBadge(recipe) {
  return recipe.example
    ? '<span class="example-ribbon">Example entry</span>'
    : "";
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
}

function cardHtml(r) {
  return (
    `<a class="card" href="recipe.html?id=${encodeURIComponent(r.id)}">` +
    `<span class="card-media">` +
    `<img src="${esc(photoFor(r))}" alt="${esc(r.title)}" loading="lazy">` +
    `<span class="view"><span>View recipe</span><span aria-hidden="true">&rarr;</span></span>` +
    `</span>` +
    `<div class="card-body">` +
    (r.category ? `<span class="card-tag">${esc(r.category)}</span>` : "") +
    `<h2>${esc(r.title)}</h2>` +
    (r.attribution ? `<p class="byline">From ${esc(r.attribution)}</p>` : "") +
    exampleBadge(r) +
    `</div></a>`
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
  const latest = recipes.slice(-3).reverse();
  grid.innerHTML = latest.map(cardHtml).join("");
  wireImageFallback(grid);
}

function initGrid(recipes) {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const search = document.getElementById("search");
  const chipsWrap = document.getElementById("categories");

  const categories = ["All"];
  recipes.forEach((r) => {
    if (r.category && !categories.includes(r.category)) categories.push(r.category);
  });

  let activeCategory = "All";
  let query = "";

  chipsWrap.innerHTML = categories
    .map(
      (c) =>
        `<button class="chip${c === "All" ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`
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

  function matches(r) {
    const inCategory = activeCategory === "All" || r.category === activeCategory;
    if (!inCategory) return false;
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
    grid.innerHTML = list.map(cardHtml).join("");
    empty.hidden = list.length > 0;
    wireImageFallback(grid);
  }

  draw();
}

function renderDetail(recipes, root) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const recipe = recipes.find((r) => r.id === id);

  if (!recipe) {
    root.innerHTML =
      "<div class='recipe-head'><h1>Recipe not found</h1>" +
      "<p class='byline'>That recipe is not on the site yet. " +
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

  root.innerHTML =
    exampleBanner +
    `<div class="recipe-head">` +
    (recipe.category ? `<span class="card-tag">${esc(recipe.category)}</span>` : "") +
    `<h1>${esc(recipe.title)}</h1>` +
    (recipe.attribution ? `<p class="byline">From ${esc(recipe.attribution)}</p>` : "") +
    (recipe.description ? `<p class="desc lede">${esc(recipe.description)}</p>` : "") +
    `<p class="jump-row"><a class="btn" href="#recipe-body">Jump to recipe</a> <button type="button" class="btn outline" id="suggest-fix-btn">Suggest a correction</button></p>` +
    `</div>` +
    `<div class="read-aloud"><button type="button" class="btn" id="listen-btn" aria-pressed="false">Listen to this recipe</button></div>` +
    `<img class="recipe-photo" src="${esc(photoFor(recipe))}" alt="${esc(recipe.title)}">` +
    `<div class="meta-row">` +
    (recipe.servings ? `<div><span>Servings</span><strong>${esc(recipe.servings)}</strong></div>` : "") +
    (recipe.prepTime ? `<div><span>Prep</span><strong>${esc(recipe.prepTime)}</strong></div>` : "") +
    (recipe.cookTime ? `<div><span>Cook</span><strong>${esc(recipe.cookTime)}</strong></div>` : "") +
    `</div>` +
    (notes ? `<div class="note-box"><h3>A note on the original card</h3>${notes}</div>` : "") +
    `<div class="two-col" id="recipe-body">` +
    `<div><h2>Ingredients</h2><p class="cook-hint">Tap an ingredient to check it off as you go.</p><ul class="ingredients">${(recipe.ingredients || [])
      .map((i) => `<li><span>${esc(i)}</span></li>`)
      .join("")}</ul></div>` +
    `<div><h2>Steps</h2><p class="cook-hint">Tap a step to mark it done.</p><ol class="steps">${(recipe.steps || [])
      .map((s) => `<li><span class="step-text">${esc(s)}</span></li>`)
      .join("")}</ol></div>` +
    `</div>` +
    (recipe.sourceNote ? `<p class="source-note">${esc(recipe.sourceNote)}</p>` : "");

  injectRecipeSchema(recipe);

  root.querySelectorAll("ul.ingredients li, ol.steps li").forEach((li) => {
    li.addEventListener("click", () => li.classList.toggle("done"));
  });

  const photo = root.querySelector(".recipe-photo");
  photo.addEventListener("error", () => {
    if (!photo.dataset.fallback) {
      photo.dataset.fallback = "1";
      photo.src = "images/placeholder.svg";
    }
  });

  wireReadAloud(recipe);

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
    "<p>Fix whatever is off below, add your name, and hit <strong>Send suggestion</strong>. " +
    "It opens a short form with your edits filled in, you press submit there, and Joe or Jim will update the site. " +
    "Nothing on the page changes until they review it.</p></div>" +
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
      hint: "one per line",
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
