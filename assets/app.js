/* =========================================================
   وصفات — WasfatwK  |  App logic
   ---------------------------------------------------------
   - Loads recipes from data/recipes.json (single source of truth)
   - Hash routing (works on any static host, no server rewrites):
       #/                 → home (hero + filters + grid)
       #/recipe/<id>      → recipe detail
       #/about            → about the account
   - No dependencies, no build step.
   ========================================================= */
(function () {
  'use strict';

  const DATA_URL = 'data/recipes.json';
  const TIKTOK_URL = 'https://www.tiktok.com/@wasfatwk';
  const INSTA_URL = 'https://www.instagram.com/wasfatwk';

  /** Reusable "follow me" block (home aside + about page) */
  const followHtml = (compact = false) => `
    <aside class="follow ${compact ? 'compact' : ''}" aria-label="تابعني">
      <div class="follow-head">
        <span class="follow-avatar" aria-hidden="true">☕</span>
        <div><b>@wasfatwk</b><span class="muted">وصفات جديدة كل أسبوع</span></div>
      </div>
      <a class="btn btn-tiktok" href="${TIKTOK_URL}" target="_blank" rel="noopener">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 3c.4 2.4 2 4 4.5 4.2v3.1c-1.7 0-3.2-.5-4.5-1.4v6.6c0 3.4-2.7 5.5-5.6 5.5C8 21 5.5 18.8 5.5 15.6c0-3.3 2.8-5.6 6.1-5.3v3.2c-1.6-.3-3 .7-3 2.1 0 1.3 1 2.3 2.3 2.3 1.4 0 2.4-1 2.4-2.6V3h3.2z"/></svg>
        تابعني على تيك توك
      </a>
      <a class="btn btn-insta" href="${INSTA_URL}" target="_blank" rel="noopener">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm5.1-8.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM12 2c-2.7 0-3 0-4.1.1-1.1 0-1.8.2-2.4.5-.7.2-1.2.6-1.8 1.1-.5.6-.9 1.1-1.1 1.8-.3.6-.5 1.3-.5 2.4C2 9 2 9.3 2 12s0 3 .1 4.1c0 1.1.2 1.8.5 2.4.2.7.6 1.2 1.1 1.8.6.5 1.1.9 1.8 1.1.6.3 1.3.5 2.4.5C9 22 9.3 22 12 22s3 0 4.1-.1c1.1 0 1.8-.2 2.4-.5.7-.2 1.2-.6 1.8-1.1.5-.6.9-1.1 1.1-1.8.3-.6.5-1.3.5-2.4.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c0-1.1-.2-1.8-.5-2.4-.2-.7-.6-1.2-1.1-1.8-.6-.5-1.1-.9-1.8-1.1-.6-.3-1.3-.5-2.4-.5C15 2 14.7 2 12 2zm0 1.8c2.7 0 3 0 4 .1 1 0 1.5.2 1.9.3.5.2.8.4 1.1.8.4.3.6.6.8 1.1.1.4.3.9.3 1.9.1 1 .1 1.3.1 4s0 3-.1 4c0 1-.2 1.5-.3 1.9-.2.5-.4.8-.8 1.1-.3.4-.6.6-1.1.8-.4.1-.9.3-1.9.3-1 .1-1.3.1-4 .1s-3 0-4-.1c-1 0-1.5-.2-1.9-.3-.5-.2-.8-.4-1.1-.8-.4-.3-.6-.6-.8-1.1-.1-.4-.3-.9-.3-1.9-.1-1-.1-1.3-.1-4s0-3 .1-4c0-1 .2-1.5.3-1.9.2-.5.4-.8.8-1.1.3-.4.6-.6 1.1-.8.4-.1.9-.3 1.9-.3 1-.1 1.3-.1 4-.1z"/></svg>
        تابعني على إنستقرام
      </a>
    </aside>`;
  const SITE_NAME = 'وصفات — WasfatwK';

  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');

  /** All recipes, sorted by `order` (then id) */
  let RECIPES = [];

  /** Current filter state (kept while navigating between views) */
  const state = { q: '', temperature: null, character: null, body: null };

  /* ---------- Helpers ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isCold = (r) => r.temperature === 'باردة';
  const tempClass = (r) => (isCold(r) ? 'cold' : 'hot');
  const tempIcon = (r) => (isCold(r) ? '🧊' : '☕');
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function setNav(name) {
    document.querySelectorAll('.nav a[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
  }

  function setTitle(t) {
    document.title = t ? `${t} | ${SITE_NAME}` : `${SITE_NAME} | كل وصفات قهوة xBloom بمكان واحد`;
  }

  /* ---------- Data ---------- */
  async function loadRecipes() {
    // For the single-file preview build, data may be inlined as window.RECIPES_DATA
    if (window.RECIPES_DATA) return normalize(window.RECIPES_DATA);
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('تعذر تحميل ملف الوصفات');
    return normalize(await res.json());
  }

  /** Accepts either {recipes:[...]} or a bare array; fills defaults; sorts */
  function normalize(json) {
    const list = Array.isArray(json) ? json : (json.recipes || []);
    const seen = new Set();
    return list
      .filter((r) => r && r.id && r.title_ar)
      .map((r, i) => {
        // Guard against duplicate ids (edge case) — suffix so links still work
        let id = String(r.id);
        while (seen.has(id)) id = `${id}-${i}`;
        seen.add(id);
        return {
          ...r,
          id,
          character: Array.isArray(r.character) ? r.character : [],
          flavor_profile: Array.isArray(r.flavor_profile) ? r.flavor_profile : [],
          body: r.body || null,
          servings: Number(r.servings) || 1,
          order: Number.isFinite(Number(r.order)) ? Number(r.order) : 9999,
        };
      })
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }

  /* ---------- Filtering ---------- */
  function applyFilters() {
    const q = state.q.trim().toLowerCase();
    return RECIPES.filter((r) => {
      if (state.temperature && r.temperature !== state.temperature) return false;
      if (state.character && !r.character.includes(state.character)) return false;
      if (state.body && r.body !== state.body) return false;
      if (q) {
        const hay = [r.title_ar, r.description_ar, r.best_for, ...r.flavor_profile, ...r.character, r.body].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  /* ---------- Shared HTML bits ---------- */
  function tagsHtml(list) {
    return `<div class="tags">${list.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
  }

  function mediaHtml(r, cls) {
    const badge = `<span class="badge ${tempClass(r)}">${tempIcon(r)} ${esc(r.temperature)}</span>`;
    const cups = r.servings > 1 ? `<span class="badge cups">${r.servings} كوب</span>` : '';
    if (r.image) {
      return `<div class="${cls}">${badge}${cups}<img src="${esc(r.image)}" alt="${esc(r.title_ar)}" loading="lazy"></div>`;
    }
    return `<div class="${cls} placeholder ${tempClass(r)}">${badge}${cups}<span class="emoji" aria-hidden="true">${tempIcon(r)}</span></div>`;
  }

  function cardHtml(r) {
    return `
      <article class="card">
        <a href="#/recipe/${esc(r.id)}" aria-label="${esc(r.title_ar)}">${mediaHtml(r, 'card-media')}</a>
        <div class="card-body">
          <h3 class="card-title"><a href="#/recipe/${esc(r.id)}">${esc(r.title_ar)}</a></h3>
          <p class="card-desc">${esc(r.description_ar)}</p>
          ${tagsHtml(r.flavor_profile)}
          <div class="card-actions">
            <a class="btn btn-primary" href="#/recipe/${esc(r.id)}">التفاصيل</a>
            <a class="btn btn-outline" href="${esc(r.source_url)}" target="_blank" rel="noopener">خطوات التحضير</a>
          </div>
        </div>
      </article>`;
  }

  /* ---------- Views ---------- */
  function renderHome() {
    setNav('home');
    setTitle('');

    const characters = uniq(RECIPES.flatMap((r) => r.character));
    const bodies = uniq(RECIPES.map((r) => r.body));
    // Keep a sensible body order if the standard values are used
    const bodyOrder = ['خفيف', 'متوسط', 'عالي'];
    bodies.sort((a, b) => (bodyOrder.indexOf(a) + 1 || 99) - (bodyOrder.indexOf(b) + 1 || 99));

    const hot = RECIPES.filter((r) => !isCold(r)).length;
    const cold = RECIPES.length - hot;

    app.innerHTML = `
      <section class="hero">
        <p class="hero-kicker">وصفات xBloom من @wasfatwk</p>
        <h1>كل الوصفات بمكان واحد</h1>
        <p>بدل ما تدوّر بالفيديوهات أو ترسل بالخاص، هنا تلقى كل وصفات الاكسبلوم اللي أنزلها بتيك توك: حارة وباردة، لكل نوع محصول ومعالجة. اختر الوصفة، وافتح خطوات التحضير مباشرة.</p>
        <div class="hero-actions">
          <a class="btn btn-gold btn-lg" href="#recipes">تصفح الوصفات</a>
          <a class="btn btn-outline btn-lg" style="color:var(--cream);border-color:rgba(255,255,255,.5)" href="${TIKTOK_URL}" target="_blank" rel="noopener">تابعني على تيك توك</a>
        </div>
        <div class="hero-stats">
          <div><b>${RECIPES.length}</b><span>وصفة</span></div>
          <div><b>${hot}</b><span>حارة</span></div>
          <div><b>${cold}</b><span>باردة</span></div>
        </div>
      </section>

      <div class="home-layout">
      <div class="home-main">
      <section id="recipes" class="filters" aria-label="فلترة الوصفات">
        <div class="search-row">
          <input class="search" id="q" type="search" placeholder="ابحث: عسلية، إثيوبي، لاهوائي، كوبين…" value="${esc(state.q)}" aria-label="بحث">
        </div>
        <div class="filter-group" data-filter="temperature">
          <span class="filter-label">نوع الكوب</span>
          ${chip('temperature', null, 'الكل')}
          ${chip('temperature', 'حارة', '☕ حارة', 'hot')}
          ${chip('temperature', 'باردة', '🧊 باردة', 'cold')}
        </div>
        ${characters.length ? `
        <div class="filter-group" data-filter="character">
          <span class="filter-label">الطابع</span>
          ${chip('character', null, 'الكل')}
          ${characters.map((c) => chip('character', c, c)).join('')}
        </div>` : ''}
        ${bodies.length ? `
        <div class="filter-group" data-filter="body">
          <span class="filter-label">القوام</span>
          ${chip('body', null, 'الكل')}
          ${bodies.map((b) => chip('body', b, b)).join('')}
        </div>` : ''}
        <div class="filter-meta">
          <span id="count"></span>
          <button class="link-btn" id="reset" type="button">مسح الفلاتر</button>
        </div>
      </section>

      <section class="grid" id="grid" aria-label="الوصفات"></section>
      </div>
      ${followHtml()}
      </div>
    `;

    // Wire filters
    app.querySelectorAll('.chip').forEach((el) => {
      el.addEventListener('click', () => {
        const key = el.dataset.key;
        const val = el.dataset.val === '' ? null : el.dataset.val;
        state[key] = val;
        app.querySelectorAll(`.chip[data-key="${key}"]`).forEach((c) => c.classList.toggle('active', (c.dataset.val || null) === val));
        renderGrid();
      });
    });
    app.querySelector('#q').addEventListener('input', (e) => { state.q = e.target.value; renderGrid(); });
    app.querySelector('#reset').addEventListener('click', () => {
      state.q = ''; state.temperature = null; state.character = null; state.body = null;
      renderHome();
    });
    renderGrid();
  }

  function chip(key, val, label, extra = '') {
    const active = (state[key] || null) === val ? 'active' : '';
    return `<button type="button" class="chip ${active} ${extra}" data-key="${key}" data-val="${esc(val ?? '')}">${esc(label)}</button>`;
  }

  function renderGrid() {
    const grid = app.querySelector('#grid');
    const count = app.querySelector('#count');
    const list = applyFilters();
    count.textContent = list.length === RECIPES.length ? `${list.length} وصفة` : `${list.length} من ${RECIPES.length} وصفة`;
    grid.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : `<div class="empty" style="grid-column:1/-1"><strong>ما فيه وصفة تطابق الفلتر</strong>جرّب تغيّر الفلاتر أو امسحها.</div>`;
  }

  function renderRecipe(id) {
    const r = RECIPES.find((x) => x.id === id);
    if (!r) return renderNotFound();
    setNav('home');
    setTitle(r.title_ar);

    const related = RECIPES.filter((x) => x.id !== r.id && x.temperature === r.temperature).slice(0, 3);

    app.innerHTML = `
      <a class="back" href="#/">→ كل الوصفات</a>
      <article class="detail">
        ${mediaHtml(r, 'detail-media')}
        <div class="detail-body">
          <h1>${esc(r.title_ar)}</h1>
          <div class="detail-sub">
            <span class="pill ${tempClass(r)}">${tempIcon(r)} ${esc(r.temperature)}</span>
            ${r.servings > 1 ? `<span class="pill neutral">${r.servings} كوب</span>` : ''}
            ${r.body ? `<span class="pill neutral">قوام ${esc(r.body)}</span>` : ''}
          </div>
          <p class="detail-desc">${esc(r.description_ar)}</p>

          <div class="facts">
            <div class="fact">
              <div class="fact-label">الطابع والإيحاءات</div>
              ${tagsHtml(r.flavor_profile)}
            </div>
            <div class="fact">
              <div class="fact-label">تنفع لـ</div>
              <div class="fact-value">${esc(r.best_for || 'أغلب المحاصيل — جرّبها وشوف')}</div>
            </div>
          </div>

          <div class="detail-actions">
            <a class="btn btn-primary btn-lg" href="${esc(r.source_url)}" target="_blank" rel="noopener">شاهد خطوات التحضير على xBloom ↗</a>
            <button class="btn btn-gold btn-lg" id="share" type="button">شاركها</button>
            ${r.tiktok_url ? `<a class="btn btn-outline btn-lg" href="${esc(r.tiktok_url)}" target="_blank" rel="noopener">شاهد الفيديو على تيك توك</a>` : ''}
          </div>

          <p class="note">افتح رابط xBloom من جوالك وبيفتح لك الوصفة داخل تطبيق xBloom مباشرة مع كل الخطوات والنسب.</p>
        </div>
      </article>

      ${related.length ? `
      <section class="related">
        <h2>وصفات ${esc(r.temperature)} ثانية</h2>
        <div class="grid">${related.map(cardHtml).join('')}</div>
      </section>` : ''}
    `;

    app.querySelector('#share').addEventListener('click', () => shareRecipe(r));
    window.scrollTo({ top: 0 });
  }

  async function shareRecipe(r) {
    const url = location.href;
    const data = { title: r.title_ar, text: `${r.title_ar} — ${r.description_ar} (${SITE_NAME})`, url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
    } catch (e) { /* user cancelled — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(url);
      showToast('تم نسخ رابط الوصفة');
    } catch (e) {
      prompt('انسخ الرابط:', url);
    }
  }

  function renderAbout() {
    setNav('about');
    setTitle('الحساب');
    app.innerHTML = `
      <section class="about">
        <div class="avatar" aria-hidden="true">☕</div>
        <h1>وصفات — WasfatwK</h1>
        <a class="handle" href="${TIKTOK_URL}" target="_blank" rel="noopener">@wasfatwk</a>
        <p>حساب سعودي مهتم بالقهوة المختصة ووصفات جهاز xBloom. أنزل وصفات جديدة بشكل مستمر على تيك توك، وهذا الموقع يجمعها كلها بمكان واحد عشان توصل لها بسهولة بدل ما تدوّر بالفيديوهات أو ترسل بالخاص.</p>
        <p>عندك وصفة جربتها وطلعت حلوة؟ أو محصول ودك تعرف وش أنسب وصفة له؟ تواصل معي على تيك توك.</p>
        ${followHtml(true)}
        <a class="btn btn-outline btn-lg" href="#/">تصفح الوصفات</a>
      </section>`;
    window.scrollTo({ top: 0 });
  }

  function renderNotFound() {
    setTitle('غير موجودة');
    app.innerHTML = `<div class="empty"><strong>الوصفة غير موجودة</strong><a href="#/" class="link-btn">الرجوع لكل الوصفات</a></div>`;
  }

  /* ---------- Router ---------- */
  function route() {
    const hash = location.hash.replace(/^#\/?/, '');
    const [view, param] = hash.split('/');
    if (view === 'recipe' && param) return renderRecipe(decodeURIComponent(param));
    if (view === 'about') return renderAbout();
    if (view === 'recipes') { renderHome(); document.getElementById('recipes')?.scrollIntoView(); return; }
    renderHome();
  }

  /* ---------- Boot ---------- */
  loadRecipes()
    .then((list) => {
      RECIPES = list;
      window.addEventListener('hashchange', route);
      route();
    })
    .catch((err) => {
      console.error(err);
      app.innerHTML = `<div class="empty"><strong>تعذر تحميل الوصفات</strong>${esc(err.message)}<br><small class="muted">إذا تفتح الملف محلياً، شغّل خادم بسيط (انظر README).</small></div>`;
    });
})();
