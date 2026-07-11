# المرحلة ٥: الدرجات — خطة التنفيذ

> **للمنفّذ الآلي:** SUB-SKILL: superpowers:subagent-driven-development. مربّعات `- [ ]`.

**الهدف:** (١) إزالة بقايا الأخضر المثبّت في صفحة الدرجات (أفاتار الطلاب + رأس جدول الدرجات) وتحويلها للنيلي. (٢) دمج صفحة الدرجات في **مساحة عمل الفصل** الموحّدة: استبدال ترويسة الدرجات المستقلة + تبويبات الفصل الخاصة بها بنفس ترويسة مساحة العمل (مسار تنقّل + مبدّل فصل + تبويبات `cw-*` مع "الدرجات" نشطة). بذلك يصبح النقر على تبويب "الدرجات" داخل الفصل تجربة موحّدة.

**المعمارية:** تعديل قاعدتين في `style.css` (لون الأفاتار ورأس الجدول) + استبدال كتلة ترويسة `grades()` في `app.js` بترويسة `cw-*`. بقية `grades()` (بطاقات KPI، شريط الأدوات، الفلاتر، الجدول، التوزيع) وكل دوال التفاعل (`saveGradeCell`, `_applyBulkInline`, `_filterGradesRows`, `editSchemaModal`) تبقى **دون تغيير**.

**التقنية:** vanilla JS/CSS. تحقّق بصري. بعد التعديل ارفع `?v=` في index.html.

**ثوابت لا تُكسر:** معالجات `Pages.saveGradeCell`, `Pages._applyBulkInline`, `Pages._filterGradesRows`, `Pages.editSchemaModal`, `Print.grades`, `Router.go`. المتغيّرات داخل `grades()`: `classes`, `cls`, `selId`, `clsStu`, `kpiHtml`, `qf`, `search` (تبقى مستخدمة). أصناف `cw-*` معرّفة مسبقاً (المرحلة ٣). `Books.forClass` عامة.

---

## Task 1: إعادة تلوين الأخضر → نيلي (CSS)

**Files:** Modify: `style.css` — قاعدتان.

- [ ] **Step 1: أفاتار الطالب**

استبدل قاعدة `.student-avatar-sm` (حوالي السطر 620):
```css
.student-avatar-sm {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #047857, #059669);
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: .85rem; font-weight: 700; flex-shrink: 0;
}
```
بـ:
```css
.student-avatar-sm {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--primary);
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: .85rem; font-weight: 700; flex-shrink: 0;
}
```

- [ ] **Step 2: رأس جدول الدرجات**

استبدل قاعدة `.grades-table thead th` (حوالي السطر 815) — غيّر سطرَي الخلفية والحد السفلي فقط:
- استبدل: `  background: linear-gradient(180deg, #047857, #059669) !important;`
  بـ: `  background: var(--primary) !important;`
- استبدل: `  border-bottom: 2px solid #065f46 !important;`
  بـ: `  border-bottom: 2px solid var(--primary-dark) !important;`

- [ ] **Step 3:** `grep -c "047857\|059669" style.css` — يجب أن ينقص العدد (لم تبقَ هذه الظلال الخضراء في الأفاتار/رأس الجدول؛ قد تبقى في أماكن دلالية أخرى مثل تدرّج الأفاتار حسب الدرجة — مقبول).

- [ ] **Step 4:** commit:
```bash
cd /Users/mac/Desktop/teacher && git add style.css && git commit -m "🎨 تحويل أفاتار الطلاب ورأس جدول الدرجات إلى النيلي"
```

---

## Task 2: دمج الدرجات في مساحة عمل الفصل (ترويسة موحّدة)

**Files:** Modify: `app.js` — استبدل كتلة الترويسة داخل `grades()`.

- [ ] **Step 1: استبدال ترويسة الدرجات**

