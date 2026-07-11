# المرحلة ٣: فصولي + مساحة عمل الفصل — خطة التنفيذ

> **للمنفّذ الآلي:** SUB-SKILL: superpowers:subagent-driven-development. مربّعات `- [ ]`.

**الهدف:** (١) استبدال كروت الإكسل في صفحة "الفصول" بكروت نظيفة، (٢) تحويل ترويسة "تفاصيل الفصل" إلى مساحة عمل موحّدة: مسار تنقّل (breadcrumb) + صورة/اسم الفصل + **مبدّل فصل** + شريط تبويبات نظيف (الحضور والسلوك · الدرجات · المجموعات · الكتاب والعروض · الطلاب).

**المعمارية:** إعادة كتابة `Pages.classes()` وترويسة `Pages.classDetail()` (متغيّر `header` فقط) في app.js + إضافة معالج إغلاق للمبدّل + أنماط CSS جديدة. أجسام التبويبات (`_cdAttBody` وهي إكسل — المرحلة ٤، `_cdGroupsBody`, `_cdBookBody`, `_cdManageBody`) تبقى كما هي. `_xlWidget` يبقى معرّفاً لكنه لم يعد مستخدماً (يُحذف في تنظيف لاحق).

**التقنية:** vanilla JS/CSS. تحقّق بصري. بعد أي تعديل app.js/style.css ارفع `?v=` في index.html.

**ثوابت لا تُكسر:** المعرّف `content`، معالجات `Router.go`, `Pages.classDetail`, `Pages.addClassModal`, `Pages.deleteClass`, `Pages.shareClassModal`, `Pages.shareAllClassesModal`, `Pages.importClassModal`, `Books.forClass`, `_T.*`. تبويبات classDetail تُستدعى بـ `tab` ∈ {att, groups, book, manage}.

---

## Task 1: أنماط فصولي + مساحة عمل الفصل (CSS)

**Files:** Modify: `style.css` (أضِف قبل قسم `SETUP / AUTH SCREEN`).

- [ ] **Step 1: إضافة الأنماط**

