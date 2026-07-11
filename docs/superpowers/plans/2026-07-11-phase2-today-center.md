# المرحلة ٢: الرئيسية "مركز اليوم" — خطة التنفيذ

> **للمنفّذ الآلي:** SUB-SKILL مطلوبة: superpowers:subagent-driven-development. الخطوات بصيغة مربّعات (`- [ ]`).

**الهدف:** تحويل الرئيسية من نسخة مكرّرة من صفحة الفصول (كروت إكسل) إلى "مركز يوم": تحية + بطاقة "الحصة الآن" النيلية بزرّي (افتح الكتاب / سجّل الحضور) + ٤ بطاقات إحصائية نظيفة + قائمة "فصولي" مختصرة + لوحة "يحتاج انتباهك".

**المعمارية:** نعيد كتابة دالتين في app.js: `Pages._heroCard()` و`Pages.dashboard()` (وتبقى `_xlWidget` كما هي لأنها تُستخدم في صفحة الفصول — المرحلة ٣). نضيف أنماط قسم "DASHBOARD" في style.css. المنطق ومصادر البيانات نفسها.

**التقنية:** vanilla JS/CSS. التحقق بصري في معاينة المتصفح (حقن بيانات + لقطات). بعد أي تعديل على app.js/style.css **يجب رفع `?v=` في index.html** لكسر كاش المتصفح.

**ثوابت يُعتمد عليها (لا تكسرها):** المعرّف `home-hero-wrap` (يحدّثه Router كل 30 ثانية عبر `Pages._heroCard()`)، المعرّف `content`. الدوال المستدعاة: `Router.go`, `Pages.addClassModal`, `ActiveClass.get`, `TimeAware.zone/currentPeriod/nextPeriod/_periods/_minDiff/_hhmm`, `Books.forClass`, `_T.*`, `DB.get`.

---

## Task 1: أنماط "مركز اليوم" في style.css

**Files:** Modify: `style.css` (أضِف قسماً جديداً قبل قسم `SETUP / AUTH SCREEN`).

- [ ] **Step 1: إضافة الأنماط**

أضِف هذه الكتلة في style.css (مباشرة قبل تعليق `SETUP / AUTH SCREEN`):

