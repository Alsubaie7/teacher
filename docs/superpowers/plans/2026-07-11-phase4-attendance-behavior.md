# المرحلة ٤: استبدال ثيم الإكسل — الحضور والسلوك — خطة التنفيذ

> **للمنفّذ الآلي:** SUB-SKILL: superpowers:subagent-driven-development. مربّعات `- [ ]`.

**الهدف:** استبدال جدول الحضور والسلوك بأسلوب الإكسل (`_cdAttBody`: رأس أخضر، أعمدة A/B/C/K، صيغة `=COUNTIF`) بجدول احترافي نظيف: زرّ مقسّم للحضور (حاضر/متأخر/غائب) + شارات سلوك قابلة للنقر + ملخّص بشارات ملوّنة. **مع الحفاظ على كل الوظائف** (الحضور، تتبّع السلوك، الحفظ التلقائي، النرد، الطباعة).

**المعمارية:** إعادة كتابة `Pages._cdAttBody` (HTML الجدول) + `Pages._xlRefreshRow` (التحديث المباشر) + إزالة تخصيص `content.style` للتبويب att في `classDetail`. الدوال `setAtt` (وسيطان)، `markAll`، `incBehavior` تبقى **دون تغيير** لأن التصميم الجديد يحافظ على نفس معرّفات العناصر التي تعتمد عليها: `ar-${id}` (الصف)، `ar-att-${id}-${key}` (أزرار الحضور)، `beh-${id}-${key}` (عدّاد السلوك)، `ar-cnt-present/late/absent` (الملخّص). أنماط CSS جديدة (`att2-*`).

**التقنية:** vanilla JS/CSS. تحقّق بصري. بعد التعديل ارفع `?v=` في index.html.

**ثوابت لا تُكسر:** معرّفات العناصر أعلاه؛ معالجات `Pages.setAtt`, `Pages.markAll`, `Pages.incBehavior`, `Pages.diceRoll`, `Pages.studentProfile`, `Print.attendance`, `Pages.classDetail`. `BEH_TYPES` (٨ سلوكيات: key/label/emoji/color/pos/warnAt).

---

## Task 1: أنماط الحضور والسلوك النظيفة (CSS)

**Files:** Modify: `style.css` (أضِف قبل قسم `SETUP / AUTH SCREEN`).

- [ ] **Step 1: إضافة الأنماط**

