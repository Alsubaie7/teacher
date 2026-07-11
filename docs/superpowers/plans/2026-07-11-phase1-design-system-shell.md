# المرحلة ١: نظام التصميم + القشرة — خطة التنفيذ

> **للمنفّذ الآلي:** SUB-SKILL مطلوبة: استخدم superpowers:subagent-driven-development (موصى به) أو superpowers:executing-plans لتنفيذ الخطة مهمة بمهمة. الخطوات تستخدم صيغة مربّعات (`- [ ]`) للتتبّع.

**الهدف:** استبدال الشريطين العلويين المزدحمين بشريط جانبي مبسّط (٤ عناصر) + تنقل سفلي للجوال + شريط علوي نظيف، وتحويل نظام الألوان من الأخضر إلى النيلي العصري بوضع فاتح افتراضي — دون كسر أي وظيفة أو صفحة موجودة.

**المعمارية:** المشروع vanilla JS (كائنات `Pages`/`Router`/`DB`/`DarkMode`…) + Supabase. نغيّر `index.html` (بنية القشرة) و`style.css` (متغيّرات التصميم + أنماط القشرة) وتعديلات محدودة في `app.js` (منطق التنقل + حراسة null). كل صفحات المحتوى تبقى تعمل بأنماطها الحالية (تُعاد كتابتها في مراحل لاحقة)، لكنها تكتسب الألوان النيلية تلقائياً عبر المتغيّرات.

**التقنية:** HTML/CSS/JS خام، متغيّرات CSS، Font Awesome، Tajawal.

**طريقة التحقق:** لا يوجد إطار اختبارات — التحقق **بصري في معاينة المتصفح**. تُحقن بيانات تجريبية لتجاوز مصادقة Supabase (سكربت في الخطوة أدناه)، ثم فحص لقطات الشاشة + console.

---

## هيكل الملفات

- `index.html` — استبدال كتلة القشرة (السطور ٧٨–١٨٠ تقريباً: `smart-topbar` + `sub-nav` + `app-body`) ببنية جديدة (sidebar + topbar + content + bottom-nav). تحديث `theme-color` و`style.css?v=`.
- `style.css` — استبدال كتلة `:root` (السطور ٦–٨٢) بمتغيّرات نيلية؛ استبدال كتلة `[data-theme="dark"]` للقشرة؛ استبدال أنماط `.smart-topbar`/`.sub-nav`/`.app-body`/`.st-*` بأنماط `.side-nav`/`.topbar`/`.bottom-nav` الجديدة.
- `app.js` — تحديث `Router.go` (فئة `.nav-link` بدل `.sub-nav-link`)؛ حراسة null في `FontSize.apply`؛ `CmdPalette._registry` مسار الاستيراد.
- `service-worker.js` — رفع رقم نسخة الكاش.

**ثوابت يجب الحفاظ عليها** (يعتمد عليها app.js): المعرّفات `content`, `st-time-ctx`, `live-class-badge`, `sb-name`, `sb-school`, `sb-email`, `dark-mode-btn`, `admin-nav-btn`, `admin-divider`, `admin-subnav-link`, `preview-banner`, `preview-banner-text`; الفئة `.st-avatar-wrap` مع `input[type=file]` بداخلها؛ معالجات: `Router.go`, `CmdPalette.open`, `DarkMode.toggle`, `AI.toggle`, `Backup.export/import`, `App.logout`, `Pages._exitPreview`, `Router.go('settings'/'admin')`.

---

## Task 1: متغيّرات التصميم النيلية (Tokens)

**Files:**
- Modify: `style.css:6-82` (كتلة `:root`)

- [ ] **Step 1: استبدال كتلة `:root` بالكامل**

استبدل السطور ٦–٨٢ (من `/* ===== VARIABLES ===== */` حتى نهاية `:root { … }`) بهذا:

```css
/* ===== VARIABLES — Indigo Modern Design System ===== */
:root {
  /* === Indigo (Primary) === */
  --primary:         #4f46e5;   /* indigo-600 */
  --primary-dark:    #4338ca;   /* indigo-700 */
  --primary-mid:     #6366f1;   /* indigo-500 */
  --primary-dim:     rgba(79,70,229,.10);
  --primary-light:   rgba(79,70,229,.07);
  --primary-glow:    rgba(79,70,229,.15);
  --primary-soft:    #eceafe;   /* indigo-50-ish */
  --gold:            #d97706;
  --gold-dim:        rgba(217,119,6,.10);
  --gold-glow:       rgba(217,119,6,.18);

  /* === Semantic Colors === */
  --green:           #16a34a;
  --green-light:     rgba(22,163,74,.10);
  --green-soft:      #e7f6ec;
  --orange:          #d97706;
  --orange-light:    rgba(217,119,6,.10);
  --orange-soft:     #fdf0dc;
  --red:             #dc2626;
  --red-light:       rgba(220,38,38,.10);
  --red-soft:        #fdeaea;
  --purple:          #7c3aed;
  --purple-light:    rgba(124,58,237,.10);
  --blue:            #2563eb;
  --blue-light:      rgba(37,99,235,.10);
  --teal:            #0ea5a3;

  /* === Surfaces === */
  --body-bg:         #f5f6fb;
  --surface:         #ffffff;
  --surface-2:       #f1f2f8;
  --surface-solid:   #ffffff;
  --surface-hover:   #f5f5fa;
  --surface-active:  rgba(79,70,229,.08);

  /* === Text === */
  --text-primary:    #1f2340;
  --text-secondary:  #4b4f6b;
  --text-muted:      #7a7f9e;
  --text-dim:        #a3a7bf;

  /* Gray aliases */
  --gray-50:  #f7f8fc; --gray-100: #f1f2f8; --gray-200: #e7e8f0;
  --gray-300: #d3d5e0; --gray-400: #a3a7bf; --gray-500: #7a7f9e;
  --gray-600: #4b4f6b; --gray-700: #363a55; --gray-800: #1f2340; --gray-900: #14172b;

  /* === Borders === */
  --border:          #e7e8f0;
  --border-subtle:   rgba(231,232,240,.6);
  --border-gold:     rgba(217,119,6,.22);

  /* === Layout === */
  --topbar-h:        64px;
  --sidebar-w:       238px;
  --radius:          11px;
  --radius-sm:       8px;
  --radius-lg:       14px;
  --radius-xl:       18px;

  /* === Shadows === */
  --shadow:          0 2px 8px rgba(31,35,64,.05), 0 1px 3px rgba(31,35,64,.04);
  --shadow-md:       0 8px 28px rgba(31,35,64,.07), 0 4px 12px rgba(31,35,64,.05);
  --shadow-lg:       0 20px 56px rgba(31,35,64,.10), 0 8px 24px rgba(31,35,64,.06);
  --glow-green:      0 0 20px rgba(22,163,74,.10);
  --glow-gold:       0 0 20px rgba(217,119,6,.12);

  --transition:      .18s cubic-bezier(.4,0,.2,1);
}
```

- [ ] **Step 2: تحقق بصري**