```css
/* ============================================================
   CLASSES (فصولي) + CLASS WORKSPACE
   ============================================================ */
.cls-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap: 1rem; }
.cls-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: var(--transition); }
.cls-card:hover { border-color: var(--primary); box-shadow: var(--shadow-md); }
.cls-card-top { height: 6px; }
.cls-card-body { padding: 1.1rem 1.2rem; }
.cls-card-head { display: flex; align-items: flex-start; gap: .7rem; margin-bottom: 1rem; }
.cls-card-dot { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #fff; font-weight: 900; font-size: 1rem; flex-shrink: 0; }
.cls-card-name { font-weight: 900; font-size: 1.05rem; }
.cls-card-sub { color: var(--text-muted); font-size: .82rem; margin-top: .15rem; }
.cls-card-stats { display: flex; gap: .6rem; margin-bottom: 1rem; }
.cls-card-stat { flex: 1; background: var(--surface-2); border-radius: 10px; padding: .6rem; text-align: center; }
.cls-card-stat-v { font-weight: 900; font-size: 1.1rem; }
.cls-card-stat-l { color: var(--text-muted); font-size: .72rem; font-weight: 700; margin-top: .15rem; }
.cls-card-att { border-radius: 10px; padding: .55rem; text-align: center; font-weight: 800; font-size: .8rem; margin-bottom: 1rem; }
.cls-card-att.done { background: var(--green-soft); color: var(--green); }
.cls-card-att.pending { background: var(--red-soft); color: var(--red); }
.cls-card-actions { display: flex; gap: .5rem; }
.cls-btn { flex: 1; font-family: inherit; font-weight: 800; font-size: .82rem; padding: .6rem; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: .4rem; }
.cls-btn:hover { border-color: var(--primary); color: var(--primary); }
.cls-btn.primary { background: var(--primary); color: #fff; border-color: var(--primary); }
.cls-btn.primary:hover { background: var(--primary-dark); color: #fff; }
.cls-btn.icon { flex: 0 0 auto; width: 40px; padding: .6rem 0; }
.cls-btn.danger:hover { border-color: var(--red); color: var(--red); }

.cw-crumb { color: var(--text-muted); font-size: .82rem; font-weight: 700; margin-bottom: .7rem; }
.cw-crumb b { color: var(--primary); cursor: pointer; }
.cw-head { display: flex; align-items: center; gap: .9rem; margin-bottom: 1.1rem; flex-wrap: wrap; }
.cw-avatar { width: 48px; height: 48px; border-radius: 13px; display: grid; place-items: center; color: #fff; font-weight: 900; font-size: 1.1rem; flex-shrink: 0; }
.cw-title { flex: 1; min-width: 0; }
.cw-name { font-size: 1.35rem; font-weight: 900; }
.cw-sub { color: var(--text-muted); font-size: .85rem; font-weight: 700; margin-top: .1rem; }
.cw-switch { position: relative; }
.cw-switch-btn { display: flex; align-items: center; gap: .5rem; background: var(--surface); border: 1px solid var(--border); border-radius: 11px; padding: .6rem .9rem; font-weight: 800; font-size: .88rem; cursor: pointer; font-family: inherit; color: var(--text-primary); }
.cw-switch-btn:hover { border-color: var(--primary); }
.cw-switch-menu { display: none; position: absolute; top: calc(100% + 6px); inset-inline-end: 0; min-width: 210px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-lg); padding: .4rem; z-index: 60; max-height: 320px; overflow-y: auto; }
.cw-switch.open .cw-switch-menu { display: block; }
.cw-switch-item { display: flex; align-items: center; gap: .6rem; padding: .55rem .6rem; border-radius: 8px; font-weight: 700; font-size: .85rem; cursor: pointer; }
.cw-switch-item:hover { background: var(--surface-hover); }
.cw-switch-item .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.cw-tabs { display: flex; gap: .3rem; background: var(--surface); border: 1px solid var(--border); border-radius: 13px; padding: 5px; margin-bottom: 1.2rem; overflow-x: auto; }
.cw-tab { display: flex; align-items: center; gap: .5rem; padding: .6rem 1.1rem; border-radius: 9px; font-weight: 800; font-size: .88rem; color: var(--text-muted); cursor: pointer; background: none; border: none; font-family: inherit; white-space: nowrap; }
.cw-tab.active { background: var(--primary); color: #fff; }
.cw-tab:hover:not(.active) { background: var(--surface-hover); color: var(--text-primary); }

@media (max-width: 860px) {
  .cls-grid { grid-template-columns: 1fr; }
  .cw-head { gap: .6rem; }
  .cw-name { font-size: 1.15rem; }
}
```

- [ ] **Step 2:** `grep -c "{" style.css` == `grep -c "}" style.css`.
- [ ] **Step 3:** commit:
```bash
cd /Users/mac/Desktop/teacher && git add style.css && git commit -m "💅 أنماط فصولي ومساحة عمل الفصل"
```

---

## Task 2: إعادة كتابة `classes()` بكروت نظيفة

**Files:** Modify: `app.js` — استبدل دالة `classes() { ... }` بالكامل (من `  classes() {` حتى `  },` قبل `addClassModal`). **لا تلمس `_xlWidget`.**

- [ ] **Step 1: استبدال الدالة**

