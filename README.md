# The Karle Family Kitchen

A permanent, family-owned recipe website. It is plain HTML, CSS, and JavaScript
with no backend and no build step, so GitHub Pages serves this folder exactly
as it is. The repository will live in Joe's own GitHub account
(`joekarle16-glitch`), which means the site does not depend on Muse or any
other service to keep existing.

Planned live site: https://joekarle16-glitch.github.io/family-recipes/
Planned repository: https://github.com/joekarle16-glitch/family-recipes

## Files

- `index.html` — home page with the recipe grid, search, and category filters.
- `recipe.html` — recipe detail template. It reads the recipe id from the URL
  (for example `recipe.html?id=example-sunday-tomato-sauce`) and renders it.
- `about.html` — what the site is for and how family members can contribute.
- `styles.css` — all styling. System font stacks only, no external requests.
- `app.js` — loads `recipes.json` and renders the grid and detail pages.
- `recipes.json` — every recipe on the site, in one file.
- `images/` — recipe photos. `placeholder.svg` is the stand-in shown until a
  real photo is added.

## Preview locally

Because `app.js` loads `recipes.json` with fetch, opening `index.html`
directly from disk may show an empty grid in some browsers. Preview with a
tiny local server instead:

```bash
cd site
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser.

## Recipe intake pipeline (photo submissions)

This is how new recipes flow onto the site once family members start
contributing. The pipeline is built around photos of handwritten recipe cards.

1. **Submit.** A family member fills in a Google Form (being built separately):
   dish name, who the recipe came from, and a photo upload of the handwritten
   recipe card. Responses, including the photos, land in Joe's Google Drive.
2. **Transcribe.** Zoru reads each submitted card photo (OCR plus a careful
   read) and structures it into one entry in `recipes.json` using the format
   below. Wording from the card is preserved as written, and the attribution
   (who the recipe came from) is kept on every entry.
3. **Flag, do not guess.** Anywhere the handwriting is uncertain, the entry
   gets a `handwritingNotes` item describing exactly what is unclear, instead
   of a guessed value. The site renders these notes in a visible callout on
   the recipe page.
4. **Photo.** The card photo (or a photo of the finished dish when one exists)
   is saved in `images/`, named after the recipe id, for example
   `images/sunday-tomato-sauce.jpg`.
5. **Publish.** One new JSON entry plus the photo, committed and pushed.
   GitHub Pages rebuilds the site automatically, usually within a minute or
   two.

Adding a processed recipe is deliberately trivial: one JSON object plus one
image file. No other files change, and nothing needs a rebuild.

## Recipe data format

Each entry in `recipes.json` supports these fields:

| Field | Required | What it is |
|---|---|---|
| `id` | yes | Unique slug, lowercase with dashes. Used in the detail page URL. |
| `title` | yes | Recipe name as it should appear. |
| `attribution` | yes | Who the recipe came from, for example "Jim Karle". |
| `category` | no | Grouping shown as a tag, for example "Mains", "Sides", "Desserts". |
| `description` | no | One or two sentences shown under the title. |
| `photo` | no | Path to the photo in `images/`. Falls back to the placeholder. |
| `servings` | no | For example "6 to 8". |
| `prepTime` | no | For example "20 minutes". |
| `cookTime` | no | For example "3 hours". |
| `ingredients` | yes | Array of strings, one per line, in the order used. |
| `steps` | yes | Array of strings, one per step, in order. |
| `handwritingNotes` | no | Array of `{ "ref", "note" }`. Use this whenever the original card is hard to read: say what is uncertain instead of guessing. |
| `sourceNote` | no | For example "Transcribed from a handwritten recipe card, October 2026." |
| `example` | no | Set to `true` only for the format example. Shows an "Example entry" banner. |

## Publishing status

- Scaffold: complete, in this folder.
- Repository: **not yet created.** The GitHub connector cannot create
  repositories under a personal account. The API call returned
  `403 Resource not accessible by integration` on `POST /user/repos`; this is
  a platform limitation of GitHub App tokens, not something a retry will fix.
- What Joe does (about one minute): go to github.com/new, name it
  `family-recipes`, choose Public, and create it empty (no README, license,
  or gitignore).
- After the repo exists: push this folder's contents to its `main` branch,
  then enable Pages in Settings, then Pages, then Deploy from a branch,
  `main`, folder `/ (root)`. The site goes live at the URL above.
- Note: the GitHub App must be installed on the new repository. If "only
  select repositories" was chosen during install, add `family-recipes` in the
  app's repository settings first.

Because the repository is owned by Joe's account and the site is static
files, it stays up with no running services and no dependence on Muse.
