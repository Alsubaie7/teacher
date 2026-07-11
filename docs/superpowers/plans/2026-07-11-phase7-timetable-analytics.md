# المرحلة ٧: الجدول + التحليلات — خطة التنفيذ

> **للمنفّذ الآلي:** SUB-SKILL: superpowers:subagent-driven-development. مربّعات `- [ ]`.

**الهدف:** (١) استبدال ثيم الإكسل في لوحة التحليلات (٤ بطاقات + مخططان + جدول مقارنة + قائمة اهتمام، كلها برأس إكسل أخضر `xl-titlebar`) بتصميم نيلي نظيف. (٢) إصلاح خلل بسيط في الجدول (`entry.subject` تظهر `undefined`).

**المعمارية:** أنماط `an2-*` جديدة في `style.css` (بادئة جديدة لتجنّب أي تصادم) + إعادة كتابة كتلة العرض (render) داخل `analytics()` مع الحفاظ على كل تجهيز البيانات ودوال SVG (`_donut`, `_spark`) ودالة الفرز (`sortAnalytics`). + تعديل سطر واحد في `lessons()`.

**التقنية:** vanilla JS/CSS. تحقّق بصري. بعد التعديل ارفع `?v=` في index.html.

**ثوابت لا تُكسر:** `Pages.sortAnalytics`, `Pages.studentProfile`, `Router.go`، متغيّرات analytics (`classStats`, `distMap`, `donutSegs`, `distTotal`, `passingCount`, `trendData`, `trendLabels`, `avgTrend`, `totalStudents`, `totalAbs`, `avgAttRate`, `needsAtt`, `sorted`, `arrow`, `sevStyle`, `_donut`, `_spark`) — تبقى كما هي.

---

## Task 1: أنماط التحليلات النظيفة (CSS)

**Files:** Modify: `style.css` (أضِف قبل قسم `SETUP / AUTH SCREEN`).

- [ ] **Step 1: إضافة الأنماط**

```css
/* ============================================================
   ANALYTICS (clean, replaces excel)
   ============================================================ */
.an2-kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 1.2rem; }
.an2-kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 1rem 1.1rem; }
.an2-kpi-top { margin-bottom: .5rem; }
.an2-kpi-val { font-size: 1.7rem; font-weight: 900; }
.an2-kpi-lbl { font-size: .82rem; color: var(--text-muted); font-weight: 700; margin-top: .2rem; }
.an2-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-bottom: 1.2rem; }
.an2-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 1.2rem; }
.an2-hd { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .85rem 1.1rem; border-bottom: 1px solid var(--border); }
.an2-hd h3 { font-size: .95rem; font-weight: 800; display: flex; align-items: center; gap: .5rem; }
.an2-hd h3 i { color: var(--primary); }
.an2-hd-meta { font-size: .78rem; color: var(--text-muted); font-weight: 700; }
.an2-bd { padding: 1.1rem; }
.an2-table { width: 100%; border-collapse: collapse; min-width: 520px; }
.an2-table thead th { text-align: right; font-size: .76rem; color: var(--text-muted); font-weight: 800; padding: .7rem .8rem; background: var(--surface-2); border-bottom: 1px solid var(--border); white-space: nowrap; cursor: pointer; }
.an2-table td { padding: .6rem .8rem; border-bottom: 1px solid var(--border-subtle); font-size: .85rem; }
.an2-table tbody tr:last-child td { border-bottom: 0; }
.an2-table tbody tr:hover { background: var(--surface-hover); cursor: pointer; }
.an2-pill { display: inline-block; border-radius: 8px; padding: .2rem .5rem; font-weight: 800; font-size: .8rem; }
.an2-pill.ok { background: var(--green-soft); color: var(--green); }
.an2-pill.mid { background: var(--orange-soft); color: var(--orange); }
.an2-pill.bad { background: var(--red-soft); color: var(--red); }
.an2-att-row { display: flex; align-items: center; gap: .75rem; padding: .7rem .3rem; border-bottom: 1px solid var(--border-subtle); cursor: pointer; }
.an2-att-row:last-child { border-bottom: 0; }
.an2-att-row:hover { background: var(--surface-hover); }
.an2-att-avatar { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: .85rem; flex-shrink: 0; border: 1px solid; }
.an2-att-name { font-weight: 800; font-size: .9rem; }
.an2-att-meta { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; margin-top: .2rem; }
.an2-att-tag { border-radius: 8px; padding: .12rem .45rem; font-size: .7rem; font-weight: 800; }
.an2-att-tag.tag-abs { background: var(--red-soft); color: var(--red); }
.an2-att-tag.tag-fail { background: var(--orange-soft); color: var(--orange); }
.an2-att-tag.tag-beh { background: #f3e8ff; color: #7c3aed; }
@media (max-width: 860px) { .an2-kpi-grid { grid-template-columns: repeat(2,1fr); } .an2-two-col { grid-template-columns: 1fr; } }
```