```css
/* ============================================================
   DASHBOARD — Today Center
   ============================================================ */
.dash-greet { margin-bottom: 1.1rem; }
.dash-greet h1 { font-size: 1.5rem; font-weight: 900; }
.dash-greet p { color: var(--text-muted); font-size: .9rem; margin-top: .25rem; font-weight: 600; }

.now-card { border-radius: 18px; padding: 1.4rem 1.5rem; margin-bottom: 1.2rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.now-card.accent-primary { background: var(--primary); color: #fff; }
.now-card.accent-amber   { background: var(--orange-soft); border: 1px solid #fed7aa; color: var(--text-primary); }
.now-card.accent-blue    { background: #eff6ff; border: 1px solid #bfdbfe; color: var(--text-primary); }
.now-card.accent-muted   { background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); }
.now-main { min-width: 0; }
.now-lbl { font-size: .8rem; font-weight: 800; opacity: .9; margin-bottom: .45rem; display: flex; align-items: center; gap: .45rem; }
.now-card.accent-amber .now-lbl { color: var(--orange); }
.now-card.accent-blue  .now-lbl { color: var(--blue); }
.now-card.accent-muted .now-lbl { color: var(--text-muted); }
.now-title { font-size: 1.55rem; font-weight: 900; line-height: 1.2; }
.now-meta { font-size: .86rem; opacity: .85; margin-top: .4rem; font-weight: 600; }
.now-actions { display: flex; gap: .6rem; flex-shrink: 0; }
.now-btn { font-family: inherit; font-weight: 800; font-size: .9rem; padding: .72rem 1.15rem; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; gap: .5rem; white-space: nowrap; }
.now-card.accent-primary .now-btn { background: rgba(255,255,255,.16); color: #fff; }
.now-card.accent-primary .now-btn.solid { background: #fff; color: var(--primary); }
.now-btn.outline { background: transparent; border: 1.5px solid currentColor; color: inherit; }

.dash-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 1.2rem; }
.dash-stat { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 1rem 1.1rem; display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.dash-stat-val { font-size: 1.5rem; font-weight: 900; }
.dash-stat-lbl { font-size: .82rem; color: var(--text-muted); font-weight: 700; margin-top: .2rem; }
.dash-stat-ic { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; font-size: 1.05rem; flex-shrink: 0; }
.dash-stat-ic.blue { background: #eff6ff; color: #2563eb; }
.dash-stat-ic.green { background: var(--green-soft); color: var(--green); }
.dash-stat-ic.purple { background: #f3e8ff; color: #7c3aed; }
.dash-stat-ic.indigo { background: var(--primary-soft); color: var(--primary); }
.dash-stat-ic.red { background: var(--red-soft); color: var(--red); }
.dash-stat-ic.orange { background: var(--orange-soft); color: var(--orange); }

.dash-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.2rem; }
.dash-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.1rem 1.2rem; }
.dash-panel-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: .9rem; }
.dash-panel-hdr h3 { font-size: 1rem; font-weight: 800; display: flex; align-items: center; gap: .5rem; }
.dash-panel-hdr h3 i { color: var(--primary); }
.dash-link { color: var(--primary); font-size: .82rem; font-weight: 800; cursor: pointer; background: none; border: none; font-family: inherit; }

.dash-cls { display: flex; align-items: center; gap: .8rem; padding: .7rem .3rem; border-bottom: 1px solid var(--border-subtle); cursor: pointer; border-radius: 8px; }
.dash-cls:last-child { border-bottom: 0; }
.dash-cls:hover { background: var(--surface-hover); }
.dash-cls-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
.dash-cls-name { font-weight: 800; font-size: .95rem; }
.dash-cls-sub { color: var(--text-muted); font-size: .78rem; margin-top: .1rem; }
.dash-cls-badge { margin-inline-start: auto; background: var(--primary-soft); color: var(--primary); border-radius: 8px; padding: .32rem .6rem; font-size: .78rem; font-weight: 800; white-space: nowrap; }

.dash-alert { display: flex; align-items: center; gap: .75rem; padding: .7rem .3rem; border-bottom: 1px solid var(--border-subtle); }
.dash-alert:last-child { border-bottom: 0; }
.dash-alert-ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font-size: .9rem; flex-shrink: 0; }
.dash-alert-tx { flex: 1; min-width: 0; font-size: .88rem; font-weight: 700; }
.dash-alert-tx small { display: block; color: var(--text-muted); font-weight: 600; font-size: .76rem; margin-top: .15rem; }
.dash-alert-ok { text-align: center; color: var(--text-muted); padding: 1.2rem; font-size: .88rem; font-weight: 600; }
.dash-alert-ok i { color: var(--green); margin-inline-end: .3rem; }

@media (max-width: 860px) {
  .dash-stats { grid-template-columns: repeat(2,1fr); }
  .dash-row { grid-template-columns: 1fr; }
  .now-card { flex-direction: column; align-items: stretch; }
  .now-actions { width: 100%; }
  .now-btn { flex: 1; justify-content: center; }
}
```

- [ ] **Step 2: تحقق توازن الأقواس**