Run: شغّل `python3 -m http.server 8890` في جذر المشروع، افتح `http://localhost:8890/index.html` في معاينة المتصفح.
Expected: شاشة الدخول تظهر باللون النيلي (بدل الأخضر). (المحتوى الداخلي يُفحص في المهام التالية.)

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "🎨 تحويل نظام الألوان إلى النيلي العصري"
```

---

## Task 2: بنية القشرة الجديدة في index.html

**Files:**
- Modify: `index.html:79-180` (كتلة `<header class="smart-topbar">` + `<nav class="sub-nav">` + `<div class="app-body">`)

- [ ] **Step 1: استبدال القشرة**

استبدل من `<!-- Smart Topbar -->` (بعد `<div id="app" class="app hidden">`) حتى نهاية `</div>` الخاص بـ `app-body` (قبل `<!-- Command Palette -->`) بهذا:

```html
    <!-- Sidebar (right in RTL) -->
    <aside class="side-nav" id="side-nav">
      <div class="sn-brand" onclick="Router.go('dashboard')" title="الرئيسية">
        <div class="sn-logo"><i class="fas fa-chalkboard-teacher"></i></div>
        <span class="sn-brand-name">منصة المعلم</span>
      </div>
      <nav class="sn-links">
        <a class="nav-link active" data-page="dashboard" onclick="Router.go('dashboard')"><i class="fas fa-th-large"></i><span>الرئيسية</span></a>
        <a class="nav-link" data-page="classes"   onclick="Router.go('classes')"><i class="fas fa-door-open"></i><span>فصولي</span></a>
        <a class="nav-link" data-page="lessons"   onclick="Router.go('lessons')"><i class="fas fa-calendar-alt"></i><span>الجدول</span></a>
        <a class="nav-link" data-page="analytics" onclick="Router.go('analytics')"><i class="fas fa-chart-bar"></i><span>التحليلات</span></a>
      </nav>
      <div class="sn-foot">
        <a class="nav-link" data-page="settings" onclick="Router.go('settings')"><i class="fas fa-cog"></i><span>الإعدادات</span></a>
        <div class="st-avatar-wrap" id="st-avatar-wrap">
          <button class="sn-account" onclick="this.closest('.st-avatar-wrap').classList.toggle('open')">
            <span class="sn-account-avatar"><i class="fas fa-user-tie"></i></span>
            <span class="sn-account-info">
              <span class="sn-account-name" id="sb-name">—</span>
              <span class="sn-account-school" id="sb-school">—</span>
            </span>
            <i class="fas fa-chevron-up sn-account-caret"></i>
          </button>
          <div class="st-avatar-dropdown">
            <div class="st-avatar-info">
              <div class="st-avatar-email" id="sb-email">—</div>
            </div>
            <div class="st-avatar-divider"></div>
            <button class="st-avatar-action" onclick="Router.go('referrals');document.getElementById('st-avatar-wrap').classList.remove('open')">
              <i class="fas fa-file-medical-alt"></i> الإحالات
            </button>
            <button class="st-avatar-action" onclick="Backup.export();document.getElementById('st-avatar-wrap').classList.remove('open')">
              <i class="fas fa-download"></i> تصدير البيانات
            </button>
            <label class="st-avatar-action" style="cursor:pointer">
              <i class="fas fa-upload"></i> استيراد بيانات
              <input type="file" accept=".json" style="display:none" onchange="Backup.import(this)">
            </label>
            <div class="st-avatar-divider" id="admin-divider" style="display:none"></div>
            <button id="admin-nav-btn" class="st-avatar-action" style="display:none;color:var(--purple)"
              onclick="Router.go('admin');document.getElementById('st-avatar-wrap').classList.remove('open')">
              <i class="fas fa-shield-alt"></i> لوحة الإدارة
            </button>
            <div class="st-avatar-divider"></div>
            <button class="st-avatar-action danger" onclick="App.logout()">
              <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main wrap -->
    <div class="main-wrap">
      <header class="topbar" id="topbar">
        <div class="tb-context">
          <div id="st-time-ctx" class="st-time-ctx"></div>
          <div id="live-class-badge" class="hidden"></div>
        </div>
        <div class="tb-actions">
          <button class="cmd-trigger-btn" onclick="CmdPalette.open()" title="بحث سريع (Ctrl+K)">
            <i class="fas fa-search"></i>
            <span class="cmd-trigger-label">بحث سريع</span>
            <kbd class="cmd-trigger-kbd">⌘K</kbd>
          </button>
          <button id="dark-mode-btn" onclick="DarkMode.toggle()" class="tb-icon-btn" title="الوضع الليلي">
            <i class="fas fa-moon"></i>
          </button>
          <button id="ai-fab" onclick="AI.toggle()" class="tb-ai-btn" title="المساعد الذكي">
            <i class="fas fa-robot"></i>
          </button>
        </div>
      </header>

      <div class="app-body">
        <div id="preview-banner" class="preview-banner hidden">
          <i class="fas fa-eye"></i>
          <span id="preview-banner-text">وضع المعاينة</span>
          <button onclick="Pages._exitPreview()"><i class="fas fa-sign-out-alt"></i> خروج من المعاينة</button>
        </div>
        <main class="content" id="content"></main>
      </div>
    </div>

    <!-- Bottom nav (mobile) -->
    <nav class="bottom-nav" id="bottom-nav">
      <a class="nav-link active" data-page="dashboard" onclick="Router.go('dashboard')"><i class="fas fa-th-large"></i><span>الرئيسية</span></a>
      <a class="nav-link" data-page="classes"   onclick="Router.go('classes')"><i class="fas fa-door-open"></i><span>فصولي</span></a>
      <a class="nav-link" data-page="lessons"   onclick="Router.go('lessons')"><i class="fas fa-calendar-alt"></i><span>الجدول</span></a>
      <a class="nav-link" data-page="analytics" onclick="Router.go('analytics')"><i class="fas fa-chart-bar"></i><span>التحليلات</span></a>
      <button class="nav-link" onclick="CmdPalette.open()"><i class="fas fa-search"></i><span>بحث</span></button>
    </nav>
