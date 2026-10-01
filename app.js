document.addEventListener("DOMContentLoaded", init);

async function init() {
  const recipes = await loadRecipes();
  if (document.getElementById("grid")) {
    initHome(recipes);
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

function initHome(recipes) {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const search = document.getElementById("search");
  const chipsWrap = document.getElementById("categories");

  const statRecipes = document.getElementById("stat-recipes");
  if (statRecipes) statRecipes.textContent = recipes.length;
  const statCooks = document.getElementById("stat-cooks");
  if (statCooks) {
    statCooks.textContent = new Set(
      recipes.map((r) => r.attribution).filter(Boolean)
    ).size;
  }

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

  function draw() {
    const list = recipes.filter(matches);
    grid.innerHTML = list.map(cardHtml).join("");
    empty.hidden = list.length > 0;
    grid.querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => {
        if (!img.dataset.fallback) {
          img.dataset.fallback = "1";
          img.src = "images/placeholder.svg";
        }
      });
    });
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
      "<a href='index.html'>Back to all recipes</a>.</p></div>";
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
    `</div>` +
    `<div class="read-aloud"><button type="button" class="btn" id="listen-btn" aria-pressed="false">Listen to this recipe</button></div>` +
    `<img class="recipe-photo" src="${esc(photoFor(recipe))}" alt="${esc(recipe.title)}">` +
    `<div class="meta-row">` +
    (recipe.servings ? `<div><span>Servings</span><strong>${esc(recipe.servings)}</strong></div>` : "") +
    (recipe.prepTime ? `<div><span>Prep</span><strong>${esc(recipe.prepTime)}</strong></div>` : "") +
    (recipe.cookTime ? `<div><span>Cook</span><strong>${esc(recipe.cookTime)}</strong></div>` : "") +
    `</div>` +
    (notes ? `<div class="note-box"><h3>A note on the original card</h3>${notes}</div>` : "") +
    `<div class="two-col">` +
    `<div><h2>Ingredients</h2><ul class="ingredients">${(recipe.ingredients || [])
      .map((i) => `<li>${esc(i)}</li>`)
      .join("")}</ul></div>` +
    `<div><h2>Steps</h2><ol class="steps">${(recipe.steps || [])
      .map((s) => `<li>${esc(s)}</li>`)
      .join("")}</ol></div>` +
    `</div>` +
    (recipe.sourceNote ? `<p class="source-note">${esc(recipe.sourceNote)}</p>` : "");

  const photo = root.querySelector(".recipe-photo");
  photo.addEventListener("error", () => {
    if (!photo.dataset.fallback) {
      photo.dataset.fallback = "1";
      photo.src = "images/placeholder.svg";
    }
  });

  wireReadAloud(recipe);
}

function wireReadAloud(recipe) {
  const btn = document.getElementById("listen-btn");
  if (!btn) return;
  if (!("speechSynthesis" in window)) {
    btn.remove();
    return;
  }
  const text = [
    recipe.title + ".",
    recipe.attribution ? "From " + recipe.attribution + "." : "",
    recipe.description || "",
    "Ingredients. " + (recipe.ingredients || []).join(". "),
    "Steps. " +
      (recipe.steps || [])
        .map((s, i) => "Step " + (i + 1) + ". " + s)
        .join(" "),
  ]
    .filter(Boolean)
    .join(" ");

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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = stop;
    utterance.onerror = stop;
    window.speechSynthesis.speak(utterance);
    speaking = true;
    btn.textContent = "Stop reading";
    btn.setAttribute("aria-pressed", "true");
  });
  window.addEventListener("beforeunload", () => window.speechSynthesis.cancel());
}