Run: `grep -c "{" style.css` == `grep -c "}" style.css`.

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/teacher
git add style.css
git commit -m "💅 أنماط الرئيسية مركز اليوم"
```

---

## Task 2: إعادة كتابة `_heroCard()`

**Files:** Modify: `app.js` — استبدل دالة `_heroCard() { ... }` بالكامل (من `_heroCard() {` حتى `},` الخاصة بها، حوالي السطور 1748–1942).

- [ ] **Step 1: استبدال الدالة**

استبدل كامل `_heroCard() { ... },` بـ:

```javascript
  _heroCard() {
    const md  = TimeAware._minDiff.bind(TimeAware);
    const hm  = TimeAware._hhmm();
    const sch = DB.get('schedule');
    const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const clsForPeriod = p => {
      const slot = sch.find(s => s.day === dayKey && s.period == p.p);
      return slot ? DB.get('classes').find(c => c.id === slot.classId) : null;
    };
    const card = (accent, icon, lbl, title, meta, actions) => `
      <div class="now-card accent-${accent}">
        <div class="now-main">
          <div class="now-lbl"><i class="fas ${icon}"></i> ${lbl}</div>
          <div class="now-title">${title}</div>
          ${meta ? `<div class="now-meta">${meta}</div>` : ''}
        </div>
        ${actions ? `<div class="now-actions">${actions}</div>` : ''}
      </div>`;

    const activeCard = (period, cls) => {
      const left = md(hm, period.e);
      if (!cls) {
        const allPeriods = TimeAware._periods();
        const nextWithCls = allPeriods.filter(p => p.p > period.p)
          .map(p => ({ period: p, cls: clsForPeriod(p) })).find(x => x.cls);
        const meta = `الحصة ${period.p} · ${period.s} — ${period.e}`
          + (nextWithCls ? ` · القادمة: ${nextWithCls.cls.name} الساعة ${nextWithCls.period.s}` : '');
        return card('muted','fa-mug-hot','وقت حر الآن','لا حصة هذه الفترة', meta,
          `<button class="now-btn outline" onclick="Router.go('lessons')"><i class="fas fa-calendar-alt"></i> الجدول</button>`);
      }
      const stuCount = DB.get('students').filter(s => s.classId === cls.id).length;
      const book = Books.forClass(cls);
      const meta = `${cls.subject ? cls.subject + ' · ' : ''}${stuCount} ${_T.stu} · متبقٍ ${left} دقيقة`;
      const bookBtn = book
        ? `<button class="now-btn" onclick="Router.go('classDetail',{classId:'${cls.id}',tab:'book'})"><i class="fas fa-book-open"></i> افتح الكتاب</button>`
        : '';
      return card('primary','fa-circle-play',`الحصة الآن · ${period.s} – ${period.e}`, cls.name, meta,
        `${bookBtn}<button class="now-btn solid" onclick="Router.go('classDetail',{classId:'${cls.id}',tab:'att'})"><i class="fas fa-clipboard-check"></i> سجّل الحضور</button>`);
    };

    const activeCls = ActiveClass.get();
    if (activeCls) return activeCard(activeCls.period, activeCls.cls);

    const z = TimeAware.zone(), cur = TimeAware.currentPeriod(), nxt = TimeAware.nextPeriod();
    if (z === 'active' && cur) return activeCard(cur, clsForPeriod(cur));

    if (z === 'between' && nxt) {
      const cls = clsForPeriod(nxt), wait = md(hm, nxt.s);
      return card('amber','fa-hourglass-half','استراحة',
        `الحصة ${nxt.p} قادمة${cls ? ' — ' + cls.name : ''}`,
        `تبدأ الساعة ${nxt.s} · بعد ${wait} دقيقة`,
        (cls ? `<button class="now-btn outline" onclick="Router.go('classDetail',{classId:'${cls.id}',tab:'att'})"><i class="fas fa-clipboard-check"></i> الحضور</button>` : '')
        + `<button class="now-btn outline" onclick="Router.go('lessons')"><i class="fas fa-calendar-alt"></i> الجدول</button>`);
    }

    if (z === 'pre' && nxt) {
      const wait = md(hm, nxt.s);
      return card('blue','fa-sun', _T.morningGr, _T.preHdr,
        `${_T.preSub} — الحصة الأولى ${nxt.s} · بعد ${wait} دقيقة`,
        `<button class="now-btn outline" onclick="Router.go('lessons')"><i class="fas fa-calendar-alt"></i> جدول اليوم</button>`);
    }

    if (z === 'post') {
      const todaySch = sch.filter(s => s.day === dayKey);
      const today = new Date().toISOString().slice(0,10);
      const todayAtt = DB.get('attendance').filter(a => a.date === today);
      const pres = todayAtt.reduce((n,a) => n + a.records.filter(r => r.status==='present').length, 0);
      const exp  = todayAtt.reduce((n,a) => n + a.records.length, 0);
      const rate = exp ? Math.round(pres/exp*100) : 0;
      return card('muted','fa-moon','انتهى الدوام', _T.dayDone,
        `${todayAtt.length}/${todaySch.length} فصول مُسجّلة · حضور ${rate}%`,
        `<button class="now-btn outline" onclick="Router.go('analytics')"><i class="fas fa-chart-bar"></i> تقارير اليوم</button>`);
    }

    return card('muted','fa-mug-hot','إجازة', _T._f ? 'استمتعي بوقتك' : 'استمتع بوقتك', '', '');
  },
```

- [ ] **Step 2: تحقق نحوي**

Run: `node --check app.js` → OK.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "🎨 إعادة كتابة بطاقة الحصة الآن (نيلي نظيف)"
```

---

## Task 3: إعادة كتابة `dashboard()`