داخل دالة `grades(params = {})`، ابحث عن هذه الكتلة (بداية بناء المحتوى):
```javascript
    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2>الدرجات | Grades</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" onclick="Pages.editSchemaModal('${selId}')"><i class="fas fa-sliders"></i> مخطط الدرجات</button>
          <button class="btn btn-sm btn-outline" onclick="Print.grades('${selId}')"><i class="fas fa-print"></i> طباعة</button>
        </div>
      </div>
      <div class="grades-tabs-bar">${tabs}</div>
```
واستبدلها بهذه (ترويسة مساحة العمل الموحّدة؛ لاحظ أن `${clsStu.length ? \`` بعدها يبقى كما هو):
```javascript
    document.getElementById('content').innerHTML = `
      <div class="cw-crumb"><b onclick="Router.go('classes')">فصولي</b> ‹ ${cls.name}</div>
      <div class="cw-head">
        <div class="cw-avatar" style="background:${cls.color||'#4f46e5'}">${(((cls.gradeLevel||cls.name||'').replace(/الصف|صف/g,'').trim().replace(/^ال/,'').match(/[ء-ي]/)||[''])[0]) + (cls.section||'')}</div>
        <div class="cw-title">
          <div class="cw-name">${cls.name}</div>
          <div class="cw-sub">${cls.subject ? cls.subject + ' · ' : ''}${clsStu.length} ${_T.stu}</div>
        </div>
        <div class="cw-switch" id="cw-switch">
          <button class="cw-switch-btn" onclick="document.getElementById('cw-switch').classList.toggle('open')">
            <i class="fas fa-repeat"></i> تبديل الفصل <i class="fas fa-chevron-down" style="font-size:.7rem"></i>
          </button>
          <div class="cw-switch-menu">
            ${classes.map(c => `<div class="cw-switch-item" onclick="Router.go('grades',{classId:'${c.id}'})">
              <span class="dot" style="background:${c.color||'#4f46e5'}"></span> ${c.name}${c.id===selId?' <i class="fas fa-check" style="margin-inline-start:auto;color:var(--primary)"></i>':''}
            </div>`).join('')}
          </div>
        </div>
        <button class="cls-btn icon" style="flex:0 0 auto" onclick="Pages.editSchemaModal('${selId}')" title="مخطط الدرجات"><i class="fas fa-sliders"></i></button>
        <button class="cls-btn icon" style="flex:0 0 auto" onclick="Print.grades('${selId}')" title="طباعة"><i class="fas fa-print"></i></button>
      </div>
      <div class="cw-tabs">
        <button class="cw-tab" onclick="Router.go('classDetail',{classId:'${selId}',tab:'att'})"><i class="fas fa-clipboard-check"></i> الحضور والسلوك</button>
        <button class="cw-tab active"><i class="fas fa-star"></i> الدرجات</button>
        <button class="cw-tab" onclick="Router.go('classDetail',{classId:'${selId}',tab:'groups'})"><i class="fas fa-object-group"></i> المجموعات</button>
        ${Books.forClass(cls) ? `<button class="cw-tab" onclick="Router.go('classDetail',{classId:'${selId}',tab:'book'})"><i class="fas fa-book-open"></i> الكتاب والعروض</button>` : ''}
        <button class="cw-tab" onclick="Router.go('classDetail',{classId:'${selId}',tab:'manage'})"><i class="fas fa-users-gear"></i> الطلاب</button>
      </div>
```

ملاحظة: المتغيّر `tabs` (تبويبات الدرجات القديمة `grades-class-tab`) لم يعد مستخدماً؛ اتركه معرّفاً كما هو (حذفه اختياري ولا يؤثّر).

- [ ] **Step 2:** `node --check app.js` → OK. `grep -c "cw-crumb\|cw-tab active" app.js` >= 2 (الدرجات + مساحة العمل من المرحلة ٣). `grep -c "الدرجات | Grades" app.js` == 0 (الترويسة القديمة أُزيلت).

- [ ] **Step 3:** commit:
```bash
git add app.js && git commit -m "⭐ دمج صفحة الدرجات في مساحة عمل الفصل الموحّدة"
```

---

## Task 3: رفع النسخة + تحقق شامل

- [ ] **Step 1:** ارفع `?v=20`→`?v=21` (style.css و app.js) في index.html. commit `🔖 رفع نسخة الأصول إلى v=21`.
- [ ] **Step 2 (المنسّق):** تحقّق بصري: دخول فصل → تبويب "الدرجات" (أو `Router.go('grades',{classId})`). تحقّق:
  - ترويسة مساحة العمل تظهر (مسار تنقّل + اسم الفصل + مبدّل + تبويبات مع "الدرجات" نشطة نيلية).
  - بطاقات KPI نظيفة، رأس الجدول **نيلي** (لا أخضر)، أفاتار الطلاب نيلي.
  - إدخال درجة في خانة → تُحفظ (blur)، المجموع والتقدير يتحدّثان.
  - الفلاتر (الكل/الناجحون/الراسبون/لم تُدخل) والبحث يعملان.
  - المبدّل يبدّل الفصل ضمن الدرجات. التبويبات تنقل لمساحة العمل (الحضور/المجموعات/الطلاب).
  - جوال: الجدول يمرّر أفقياً، لا كسر.
  - لا أخطاء console.
- [ ] **Step 3:** لقطات إثبات (ديسكتوب + جوال).

## ملاحظات
- تدرّج ألوان أفاتار الطلاب حسب الدرجة في `avatarStyle` (أخضر≥75/كهرماني≥50/أحمر) دلالي ويبقى.
- ترويسة `cw-*` مكرّرة الآن في `classDetail` و`grades` — تنقيح لاحق (استخراج دالة مشتركة) ممكن في مرحلة التلميع ٩.