```javascript
  classes() {
    const classes  = DB.get('classes');
    const students = DB.get('students');
    const todayStr = new Date().toISOString().slice(0,10);
    const allAtt   = DB.get('attendance').filter(a => a.date === todayStr);

    const cards = classes.map(c => {
      const cnt  = students.filter(s => s.classId === c.id).length;
      const att  = allAtt.find(a => a.classId === c.id);
      const pres = att ? att.records.filter(r => r.status === 'present').length : 0;
      const rate = att && att.records.length ? Math.round(pres/att.records.length*100) : null;
      const clr  = c.color || '#4f46e5';
      const initials = (c.name||'').replace(/[^0-9ء-ي]/g,'').slice(0,2);
      return `
      <div class="cls-card">
        <div class="cls-card-top" style="background:${clr}"></div>
        <div class="cls-card-body">
          <div class="cls-card-head">
            <div class="cls-card-dot" style="background:${clr}">${initials}</div>
            <div style="min-width:0"><div class="cls-card-name">${c.name}</div><div class="cls-card-sub">${c.subject || '—'}</div></div>
          </div>
          <div class="cls-card-stats">
            <div class="cls-card-stat"><div class="cls-card-stat-v">${cnt}</div><div class="cls-card-stat-l">${_T.stu}</div></div>
            <div class="cls-card-stat"><div class="cls-card-stat-v">${rate!==null?rate+'%':'—'}</div><div class="cls-card-stat-l">حضور اليوم</div></div>
          </div>
          <div class="cls-card-att ${att?'done':'pending'}">${att?`<i class="fas fa-circle-check"></i> سُجّل الحضور · ${pres}/${cnt}`:`<i class="fas fa-circle-exclamation"></i> لم يُسجّل الحضور اليوم`}</div>
          <div class="cls-card-actions">
            <button class="cls-btn primary" onclick="Router.go('classDetail',{classId:'${c.id}',tab:'att'})"><i class="fas fa-door-open"></i> دخول الفصل</button>
            <button class="cls-btn icon" onclick="Router.go('grades',{classId:'${c.id}'})" title="الدرجات"><i class="fas fa-star"></i></button>
            <button class="cls-btn icon" onclick="Pages.shareClassModal('${c.id}')" title="مشاركة"><i class="fas fa-share-alt"></i></button>
            <button class="cls-btn icon danger" onclick="Pages.deleteClass('${c.id}')" title="حذف"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>`;
    }).join('');

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2>فصولي</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="Pages.importClassModal()"><i class="fas fa-file-import"></i> استيراد بكود</button>
          <button class="btn btn-outline" onclick="Pages.shareAllClassesModal()"><i class="fas fa-share-alt"></i> مشاركة الكل</button>
          <button class="btn btn-primary" onclick="Pages.addClassModal()"><i class="fas fa-plus"></i> إضافة فصل</button>
        </div>
      </div>
      ${classes.length ? `<div class="cls-grid">${cards}</div>` : `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-door-open"></i></div>
        <h3>لا توجد فصول دراسية بعد</h3>
        <p>${_T.addFirstCls}</p>
        <button class="btn btn-primary" onclick="Pages.addClassModal()"><i class="fas fa-plus"></i> إضافة فصل</button>
      </div>`}
    `;
  },
```

- [ ] **Step 2:** `node --check app.js` → OK. `grep -c "cls-grid\|cls-card" app.js` > 0. `grep -c "_xlWidget(" app.js` >= 1 (لم يُحذف).
- [ ] **Step 3:** commit:
```bash
git add app.js && git commit -m "🚪 إعادة كتابة صفحة فصولي بكروت نظيفة"
```

---

## Task 3: مساحة عمل الفصل (ترويسة classDetail + إغلاق المبدّل)

**Files:** Modify: `app.js` — (أ) استبدل كتلة الترويسة داخل `classDetail`، (ب) أضِف سطر إغلاق المبدّل في معالج النقر داخل `App.init`.

- [ ] **Step 1: استبدال ترويسة classDetail**

داخل `classDetail`، استبدل من السطر `const clrDot = cls.color || '#3B82F6';` حتى نهاية تعريف `const header = \`...\`;` (ينتهي بـ `</div>\`;` قبل `let body = '';`) بهذا:

```javascript
    const clr = cls.color || '#4f46e5';
    const cnt = list.length;
    const initials = (cls.name||'').replace(/[^0-9ء-ي]/g,'').slice(0,2);
    const bookTab = Books.forClass(cls)
      ? `<button class="cw-tab ${tab==='book'?'active':''}" onclick="Pages.classDetail({classId:'${selId}',tab:'book'})"><i class="fas fa-book-open"></i> الكتاب والعروض</button>`
      : '';
    const header = `
      <div class="cw-crumb"><b onclick="Router.go('classes')">فصولي</b> ‹ ${cls.name}</div>
      <div class="cw-head">
        <div class="cw-avatar" style="background:${clr}">${initials}</div>
        <div class="cw-title">
          <div class="cw-name">${cls.name}</div>
          <div class="cw-sub">${cls.subject ? cls.subject + ' · ' : ''}${cnt} ${_T.stu}</div>
        </div>
        <div class="cw-switch" id="cw-switch">
          <button class="cw-switch-btn" onclick="document.getElementById('cw-switch').classList.toggle('open')">
            <i class="fas fa-repeat"></i> تبديل الفصل <i class="fas fa-chevron-down" style="font-size:.7rem"></i>
          </button>
          <div class="cw-switch-menu">
            ${classes.map(c => `<div class="cw-switch-item" onclick="Router.go('classDetail',{classId:'${c.id}',tab:'${tab==='book' && !Books.forClass(c) ? 'att' : tab}'})">
              <span class="dot" style="background:${c.color||'#4f46e5'}"></span> ${c.name}${c.id===selId?' <i class="fas fa-check" style="margin-inline-start:auto;color:var(--primary)"></i>':''}
            </div>`).join('')}
          </div>
        </div>
        <button class="cls-btn icon" style="flex:0 0 auto" onclick="Pages.addClassModal('${selId}')" title="تعديل الفصل"><i class="fas fa-edit"></i></button>
      </div>
      <div class="cw-tabs">
        <button class="cw-tab ${tab==='att'?'active':''}" onclick="Pages.classDetail({classId:'${selId}',tab:'att',date:'${selDate}'})"><i class="fas fa-clipboard-check"></i> الحضور والسلوك</button>
        <button class="cw-tab" onclick="Router.go('grades',{classId:'${selId}'})"><i class="fas fa-star"></i> الدرجات</button>
        <button class="cw-tab ${tab==='groups'?'active':''}" onclick="Pages.classDetail({classId:'${selId}',tab:'groups'})"><i class="fas fa-object-group"></i> المجموعات</button>
        ${bookTab}
        <button class="cw-tab ${tab==='manage'?'active':''}" onclick="Pages.classDetail({classId:'${selId}',tab:'manage'})"><i class="fas fa-users-gear"></i> الطلاب</button>
      </div>`;
```

- [ ] **Step 2: إغلاق المبدّل عند النقر خارجه**

في `App.init`، داخل `document.addEventListener('click', e => { ... })` (يحتوي بالفعل على إغلاق `.st-avatar-wrap`)، أضِف سطراً جديداً بعد سطر `.st-avatar-wrap`:

```javascript
      if (!e.target.closest('.cw-switch')) document.getElementById('cw-switch')?.classList.remove('open');
```

- [ ] **Step 3:** `node --check app.js` → OK. `grep -c "cw-crumb\|cw-tabs\|cw-switch" app.js` > 0. `grep -c "cd-header\|cd-tabs" app.js` == 0 (الترويسة القديمة أُزيلت).
- [ ] **Step 4:** commit:
```bash
git add app.js && git commit -m "🗂️ مساحة عمل الفصل: مسار تنقّل + مبدّل فصل + تبويبات نظيفة"
```

---

## Task 4: رفع النسخة + تحقق شامل

- [ ] **Step 1:** ارفع `?v=16`→`?v=17` في index.html (style.css و app.js). commit `🔖 رفع نسخة الأصول إلى v=17`.
- [ ] **Step 2 (المنسّق):** تحقق بصري: صفحة فصولي (كروت نظيفة، أزرار)، دخول فصل → مساحة العمل (breadcrumb، الاسم، مبدّل الفصل يفتح ويبدّل، التبويبات النظيفة، التبديل بين att/groups/manage/book يعمل، تبويب الدرجات ينقل لصفحة الدرجات). جوال. لا أخطاء console.
- [ ] **Step 3:** لقطات إثبات (فصولي + مساحة العمل، ديسكتوب + جوال).

## ملاحظات
- تبويب "الدرجات" ينقل لصفحة الدرجات المستقلة (لها تخطيطها) — دمجها الكامل في المرحلة ٥. تبويب "الطلاب" = جسم `manage` الحالي.
- جدول الحضور (`_cdAttBody`) يبقى إكسل — المرحلة ٤.