**Files:** Modify: `app.js` — استبدل دالة `dashboard() { ... }` بالكامل (حوالي السطور 2048–2138). **لا تلمس** `_xlWidget` (تبقى لصفحة الفصول).

- [ ] **Step 1: استبدال الدالة**

استبدل كامل `dashboard() { ... },` بـ:

```javascript
  dashboard() {
    const classes  = DB.get('classes');
    const students = DB.get('students');
    const today    = new Date().toISOString().slice(0,10);
    const todayAtt = DB.get('attendance').filter(a => a.date === today);
    const dayKey   = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const todayLessons = DB.get('schedule').filter(l => l.day === dayKey);
    const totalPresent  = todayAtt.reduce((n,a) => n + a.records.filter(r => r.status==='present').length, 0);
    const totalExpected = todayAtt.reduce((n,a) => n + a.records.length, 0);
    const attRate = totalExpected ? Math.round(totalPresent/totalExpected*100) : 0;

    const sevenAgo   = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const recentEvts = DB.get('behaviorEvents').filter(e => e.date >= sevenAgo);
    const recentIds  = new Set(recentEvts.map(e => e.studentId));
    const dismissed  = new Set(DB.get('dismissedWarnings').filter(d => d.date >= sevenAgo).map(d => d.studentId));
    const allWarned  = students.filter(s => recentIds.has(s.id) && !dismissed.has(s.id));

    const greetName = (DB.teacher()?.name || '').split(' ').slice(0,2).join(' ');
    let dateStr = '';
    try { dateStr = new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { weekday:'long', day:'numeric', month:'long' }); } catch (e) { dateStr = new Date().toLocaleDateString('ar'); }
    const lessonWord = todayLessons.length === 1 ? 'حصة' : 'حصص';

    if (!classes.length) {
      document.getElementById('content').innerHTML = `
        <div class="dash-greet"><h1>مرحباً ${greetName || _T.tch} 👋</h1><p>${dateStr}</p></div>
        <div id="home-hero-wrap">${this._heroCard()}</div>
        <div class="home-empty">
          <div class="home-empty-icon"><i class="fas fa-chalkboard-teacher"></i></div>
          <h3>${_T.hi} ${_T.addFirstCls}</h3>
          <p>أضف فصلاً دراسياً لتتمكن من إدارة ${_T.theStus} والحضور والدرجات</p>
          <button class="btn btn-primary" onclick="Pages.addClassModal()"><i class="fas fa-plus"></i> إضافة فصل</button>
        </div>`;
      return;
    }

    const clsList = classes.map(cls => {
      const cnt  = students.filter(s => s.classId === cls.id).length;
      const att  = todayAtt.find(a => a.classId === cls.id);
      const rate = att && att.records.length ? Math.round(att.records.filter(r=>r.status==='present').length/att.records.length*100) : null;
      return `<div class="dash-cls" onclick="Router.go('classDetail',{classId:'${cls.id}',tab:'att'})">
        <span class="dash-cls-dot" style="background:${cls.color||'#4f46e5'}"></span>
        <div style="min-width:0"><div class="dash-cls-name">${cls.name}</div><div class="dash-cls-sub">${cls.subject ? cls.subject + ' · ' : ''}${cnt} ${_T.stu}</div></div>
        <span class="dash-cls-badge">${rate !== null ? 'حضور ' + rate + '%' : 'لم يُسجّل'}</span>
      </div>`;
    }).join('');

    const alerts = [];
    if (allWarned.length) alerts.push(`<div class="dash-alert">
      <span class="dash-alert-ic" style="background:var(--red-soft);color:var(--red)"><i class="fas fa-triangle-exclamation"></i></span>
      <div class="dash-alert-tx">${allWarned.length} ${_T.stu} بحاجة انتباه هذا الأسبوع<small>سلوك سلبي متكرر</small></div>
      <button class="dash-link" onclick="Router.go('referrals')">إحالات ‹</button>
    </div>`);
    const notTaken = todayLessons.filter(l => !todayAtt.find(a => a.classId === l.classId)).length;
    if (notTaken) alerts.push(`<div class="dash-alert">
      <span class="dash-alert-ic" style="background:var(--orange-soft);color:var(--orange)"><i class="fas fa-clipboard-list"></i></span>
      <div class="dash-alert-tx">${notTaken} ${notTaken===1?'حصة':'حصص'} لم يُسجّل حضورها اليوم<small>من جدول اليوم</small></div>
    </div>`);
    const alertsHtml = alerts.length ? alerts.join('') : `<div class="dash-alert-ok"><i class="fas fa-circle-check"></i> ممتاز — لا شيء يحتاج انتباهك الآن</div>`;

    document.getElementById('content').innerHTML = `
      <div class="dash-greet"><h1>مرحباً ${greetName || _T.tch} 👋</h1><p>${dateStr} · لديك ${todayLessons.length} ${lessonWord} اليوم</p></div>
      <div id="home-hero-wrap">${this._heroCard()}</div>
      <div class="dash-stats">
        <div class="dash-stat"><div><div class="dash-stat-val">${classes.length}</div><div class="dash-stat-lbl">الفصول</div></div><div class="dash-stat-ic indigo"><i class="fas fa-door-open"></i></div></div>
        <div class="dash-stat"><div><div class="dash-stat-val">${students.length}</div><div class="dash-stat-lbl">${_T.theStus}</div></div><div class="dash-stat-ic green"><i class="fas fa-users"></i></div></div>
        <div class="dash-stat"><div><div class="dash-stat-val">${attRate}%</div><div class="dash-stat-lbl">حضور اليوم</div></div><div class="dash-stat-ic ${attRate>=80?'green':attRate>=60?'orange':'red'}"><i class="fas fa-clipboard-check"></i></div></div>
        <div class="dash-stat"><div><div class="dash-stat-val">${todayLessons.length}</div><div class="dash-stat-lbl">حصص اليوم</div></div><div class="dash-stat-ic purple"><i class="fas fa-book-open"></i></div></div>
      </div>
      <div class="dash-row">
        <div class="dash-panel">
          <div class="dash-panel-hdr"><h3><i class="fas fa-door-open"></i> فصولي</h3><button class="dash-link" onclick="Router.go('classes')">عرض الكل ‹</button></div>
          ${clsList}
        </div>
        <div class="dash-panel">
          <div class="dash-panel-hdr"><h3><i class="fas fa-bell"></i> يحتاج انتباهك</h3></div>
          ${alertsHtml}
        </div>
      </div>`;
  },
```

