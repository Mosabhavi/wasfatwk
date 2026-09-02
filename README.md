# وصفات — WasfatwK

Arabic-first (RTL) static site that collects the xBloom coffee recipes posted on TikTok by **@wasfatwk**. No build step, no framework, no backend — one JSON file drives everything.

```
wasfatwk/
├── index.html            ← the whole site (home, recipe pages, about) — hash-routed
├── data/recipes.json     ← ★ THE ONLY FILE YOU EDIT TO ADD RECIPES ★
├── assets/
│   ├── style.css         ← design (palette, rug texture, cards)
│   ├── app.js            ← loads recipes.json, filters, routing, share button
│   ├── favicon.svg
│   └── img/              ← put recipe photos / logo here (create when needed)
├── admin/index.html      ← no-code admin panel for the owner (GitHub-backed)
└── tools/build-preview.py← optional: bundles everything into one preview.html
```

---

## Adding a new recipe — the owner's workflow (no code)

The owner uses **`/admin/`** on the live site (e.g. `https://<user>.github.io/wasfatwk/admin/`). It is a phone-friendly Arabic panel that talks to the GitHub repo directly:

* **＋ وصفة جديدة** → fill a plain form (name, xBloom link, hot/cold, description, tags, photo) → **حفظ ونشر**. The site updates itself within about a minute.
* **تعديل / حذف / ↑ ↓** on every recipe for editing, deleting and reordering.
* Photos picked from the phone gallery are uploaded to `assets/img/` automatically.

The panel is not linked from the public site and is `noindex`. Anyone who opens it without a token sees only the login screen and cannot change anything.

### One-time setup (you do this once, ~5 minutes)

1. Push this folder to a GitHub repo and enable GitHub Pages (below).
2. In `admin/index.html`, fill the `SITE` constant near the top of the script:
   `const SITE = { owner: '<github-user>', repo: '<repo-name>', branch: 'main' };`
   With this set, the owner's login screen shows only one field: the token.
3. Create a token for him: GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token.
   * Repository access: *Only select repositories* → this repo.
   * Permissions → Repository permissions → **Contents: Read and write**. Nothing else.
   * Expiration: set 1 year (GitHub's max for fine-grained tokens); note the date, he pastes a new one when it expires.
4. Send him the admin URL and the token (`github_pat_…`). He pastes it once; it is remembered on that device. The **خروج** button forgets it.

If you would rather keep him off GitHub entirely, create the token on *your* account with access to the repo only — same effect.

### Editing the JSON by hand (developer path)

`data/recipes.json` is still the single source of truth and can be edited directly:

```json
{
  "id": "recipe-09",
  "title_ar": "وصفة الجيشا الباردة",
  "temperature": "باردة",
  "character": ["فاكهية", "عطرية"],
  "body": "خفيف",
  "flavor_profile": ["فاكهية", "قوام خفيف", "إيحاءات زهرية"],
  "description_ar": "وصفة خفيفة تبرز الإيحاءات الزهرية",
  "best_for": "الجيشا والمحاصيل العطرية",
  "servings": 1,
  "source_url": "https://share-h5.xbloom.com/?id=...",
  "tiktok_url": null,
  "image": null,
  "order": 9
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique, lowercase, English letters/digits/dashes. Used in the URL: `#/recipe/recipe-09`. The admin panel generates these. |
| `title_ar` | yes | Card and page title. |
| `temperature` | yes | Exactly `حارة` or `باردة` (drives the badge colour and the نوع الكوب filter). |
| `character` | yes (may be `[]`) | Filter values for **الطابع**. Any new value appears in the filter automatically. Standard: `فاكهية` `متوازنة` `عطرية` `حموضة` `شوكولاتية`. |
| `body` | no | Filter value for **القوام**: `خفيف`, `متوسط`, `عالي`, or `null`. |
| `flavor_profile` | yes | Free-text tags shown on the card exactly as written on TikTok. |
| `description_ar` | yes | The one-line description. |
| `best_for` | no | Shown in the "تنفع لـ" box; `null` shows a generic line. |
| `servings` | no | Defaults to 1. `2` shows a "٢ كوب" badge. |
| `source_url` | yes | xBloom share link → "شاهد خطوات التحضير". |
| `tiktok_url` | no | Adds a "شاهد الفيديو" button on the detail page. |
| `image` | no | Path relative to `index.html`, e.g. `assets/img/recipe-09.jpg` (16:9 looks best). `null` shows a styled placeholder. |
| `order` | yes | Sort order on the home page, ascending. |

**Validate before pushing**: `python3 -c "import json;json.load(open('data/recipes.json'))"`.

---

## Adding the logo

Save it as `assets/logo.png` (or `.svg`) and in `index.html` replace

```html
<span class="brand-mark" aria-hidden="true">☕</span>
```

with

```html
<img class="brand-mark" src="assets/logo.png" alt="وصفات">
```

`.brand-mark` is already sized 40×40 with rounded corners. Do the same for the `.avatar` in `assets/app.js` (`renderAbout`) if you want it on the about page.

---

## Running locally

Browsers block `fetch()` of local files, so run any static server from the project folder:

```bash
python3 -m http.server 8000     # then open http://localhost:8000
# or
npx serve .
```

(The admin panel only works on the deployed site, since it needs the GitHub repo.)

---

## Deploying (static hosts)

* **GitHub Pages**: push the folder to a repo → Settings → Pages → deploy from `main` / root. URL: `https://<user>.github.io/<repo>/`. Every push republishes.
* **Netlify / Vercel / Cloudflare Pages**: import the repo, no build command, publish directory `.` (root). Or drag-and-drop the folder onto Netlify Drop.
* Custom domain works on all of them; the site has no server-side routing needs because pages are hash-routed (`#/recipe/...`), so no redirect rules are required.

---

## Design notes

* Font: Tajawal (Google Fonts). Fallbacks: IBM Plex Sans Arabic → system.
* Palette lives in `:root` at the top of `style.css` (espresso, cream, gold, terracotta, green). Change one variable to retheme.
* The rug texture is an inline SVG in `body::before` at 16% opacity; adjust `opacity` there to make it stronger/fainter.
* Hot recipes use terracotta, cold use green, everywhere (badges, filter chips, placeholders).
* Social links: TikTok and Instagram are both `@wasfatwk` — header, the "تابعني" aside on the home page, the about page and the footer. URLs are constants at the top of `assets/app.js` and in `index.html`.