```css
/* ============================================================
   ATTENDANCE + BEHAVIOR (clean, replaces excel)
   ============================================================ */
.att2-toolbar { display: flex; align-items: center; gap: .7rem; margin-bottom: 1rem; flex-wrap: wrap; }
.att2-date { display: flex; align-items: center; gap: .5rem; background: var(--surface); border: 1px solid var(--border); border-radius: 11px; padding: .45rem .8rem; font-weight: 800; font-size: .85rem; color: var(--text-secondary); }
.att2-date input { border: none; background: none; font-family: inherit; font-weight: 800; color: var(--text-primary); font-size: .85rem; }
.att2-tool-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: .5rem .8rem; font-weight: 800; font-size: .8rem; cursor: pointer; font-family: inherit; color: var(--text-secondary); display: flex; align-items: center; gap: .4rem; }
.att2-tool-btn:hover { border-color: var(--primary); color: var(--primary); }
.att2-chips { display: flex; gap: .5rem; margin-inline-start: auto; flex-wrap: wrap; }
.att2-chip { border-radius: 10px; padding: .45rem .8rem; font-weight: 800; font-size: .8rem; }
.att2-chip.p { background: var(--green-soft); color: var(--green); }
.att2-chip.l { background: var(--orange-soft); color: var(--orange); }
.att2-chip.a { background: var(--red-soft); color: var(--red); }
.att2-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.att2-scroll { overflow-x: auto; }
.att2-table { width: 100%; border-collapse: collapse; }
.att2-table thead th { text-align: right; font-size: .76rem; color: var(--text-muted); font-weight: 800; padding: .8rem 1rem; background: var(--surface-2); border-bottom: 1px solid var(--border); white-space: nowrap; }
.att2-table td { padding: .6rem 1rem; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
.att2-table tbody tr:last-child td { border-bottom: 0; }
.att2-row.att2-absent { background: rgba(220,38,38,.05); }
.att2-row.att2-late { background: rgba(217,119,6,.05); }
.att2-stu { display: flex; align-items: center; gap: .6rem; cursor: pointer; }
.att2-ini { width: 34px; height: 34px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); display: grid; place-items: center; font-weight: 800; font-size: .8rem; flex-shrink: 0; }
.att2-name { font-weight: 800; font-size: .9rem; white-space: nowrap; }
.att2-seg-wrap { display: inline-flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.att2-seg { padding: .42rem .85rem; font-weight: 800; font-size: .78rem; color: var(--text-muted); cursor: pointer; background: var(--surface); border: none; border-inline-start: 1px solid var(--border); font-family: inherit; white-space: nowrap; }
.att2-seg:first-child { border-inline-start: none; }
.att2-seg.att2-seg-present.active { background: var(--green); color: #fff; }
.att2-seg.att2-seg-late.active { background: var(--orange); color: #fff; }
.att2-seg.att2-seg-absent.active { background: var(--red); color: #fff; }
.att2-behs { display: flex; gap: .35rem; flex-wrap: wrap; }
.att2-beh { display: inline-flex; align-items: center; gap: .25rem; border: 1px solid var(--border); border-radius: 999px; padding: .25rem .5rem; cursor: pointer; background: var(--surface); transition: var(--transition); font-size: .85rem; line-height: 1; }
.att2-beh:hover { border-color: var(--primary); background: var(--surface-hover); }
.att2-beh-count { font-weight: 900; font-size: .72rem; min-width: .5rem; }
.att2-warn { color: var(--red); margin-inline-start: .35rem; font-size: .78rem; }
.att2-foot { padding: .6rem 1rem; color: var(--text-muted); font-size: .78rem; font-weight: 700; background: var(--surface-2); border-top: 1px solid var(--border); display: flex; align-items: center; gap: .4rem; }
.att2-foot i { color: var(--green); }
```

- [ ] **Step 2:** `grep -c "{" style.css` == `grep -c "}" style.css`.
- [ ] **Step 3:** commit:
```bash
cd /Users/mac/Desktop/teacher && git add style.css && git commit -m "💅 أنماط الحضور والسلوك النظيفة (بديل الإكسل)"
```

---

## Task 2: إعادة كتابة `_cdAttBody` + إزالة تخصيص content.style

**Files:** Modify: `app.js` — (أ) استبدل دالة `_cdAttBody(selId, list, map, selDate) { ... }` بالكامل، (ب) عدّل ٣ أسطر `content.style` في نهاية `classDetail`.

- [ ] **Step 1: استبدال `_cdAttBody`**

استبدل **كامل الدالة** `_cdAttBody(selId, list, map, selDate) { ... },` (تبدأ حوالي السطر 2205، وتحتوي `xl-titlebar`, `xl-table`, `=COUNTIF`, `BEH_TYPES.map`) بهذه:

```javascript
  _cdAttBody(selId, list, map, selDate) {
    if (!list.length) return `
      <div class="cd-att-bar">
        <button class="btn btn-sm btn-outline" onclick="Pages.bulkStudentsModal('${selId}')"><i class="fas fa-list"></i> إضافة جماعية</button>
        <button class="btn btn-sm btn-primary" onclick="Pages.addStudentModal('${selId}')"><i class="fas fa-user-plus"></i> إضافة ${_T.stu}</button>
      </div>
      <div class="empty-state"><div class="empty-icon"><i class="fas fa-user-plus"></i></div>
        <h3>لا يوجد ${_T.theStus} في هذا الفصل</h3>
        <button class="btn btn-primary" onclick="Pages.addStudentModal('${selId}')"><i class="fas fa-user-plus"></i> إضافة ${_T.stu}</button>
      </div>`;

    const counts = { present: 0, late: 0, absent: 0 };
    list.forEach(s => counts[map[s.id] || 'present']++);

    const rows = list.map((s, i) => {
      const st = map[s.id] || 'present';
      const seg = ['present','late','absent'].map(key => {
        const lbl = { present:'حاضر', late:'متأخر', absent:'غائب' }[key];
        return `<button id="ar-att-${s.id}-${key}" class="att2-seg att2-seg-${key} ${st===key?'active':''}" onclick="Pages.setAtt('${s.id}','${key}')">${lbl}</button>`;
      }).join('');
      const behs = BEH_TYPES.map(b => {
        const val = s.behaviors?.[b.key] || 0;
        return `<span class="att2-beh" onclick="Pages.incBehavior('${s.id}','${b.key}','${selId}')" title="${b.label}">${b.emoji}<span class="att2-beh-count" id="beh-${s.id}-${b.key}" style="color:${b.color}">${val||''}</span></span>`;
      }).join('');
      const warn = _behWarn(s).length ? `<i class="fas fa-triangle-exclamation att2-warn" title="${_behWarn(s).map(b=>b.label).join('، ')}"></i>` : '';
      return `<tr id="ar-${s.id}" class="att2-row att2-${st}">
        <td style="color:var(--text-muted);font-size:.8rem;width:36px">${i+1}</td>
        <td><div class="att2-stu" onclick="Pages.studentProfile('${s.id}')"><span class="att2-ini">${s.name.charAt(0)}</span><span class="att2-name">${s.name}${warn}</span></div></td>
        <td><div class="att2-seg-wrap">${seg}</div></td>
        <td><div class="att2-behs">${behs}</div></td>
      </tr>`;
    }).join('');

    return `
      <div class="att2-toolbar">
        <div class="att2-date"><i class="fas fa-calendar-alt"></i><input type="date" value="${selDate}" onchange="Pages.classDetail({classId:'${selId}',tab:'att',date:this.value})"></div>
        <button class="att2-tool-btn" onclick="Pages.markAll('present')"><i class="fas fa-check-double"></i> تحضير الكل</button>
        <button class="att2-tool-btn" onclick="Pages.markAll('absent')"><i class="fas fa-user-xmark"></i> تغييب الكل</button>
        <button class="att2-tool-btn" onclick="Pages.diceRoll('${selId}')" title="اختيار عشوائي"><i class="fas fa-dice"></i></button>
        <button class="att2-tool-btn" onclick="Print.attendance('${selId}','${selDate}')" title="طباعة"><i class="fas fa-print"></i></button>
        <div class="att2-chips">
          <span class="att2-chip p" id="ar-cnt-present">حاضر ${counts.present}</span>
          <span class="att2-chip l" id="ar-cnt-late">متأخر ${counts.late}</span>
          <span class="att2-chip a" id="ar-cnt-absent">غائب ${counts.absent}</span>
        </div>
      </div>
      <div class="att2-card">
        <div class="att2-scroll">
          <table class="att2-table">
            <thead><tr><th style="width:36px">#</th><th>الطالب</th><th>الحضور</th><th>السلوك اليوم</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="att2-foot"><i class="fas fa-cloud"></i> يُحفظ تلقائياً عند كل تغيير</div>
      </div>`;
  },
```

- [ ] **Step 2: إزالة تخصيص content.style للتبويب att**

في نهاية دالة `classDetail`، توجد هذه الأسطر:
```javascript
    content.innerHTML = header + body;
    // att tab needs flex layout to fill height
    content.style.display = tab === 'att' ? 'flex' : '';
    content.style.flexDirection = tab === 'att' ? 'column' : '';
    content.style.overflow = tab === 'att' ? 'hidden' : '';
```
استبدلها بـ (التصميم الجديد تدفّق عادي، لا يحتاج flex/overflow):
```javascript
    content.innerHTML = header + body;
    content.style.display = '';
    content.style.flexDirection = '';
    content.style.overflow = '';
```