- [ ] **Step 2: تحقق نحوي**

Run: `node --check app.js` → OK.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "🏠 إعادة كتابة الرئيسية كمركز يوم (حصة الآن + إحصائيات + فصولي + يحتاج انتباهك)"
```

---

## Task 4: رفع النسخة + تحقق شامل

**Files:** Modify: `index.html`.

- [ ] **Step 1: رفع النسخة**

في `index.html` ارفع `style.css?v=15`→`?v=16` و`app.js?v=15`→`?v=16`. Commit:
```bash
git add index.html && git commit -m "🔖 رفع نسخة الأصول إلى v=16"
```

- [ ] **Step 2: تحقق بصري (يقوم به المنسّق)**

شغّل الخادم، افتح الصفحة، احقن بيانات تجريبية (٣ فصول + جدول اليوم + طلاب + حدث سلوك سلبي)، استدعِ `App.start(DB.teacher())` ثم `Router.go('dashboard')`. تحقق:
- التحية + التاريخ يظهران.
- بطاقة "الحصة الآن" (أو الحالة المناسبة للوقت) بلون نيلي/مناسب مع الأزرار.
- ٤ بطاقات إحصائية نظيفة.
- لوحة "فصولي" صفوف مختصرة + شارة حضور.
- لوحة "يحتاج انتباهك" (تنبيهات أو رسالة "ممتاز").
- لا كروت إكسل في الرئيسية.
- لا أخطاء console.
- تجاوب الجوال (390px): البطاقات عمودان، الصف عمود واحد.

- [ ] **Step 3: لقطة إثبات** (ديسكتوب فاتح + جوال).

---

## ملاحظات للمنفّذ
- `_xlWidget` تبقى دون تغيير (تُستخدم في صفحة الفصول — المرحلة ٣).
- `home-hero-wrap` يجب أن يبقى موجوداً (Router يحدّثه كل 30 ثانية).
- استخدم `_T.*` للنصوص حسب الجنس (لا تكتب "معلم" مباشرة).
- بعد كل تعديل app.js/style.css، ارفع `?v=` قبل التحقق البصري.