```

- [ ] **Step 2: تحديث theme-color ونسخة CSS**

في `index.html`، غيّر:
- `<meta name="theme-color" content="#006738">` → `<meta name="theme-color" content="#4f46e5">`
- `<link rel="stylesheet" href="style.css?v=12">` → `href="style.css?v=13"`
- `<script src="app.js?v=12"></script>` → `src="app.js?v=13"`

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "🏗️ استبدال القشرة: شريط جانبي + شريط علوي نظيف + تنقل سفلي"
```

---

## Task 3: أنماط القشرة الجديدة في style.css

**Files:**
- Modify: `style.css` — استبدال أنماط `.app`/`.app-body`/`.content` (السطور ١٢٠–١٢٢) وكل كتلة `.smart-topbar`…`.st-*` (تبدأ ~السطر ١٨١) بأنماط جديدة.

- [ ] **Step 1: استبدال أنماط التخطيط والقشرة**

استبدل السطور ١٢٠–١٢٢ (`.app`, `.app-body`, `.content`) بـ:

```css
.app { display: grid; grid-template-columns: 1fr var(--sidebar-w); min-height: 100vh; }
.main-wrap { display: flex; flex-direction: column; min-width: 0; }
.app-body { flex: 1; display: flex; flex-direction: column; }
.content { flex: 1; padding: 1.5rem 1.75rem; max-width: 1180px; width: 100%; margin: 0 auto; }
```

ثم احذف كتلة أنماط الشريط العلوي القديمة بالكامل (من `.smart-topbar {` حتى نهاية آخر قاعدة `.st-*` قبل قسم SETUP/AUTH — أي حتى قبل السطر ١٢٤ `SETUP / AUTH SCREEN`… تحقّق أن الحذف يشمل `.st-brand`, `.st-logo-icon`, `.st-time-ctx`, `.st-actions`, `.st-icon-btn`, `.st-ai-btn`, `.st-avatar*`, `.sub-nav*`, `.cmd-trigger*`), واستبدلها بالكتلة التالية. أبقِ فقط قواعد `.st-avatar-dropdown`/`.st-avatar-action`/`.st-avatar-divider`/`.st-avatar-info`/`.st-avatar-email` إن رغبت، أو استبدلها بما في الأسفل.