- [ ] **Step 2:** `grep -c "{" style.css` == `grep -c "}" style.css`. `grep -c "an2-card\|an2-kpi\|an2-table" style.css` > 0.
- [ ] **Step 3:** commit `💅 أنماط لوحة التحليلات النظيفة`.

---

## Task 2: إعادة كتابة عرض `analytics()`

**Files:** Modify: `app.js` — استبدل كتلة العرض داخل `analytics()`.

- [ ] **Step 1: استبدال كتلة العرض**

أولاً افتح الملف واقرأ دالة `analytics()`. ابحث عن السطر الذي يبدأ به بناء المحتوى:
`    document.getElementById('content').innerHTML = ``
(هو الذي يليه `<div class="page-header">` و`لوحة التحليلات`، ويحتوي `xl-titlebar` و`xl-table`). هذه الكتلة تمتد حتى سطر الإغلاق ``    `;`` الذي يسبق مباشرةً `  },` (إغلاق دالة analytics).

استبدل **كامل** هذه الكتلة (من `    document.getElementById('content').innerHTML = `` حتى ``    `;`` قبل `  },`) بما يلي — لاحظ إضافة دالة `_pill` المساعدة في البداية:

```javascript
    const _pill = (v, type) => {
      if (v === null) return '<span style="color:var(--text-muted)">—</span>';
      const thr = type === 'att' ? [85,70] : [80,60];
      const c = v >= thr[0] ? 'ok' : v >= thr[1] ? 'mid' : 'bad';
      return `<span class="an2-pill ${c}">${v}${type==='att'?'%':''}</span>`;
    };

    document.getElementById('content').innerHTML = `
      <div class="dash-greet"><h1><i class="fas fa-chart-bar" style="color:var(--primary)"></i> لوحة التحليلات</h1></div>
      <div class="an2-kpi-grid">
        ${[
          {val:totalStudents, lbl:'إجمالي الطلاب', icon:'fa-users', ic:'indigo'},
          {val:classes.length, lbl:'الفصول الدراسية', icon:'fa-door-open', ic:'blue'},
          {val:avgAttRate!==null?avgAttRate+'%':'—', lbl:'متوسط الحضور', icon:'fa-clipboard-check', ic:avgAttRate===null?'blue':avgAttRate>=80?'green':avgAttRate>=60?'orange':'red'},
          {val:totalAbs, lbl:'إجمالي الغيابات', icon:'fa-user-xmark', ic:'red'},
        ].map(k => `
          <div class="an2-kpi">
            <div class="an2-kpi-top"><span class="dash-stat-ic ${k.ic}"><i class="fas ${k.icon}"></i></span></div>
            <div class="an2-kpi-val">${k.val}</div>
            <div class="an2-kpi-lbl">${k.lbl}</div>
          </div>`).join('')}
      </div>

      <div class="an2-two-col">
        <div class="an2-card" style="margin-bottom:0">
          <div class="an2-hd"><h3><i class="fas fa-chart-line"></i> اتجاه الحضور — ١٤ يوم</h3>${avgTrend!==null?`<span class="an2-hd-meta">متوسط ${avgTrend}%</span>`:''}</div>
          <div class="an2-bd">
            ${_spark(trendData)}
            <div style="display:flex;justify-content:space-between;font-size:.68rem;color:var(--text-muted);margin-top:.3rem"><span>${trendLabels[0]}</span><span>${trendLabels[6]}</span><span>${trendLabels[13]}</span></div>
          </div>
        </div>
        <div class="an2-card" style="margin-bottom:0">
          <div class="an2-hd"><h3><i class="fas fa-chart-pie"></i> توزيع التقديرات</h3>${distTotal>0?`<span class="an2-hd-meta">${distTotal} طالب</span>`:''}</div>
          <div class="an2-bd" style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
            ${distTotal===0
              ? `<div style="color:var(--text-muted);font-size:.85rem;text-align:center;width:100%;padding:1rem">لا توجد درجات مسجّلة</div>`
              : `<div style="flex-shrink:0"><svg viewBox="0 0 100 100" width="110" height="110">
                  <circle cx="50" cy="50" r="36" fill="none" stroke="var(--surface-2)" stroke-width="16"/>
                  ${_donut(donutSegs)}
                  <text x="50" y="46" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">${distTotal>0?Math.round(passingCount/distTotal*100):0}%</text>
                  <text x="50" y="58" text-anchor="middle" font-size="6.5" fill="var(--text-muted)">ناجحون</text>
                </svg></div>
                <div style="flex:1;min-width:80px">
                  ${donutSegs.map(s=>`<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.35rem">
                    <span style="width:11px;height:11px;border-radius:3px;background:${s.color};flex-shrink:0;display:inline-block"></span>
                    <span style="font-size:.78rem;color:var(--text-secondary);font-weight:700;flex:1">${s.label}</span>
                    <span style="font-size:.78rem;color:var(--text-muted);font-weight:800">${s.count}</span>
                  </div>`).join('')}
                </div>`}
          </div>
        </div>
      </div>

      <div class="an2-card">
        <div class="an2-hd"><h3><i class="fas fa-table-columns"></i> مقارنة الفصول</h3><span class="an2-hd-meta">${classes.length} فصل</span></div>
        <div style="overflow-x:auto">
          <table class="an2-table">
            <thead><tr>
              <th style="width:32px">#</th>
              <th>اسم الفصل</th>
              <th onclick="Pages.sortAnalytics('stus')">الطلاب ${arrow('stus')}</th>
              <th onclick="Pages.sortAnalytics('sessions')">الجلسات ${arrow('sessions')}</th>
              <th onclick="Pages.sortAnalytics('attRate')">الحضور ${arrow('attRate')}</th>
              <th onclick="Pages.sortAnalytics('avgGrade')">متوسط الدرجة ${arrow('avgGrade')}</th>
              <th onclick="Pages.sortAnalytics('posBeh')">التفاعل ${arrow('posBeh')}</th>
            </tr></thead>
            <tbody>
              ${sorted.map((x,i) => `<tr onclick="Router.go('classDetail',{classId:'${x.cls.id}'})">
                <td style="color:var(--text-muted)">${i+1}</td>
                <td style="font-weight:800;color:var(--primary)">${x.cls.name}</td>
                <td>${x.stus}</td>
                <td style="color:var(--text-muted)">${x.sessions}</td>
                <td>${_pill(x.attRate,'att')}</td>
                <td>${_pill(x.avgGrade,'grade')}</td>
                <td style="font-weight:800;color:#7c3aed">${x.posBeh}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="an2-card">
        <div class="an2-hd"><h3><i class="fas fa-bell"></i> طلاب يحتاجون اهتمام</h3>${needsAtt.length?`<span class="an2-hd-meta">${needsAtt.length} طالب</span>`:''}</div>
        <div class="an2-bd" style="padding:.4rem 1.1rem">
          ${needsAtt.length===0
            ? `<div style="text-align:center;padding:1.2rem;color:var(--text-muted)"><i class="fas fa-circle-check" style="color:var(--green)"></i> ممتاز — لا يوجد طلاب بحاجة لتدخل حالياً</div>`
            : needsAtt.map(({s,cls,absCount,tot,negBeh,sev}) => {
                const st = sevStyle(sev);
                return `<div class="an2-att-row" onclick="Pages.studentProfile('${s.id}')">
                  <div class="an2-att-avatar" style="background:${st.bg};color:${st.color};border-color:${st.border}">${s.name.charAt(0)}</div>
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">
                      <div class="an2-att-name">${s.name}</div>
                      <span style="padding:.12rem .5rem;border-radius:8px;font-size:.68rem;font-weight:800;${st.badge}">${st.label}</span>
                    </div>
                    <div class="an2-att-meta">
                      <span style="color:var(--text-muted);font-size:.78rem">${cls?.name||'—'}</span>
                      ${absCount>=1?`<span class="an2-att-tag tag-abs">غاب ${absCount}</span>`:''}
                      ${tot!==null&&tot<60?`<span class="an2-att-tag tag-fail">درجة ${tot}</span>`:''}
                      ${negBeh>=2?`<span class="an2-att-tag tag-beh">سلوك ${negBeh}</span>`:''}
                    </div>
                  </div>
                  <i class="fas fa-chevron-left" style="color:var(--text-dim);font-size:.75rem;flex-shrink:0"></i>
                </div>`;
              }).join('')}
        </div>
      </div>
    `;
```

- [ ] **Step 2:** `node --check app.js` → OK. `grep -c "an2-kpi-grid\|an2-card" app.js` > 0. عزْل دالة `analytics()` وتأكّد `xl-titlebar` و`xl-table` لم تعودا داخلها (قد تبقيان في دوال أخرى — المهم analytics نظيفة).
- [ ] **Step 3:** commit `📊 إعادة كتابة لوحة التحليلات بتصميم نيلي نظيف`.

---

## Task 3: إصلاح خلل "undefined" في الجدول

**Files:** Modify: `app.js` — سطر واحد في `lessons()`.

- [ ] **Step 1:** ابحث عن السطر داخل `lessons()`:
```javascript
            <div class="tt-subject">${entry.subject}</div>
```
واستبدله بـ (fallback لمادة الفصل):
```javascript
            <div class="tt-subject">${entry.subject || cls.subject || ''}</div>
```

- [ ] **Step 2:** `node --check app.js` → OK. `grep -c "entry.subject || cls.subject" app.js` == 1.
- [ ] **Step 3:** commit `🐛 إصلاح مادة الحصة في الجدول (fallback لمادة الفصل)`.

---

## Task 4: رفع النسخة + تحقق شامل

- [ ] **Step 1:** ارفع `?v=22`→`?v=23` (style.css و app.js). commit `🔖 رفع نسخة الأصول إلى v=23`.
- [ ] **Step 2 (المنسّق):** تحقّق بصري:
  - التحليلات: ٤ بطاقات نظيفة، مخططان (اتجاه الحضور + توزيع التقديرات) بعناوين نظيفة، جدول مقارنة **بلا A/B/C ولا رأس أخضر** (شارات ملوّنة للحضور/الدرجة)، قائمة اهتمام نظيفة. الفرز بالنقر على العناوين يعمل.
  - الجدول: الخلية المعبّأة تعرض المادة (لا "undefined").
  - جوال: البطاقات عمودان، الجداول تمرّر أفقياً.
  - لا رأس إكسل أخضر، لا أخطاء console.
- [ ] **Step 3:** لقطات إثبات (ديسكتوب + جوال).

## ملاحظات
- دوال `_donut` و`_spark` (SVG) بقيت كما هي؛ ألوانها دلالية (أخضر/كهرماني/أحمر حسب القيمة) وتبقى.
- دالة `cf` القديمة (تنسيق شرطي إكسل) لم تعد مستخدمة بعد إضافة `_pill`؛ اتركها معرّفة (حذفها اختياري).