- [ ] **Step 3:** `node --check app.js` → OK. `grep -c "att2-table\|att2-seg\|att2-beh" app.js` > 0. `grep -c "xl-titlebar\|=COUNTIF" app.js` == 0 (بقايا إكسل الحضور أُزيلت — ملاحظة: `_xlWidget` قد تحتوي `xl-*` أخرى في صفحات لم تُحدّث بعد، لكن `=COUNTIF` يجب أن تصبح 0).

- [ ] **Step 4:** commit:
```bash
git add app.js && git commit -m "📋 استبدال جدول الحضور والسلوك بتصميم احترافي نظيف"
```

---

## Task 3: إعادة كتابة `_xlRefreshRow` للتصميم الجديد

**Files:** Modify: `app.js` — استبدل دالة `_xlRefreshRow(stuId, status) { ... }` بالكامل.

- [ ] **Step 1: استبدال الدالة**

استبدل **كامل** `_xlRefreshRow(stuId, status) { ... },` (تستخدم `cfColors` وأنماط inline وأعمدة `td:nth-child`) بهذه:

```javascript
  _xlRefreshRow(stuId, status) {
    const row = document.getElementById(`ar-${stuId}`);
    if (row) {
      row.classList.remove('att2-present','att2-late','att2-absent');
      row.classList.add('att2-' + status);
    }
    ['present','late','absent'].forEach(key => {
      const btn = document.getElementById(`ar-att-${stuId}-${key}`);
      if (btn) btn.classList.toggle('active', key === status);
    });
    const students = Pages._attStudents || [];
    const counts = { present: 0, late: 0, absent: 0 };
    students.forEach(s => counts[Pages._currentAtt?.[s.id] || 'present']++);
    const pEl = document.getElementById('ar-cnt-present');
    const lEl = document.getElementById('ar-cnt-late');
    const aEl = document.getElementById('ar-cnt-absent');
    if (pEl) pEl.textContent = `حاضر ${counts.present}`;
    if (lEl) lEl.textContent = `متأخر ${counts.late}`;
    if (aEl) aEl.textContent = `غائب ${counts.absent}`;
  },
```

- [ ] **Step 2:** `node --check app.js` → OK. `grep -c "cfColors" app.js` — لاحظ العدد (قد يبقى في مواضع أخرى، لكن ليس داخل `_xlRefreshRow`). `grep -c "att2-" app.js` > 0.

- [ ] **Step 3:** commit:
```bash
git add app.js && git commit -m "🔄 تحديث _xlRefreshRow لجدول الحضور الجديد"
```

---

## Task 4: رفع النسخة + تحقق شامل

- [ ] **Step 1:** ارفع `?v=18`→`?v=19` (style.css و app.js) في index.html. commit `🔖 رفع نسخة الأصول إلى v=19`.
- [ ] **Step 2 (المنسّق):** تحقّق بصري: دخول فصل → تبويب "الحضور والسلوك". تحقّق:
  - جدول نظيف: عمود الطالب (أفاتار+اسم)، الحضور (زر مقسّم حاضر/متأخر/غائب)، السلوك (شارات إيموجي قابلة للنقر).
  - نقر "غائب" لطالب → الزر يصير أحمر، الصف يتلوّن، ملخّص الغائب يزيد.
  - نقر شارة سلوك → العدّاد يزيد.
  - "تحضير الكل" / "تغييب الكل" يعملان ويحدّثان الملخّص.
  - لا رأس إكسل أخضر، لا `A/B/C`, لا `=COUNTIF`.
  - جوال: الجدول يمرّر أفقياً بلا كسر التخطيط.
  - لا أخطاء console.
- [ ] **Step 3:** لقطات إثبات (ديسكتوب + جوال).

## ملاحظات
- الحفظ التلقائي عبر `setAtt`→`saveAtt` (لم يتغيّر).
- تتبّع السلوك محفوظ (شارات بدل خلايا الإكسل)؛ `incBehavior` دون تغيير.
- تحذيرات السلوك تظهر كأيقونة ⚠️ بجانب الاسم + Toast عند بلوغ الحد.