```css
/* ============================================================
   SIDEBAR (right in RTL)
   ============================================================ */
.side-nav {
  grid-column: 2;
  background: var(--surface);
  border-inline-start: 1px solid var(--border);
  padding: 1.1rem .8rem;
  display: flex; flex-direction: column; gap: .3rem;
  position: sticky; top: 0; height: 100vh;
}
.sn-brand { display: flex; align-items: center; gap: .6rem; padding: .4rem .5rem 1rem; cursor: pointer; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); }
.sn-logo { width: 34px; height: 34px; background: var(--primary); color: #fff; border-radius: 11px; display: grid; place-items: center; font-size: .95rem; }
.sn-links { display: flex; flex-direction: column; gap: .25rem; }
.nav-link {
  display: flex; align-items: center; gap: .75rem;
  padding: .7rem .85rem; border-radius: var(--radius);
  font-weight: 700; font-size: .95rem; color: var(--text-muted);
  cursor: pointer; transition: var(--transition); background: none; border: none; width: 100%;
}
.nav-link i { width: 22px; text-align: center; font-size: 1.05rem; }
.nav-link:hover { background: var(--surface-hover); color: var(--text-primary); }
.nav-link.active { background: var(--primary-soft); color: var(--primary); }
.sn-foot { margin-top: auto; border-top: 1px solid var(--border); padding-top: .5rem; display: flex; flex-direction: column; gap: .25rem; }
.sn-account { display: flex; align-items: center; gap: .6rem; padding: .55rem .6rem; border-radius: var(--radius); cursor: pointer; background: none; border: none; width: 100%; text-align: right; }
.sn-account:hover { background: var(--surface-hover); }
.sn-account-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); display: grid; place-items: center; flex-shrink: 0; }
.sn-account-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.sn-account-name { font-weight: 800; font-size: .9rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sn-account-school { font-size: .75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sn-account-caret { font-size: .7rem; color: var(--text-dim); }

/* account dropdown */
.st-avatar-wrap { position: relative; }
.st-avatar-dropdown { display: none; position: absolute; bottom: calc(100% + 8px); inset-inline-start: 0; width: 230px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: .4rem; z-index: 200; }
.st-avatar-wrap.open .st-avatar-dropdown { display: block; }
.st-avatar-info { padding: .5rem .6rem; }
.st-avatar-email { font-size: .78rem; color: var(--text-muted); }
.st-avatar-divider { height: 1px; background: var(--border); margin: .3rem 0; }
.st-avatar-action { display: flex; align-items: center; gap: .6rem; width: 100%; padding: .6rem .6rem; border-radius: var(--radius-sm); font-weight: 700; font-size: .88rem; color: var(--text-secondary); background: none; border: none; cursor: pointer; }
.st-avatar-action:hover { background: var(--surface-hover); }
.st-avatar-action.danger { color: var(--red); }

/* ============================================================
   TOPBAR (clean)
   ============================================================ */
.topbar { height: var(--topbar-h); display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0 1.75rem; background: var(--body-bg); position: sticky; top: 0; z-index: 50; }
.tb-context { display: flex; align-items: center; gap: .8rem; min-width: 0; }
.st-time-ctx { display: flex; align-items: center; gap: .5rem; color: var(--text-secondary); font-size: .85rem; font-weight: 700; }
.tb-actions { display: flex; align-items: center; gap: .55rem; flex-shrink: 0; }
.cmd-trigger-btn { display: flex; align-items: center; gap: .5rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: .55rem .85rem; color: var(--text-muted); font-weight: 700; font-size: .85rem; cursor: pointer; }
.cmd-trigger-btn:hover { border-color: var(--primary); color: var(--text-primary); }
.cmd-trigger-kbd { background: var(--surface-2); border-radius: 5px; padding: .1rem .35rem; font-size: .72rem; }
.tb-icon-btn, .tb-ai-btn { width: 42px; height: 42px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); display: grid; place-items: center; font-size: 1rem; color: var(--text-secondary); cursor: pointer; }
.tb-icon-btn:hover { color: var(--text-primary); border-color: var(--primary); }
.tb-ai-btn { background: var(--primary); border-color: var(--primary); color: #fff; }
.tb-ai-btn:hover { background: var(--primary-dark); }

/* ============================================================
   BOTTOM NAV (mobile) — hidden on desktop
   ============================================================ */
.bottom-nav { display: none; }

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 860px) {
  .app { grid-template-columns: 1fr; }
  .side-nav { display: none; }
  .content { padding: 1rem 1rem 5.5rem; }
  .topbar { padding: 0 1rem; }
  .cmd-trigger-label, .cmd-trigger-kbd { display: none; }
  .bottom-nav {
    display: flex; position: fixed; bottom: 0; inset-inline: 0; z-index: 100;
    background: var(--surface); border-top: 1px solid var(--border);
    padding: .35rem .3rem calc(.35rem + env(safe-area-inset-bottom, 0px));
    justify-content: space-around;
  }
  .bottom-nav .nav-link { flex-direction: column; gap: .2rem; padding: .4rem; font-size: .68rem; font-weight: 700; width: auto; }
  .bottom-nav .nav-link i { font-size: 1.15rem; width: auto; }
  .bottom-nav .nav-link span { font-size: .68rem; }
  .bottom-nav .nav-link.active { background: none; color: var(--primary); }
}
```

- [ ] **Step 2: تحقق بصري (بيانات محقونة)**

Run: افتح `http://localhost:8890/index.html`، ثم في console المتصفح نفّذ سكربت الحقن (احفظه كـ `seed` واستدعِه):

```js
localStorage.setItem('tm_teacher', JSON.stringify({name:'أ. ناصر',school:'ابتدائية الفيصل',subject:'المهارات الرقمية',gender:'male'}));
localStorage.setItem('tm_user_email','test@test.com');
localStorage.setItem('tm_classes', JSON.stringify([{id:'c1',name:'الصف الرابع/أ',subject:'المهارات الرقمية',grade:'4',section:'أ',color:'#4f46e5'}]));
localStorage.setItem('tm_students', JSON.stringify([{id:'s1',name:'أحمد العتيبي',classId:'c1'}]));
window._ADMIN_EMAIL='x'; App.start(DB.teacher());
```

Expected: يظهر شريط جانبي يميناً (منصة المعلم + ٤ روابط + الحساب أسفل)، شريط علوي نظيف (بحث + ليلي + AI)، والمحتوى في الوسط. لا أخطاء console.

- [ ] **Step 3: تحقق التجاوب**

في معاينة المتصفح: `resize_window` إلى عرض 400px. Expected: يختفي الشريط الجانبي ويظهر تنقل سفلي بـ٥ أيقونات.

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "💅 أنماط القشرة الجديدة: شريط جانبي + علوي + تنقل سفلي متجاوب"
```

---

## Task 4: تحديث منطق التنقل في app.js

**Files:**
- Modify: `app.js:1526-1528` (Router.go active-state)
- Modify: `app.js:6043-6049` (FontSize.apply null-guard)

- [ ] **Step 1: تحديث حالة التفعيل في Router.go**

في `app.js`، استبدل (السطور ١٥٢٦–١٥٢٨):

```javascript
    document.querySelectorAll('.sub-nav-link').forEach(l =>
      l.classList.toggle('active', l.dataset.page === navPage)
    );
```

بـ:

```javascript
    document.querySelectorAll('.nav-link').forEach(l =>
      l.classList.toggle('active', l.dataset.page === navPage)
    );
```

- [ ] **Step 2: حراسة null في FontSize.apply**

استبدل جسم `apply(size)` في `FontSize` (السطور ٦٠٤٣–٦٠٤٩) بـ:

```javascript
  apply(size) {
    document.documentElement.style.fontSize = size + 'px';
    localStorage.setItem(this._key, size);
    const idx = this._sizes.indexOf(size);
    const down = document.getElementById('fs-down');
    const up   = document.getElementById('fs-up');
    if (down) down.disabled = idx === 0;
    if (up)   up.disabled   = idx === this._sizes.length - 1;
  },
```

- [ ] **Step 3: تحقق**

Run: أعد تحميل `http://localhost:8890/index.html` وأعد حقن البيانات (Step 2 من Task 3). انقر بين روابط الشريط الجانبي (الرئيسية/فصولي/الجدول/التحليلات).
Expected: يتغيّر الرابط النشط (خلفية نيلية فاتحة) صح، وتتبدّل الصفحات بلا أخطاء console.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "🔧 تحديث منطق التنقل للشريط الجانبي + حراسة null لحجم الخط"
```

---

## Task 5: الوضع الليلي للقشرة الجديدة

**Files:**
- Modify: `style.css` — كتلة `[data-theme="dark"]` (تبدأ ~السطر ٢٢٤١ بعد إزاحة التعديلات السابقة). ابحث عن `[data-theme="dark"] .smart-topbar` و`.sub-nav`.

- [ ] **Step 1: استبدال قواعد الوضع الليلي للقشرة**

احذف القواعد التي تشير إلى `.smart-topbar` و`.sub-nav` و`.sub-nav-link` داخل `[data-theme="dark"]`، وأضِف بعد قاعدة `[data-theme="dark"] body`:

```css
[data-theme="dark"] .side-nav { background: #171a2e; border-color: #262a44; }
[data-theme="dark"] .topbar { background: transparent; }
[data-theme="dark"] .nav-link { color: var(--text-muted); }
[data-theme="dark"] .nav-link:hover { background: rgba(255,255,255,.05); color: #fff; }
[data-theme="dark"] .nav-link.active { background: rgba(99,102,241,.18); color: #a5b4fc; }
[data-theme="dark"] .cmd-trigger-btn,
[data-theme="dark"] .tb-icon-btn { background: #1c2036; border-color: #2a2f4c; color: var(--text-secondary); }
[data-theme="dark"] .sn-account:hover { background: rgba(255,255,255,.05); }
[data-theme="dark"] .st-avatar-dropdown { background: #1c2036; border-color: #2a2f4c; }
[data-theme="dark"] .bottom-nav { background: #171a2e; border-color: #262a44; }
```

تأكّد أن كتلة `[data-theme="dark"] :root`/المتغيّرات (السطر ٢٢٤١) تعرّف `--body-bg`, `--surface`, `--text-primary` بقيم داكنة مناسبة (إن كانت تشير لقيم قديمة، حدّثها: `--body-bg:#12142a; --surface:#1c2036; --border:#2a2f4c;`).

- [ ] **Step 2: تحقق**

Run: مع البيانات المحقونة، انقر زر القمر في الشريط العلوي.
Expected: تتحول القشرة لوضع داكن نظيف (شريط جانبي داكن، نص فاتح)، والزر يتحول لشمس. أعد النقر → يرجع فاتح.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "🌙 الوضع الليلي للقشرة الجديدة"
```

---

## Task 6: رفع نسخة كاش الخدمة

**Files:**
- Modify: `service-worker.js`

- [ ] **Step 1: رفع رقم النسخة**

في `service-worker.js`، ابحث عن ثابت اسم الكاش (مثل `const CACHE = 'tm-v…'`) وارفع رقمه (مثلاً `tm-v13`). إن كان يسرد ملفات، تأكّد أن `style.css` و`app.js` مدرجة بدون بارامتر النسخة أو مع تحديثها.

- [ ] **Step 2: تحقق**

Run: أعد تحميل الصفحة بـ hard reload، افحص `read_console_messages`.
Expected: لا أخطاء تسجيل service worker؛ الأنماط الجديدة تُحمّل.

- [ ] **Step 3: Commit**

```bash
git add service-worker.js
git commit -m "🔄 رفع نسخة كاش الخدمة"
```

---

## Task 7: تحقق شامل نهائي للمرحلة

- [ ] **Step 1: مسار كامل بالبيانات المحقونة**

مع بيانات تجريبية (٣ فصول، طلاب)، تنقّل عبر: الرئيسية → فصولي → الجدول → التحليلات → الإعدادات → (من الحساب) الإحالات.
Expected: كل الصفحات تُعرض بلا كسر، الشريط الجانبي يعمل، الحساب المنسدل يفتح ويظهر الاسم/المدرسة/البريد، تصدير/استيراد موجودة.

- [ ] **Step 2: تحقق الجوال**

`resize_window` 390px. تنقّل عبر التنقل السفلي.
Expected: التنقل السفلي يعمل، المحتوى غير مقصوص، لا تمرير أفقي.

- [ ] **Step 3: لقطة إثبات**

خذ لقطة شاشة للرئيسية (ديسكتوب فاتح) + لقطة (جوال) + لقطة (ليلي) وأرفقها للمستخدم.

- [ ] **Step 4: دمج الفرع**

بعد موافقة المستخدم على المظهر:
```bash
git log --oneline -8
```
Expected: ٦ commits للمرحلة ١. (الدمج في main يتم بعد اكتمال المراحل أو حسب طلب المستخدم.)

---

## ملاحظات للمنفّذ

- **لا تلمس** دوال العرض للصفحات (dashboard/classes/…) في هذه المرحلة — تُعاد كتابتها في مراحل لاحقة. هدف المرحلة ١ القشرة فقط.
- الصفحات ستبدو "انتقالية" (أنماطها القديمة + ألوان نيلية) — هذا متوقّع.
- إن ظهر خطأ console عن معرّف مفقود، تحقّق من قائمة "ثوابت يجب الحفاظ عليها" أعلاه.
- بعد كل مهمة، أعد حقن البيانات التجريبية (تُمسح عند إعادة التحميل الصلب).
```
