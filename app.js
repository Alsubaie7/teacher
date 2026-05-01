'use strict';

/* ==================== SUPABASE ==================== */
const _SB_URL = 'https://qqlmcibtwonierjctbqr.supabase.co';
const _SB_KEY = 'sb_publishable_-eigM3WhclTHqXEfeDlCHQ_HaTbkaSJ';
const _sb = supabase.createClient(_SB_URL, _SB_KEY);

/* ==================== SHARED HELPERS ==================== */
const _letter = t => {
  if (t >= 90) return 'ممتاز+';   if (t >= 80) return 'ممتاز';
  if (t >= 75) return 'جيد جداً+'; if (t >= 65) return 'جيد جداً';
  if (t >= 60) return 'جيد+';      if (t >= 50) return 'جيد';
  if (t >= 40) return 'مقبول';     return 'راسب';
};
const _letterCss = { 'ممتاز+':'aplus','ممتاز':'a','جيد جداً+':'bplus','جيد جداً':'b','جيد+':'cplus','جيد':'c','مقبول':'d','راسب':'f','—':'-' };

const DEFAULT_GRADE_SCHEMA = [
  { key: 'homework',      label: 'الواجب',             max: 10 },
  { key: 'participation', label: 'المشاركة',            max: 10 },
  { key: 'exam1',         label: 'الاختبار الأول',      max: 20 },
  { key: 'exam2',         label: 'الاختبار الثاني',     max: 20 },
  { key: 'final',         label: 'الاختبار النهائي',    max: 40 },
];
const _schema     = cls => cls?.gradeSchema || DEFAULT_GRADE_SCHEMA;
const _sumBySchema = (grades, schema) =>
  schema.reduce((s, c) => s + (grades[c.key] != null ? Number(grades[c.key]) : 0), 0);
const _sumGrades = g => DEFAULT_GRADE_SCHEMA
  .reduce((a, c) => a + (g[c.key] != null ? Number(g[c.key]) : 0), 0);

const _countAtt = (studentId, status, allAtt) =>
  allAtt.reduce((n, a) => n + a.records.filter(r => r.studentId === studentId && r.status === status).length, 0);

const BEH_TYPES = [
  { key: 'homework',     label: 'حل الواجب',        emoji: '📝', color: '#16a34a', pos: true             },
  { key: 'excellent',    label: 'متميز',             emoji: '⭐', color: '#d97706', pos: true             },
  { key: 'participates', label: 'مشارك',             emoji: '🙋', color: '#2563eb', pos: true             },
  { key: 'correct',      label: 'إجابة صحيحة',       emoji: '✅', color: '#0d9488', pos: true             },
  { key: 'disruptive',   label: 'مشاغب',             emoji: '😈', color: '#dc2626', pos: false, warnAt: 3 },
  { key: 'sleeping',     label: 'نوم أثناء الدرس',   emoji: '😴', color: '#7c3aed', pos: false, warnAt: 2 },
  { key: 'forgot_book',  label: 'نسي الكتاب',        emoji: '🤷', color: '#ea580c', pos: false, warnAt: 3 },
  { key: 'eating',       label: 'أكل داخل الفصل',    emoji: '🍔', color: '#db2777', pos: false, warnAt: 3 },
];
const _bIcon = (b, sm = false) => `<span class="beh-emoji${sm?' beh-emoji-sm':''}">${b.emoji}</span>`;

const _behWarn = s => BEH_TYPES.filter(b => b.warnAt && (s.behaviors?.[b.key]||0) >= b.warnAt);

const Sound = {
  _ctx: null,
  _get() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },
  _note(freq, type, dur, vol, delay = 0) {
    try {
      const ctx = this._get();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur + 0.01);
    } catch (_) {}
  },
  tick(speed = 1) {
    // short click — higher pitch when faster
    this._note(300 + speed * 200, 'sine', 0.04, 0.12);
  },
  land() {
    // dice lands — two quick rising pings
    this._note(600, 'sine', 0.12, 0.25, 0);
    this._note(900, 'sine', 0.18, 0.22, 0.1);
  },
  correct() {
    // cheerful three-note ascending
    this._note(523, 'sine', 0.14, 0.3, 0);
    this._note(659, 'sine', 0.14, 0.3, 0.14);
    this._note(784, 'sine', 0.28, 0.28, 0.28);
  },
  wrong() {
    this._note(350, 'sawtooth', 0.18, 0.2, 0);
    this._note(220, 'sawtooth', 0.28, 0.2, 0.2);
  },
  timerEnd() {
    // three descending then one rising chime
    this._note(880, 'sine', 0.15, 0.3, 0);
    this._note(784, 'sine', 0.15, 0.3, 0.18);
    this._note(659, 'sine', 0.15, 0.3, 0.36);
    this._note(880, 'sine', 0.4,  0.35, 0.6);
  },
};

const GRADE_LEVELS = [
  'أول ابتدائي','ثاني ابتدائي','ثالث ابتدائي',
  'رابع ابتدائي','خامس ابتدائي','سادس ابتدائي',
  'أول متوسط','ثاني متوسط','ثالث متوسط',
  'أول ثانوي','ثاني ثانوي','ثالث ثانوي'
];
const SECTIONS_LETTERS = ['أ','ب','ج','د','هـ','و','ز','ح'];
const SECTIONS_NUMS    = ['1','2','3','4','5','6','7','8'];
const _normAr = s => (s || '').split(' ').map(w => w.replace(/^ال/, '')).join(' ').trim().replace(/[اإ]/g, 'أ');
const _esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const _gradeIdx = cls => {
  let i = GRADE_LEVELS.indexOf(cls.gradeLevel ?? '');
  if (i !== -1) return i;
  i = GRADE_LEVELS.findIndex(g => (cls.name || '').startsWith(g));
  if (i !== -1) return i;
  if (cls.grade) {
    const n = _normAr(cls.grade);
    i = GRADE_LEVELS.findIndex(g => _normAr(g) === n);
  }
  return i === -1 ? 999 : i;
};
const _sortClasses = arr => [...arr].sort((a, b) => _gradeIdx(a) - _gradeIdx(b));

/* ==================== DATA LAYER ==================== */
const DB = {
  _k: {
    teacher: 'tm_teacher', classes: 'tm_classes', students: 'tm_students',
    attendance: 'tm_attendance', grades: 'tm_grades', schedule: 'tm_schedule',
    behavior: 'tm_behavior', comms: 'tm_comms', settings: 'tm_settings', groups: 'tm_groups'
  },
  get(key) {
    const data = JSON.parse(localStorage.getItem(this._k[key]) || '[]');
    if (key === 'classes') return _sortClasses(data);
    return data;
  },
  set(key, val) {
    localStorage.setItem(this._k[key], JSON.stringify(val));
    _sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) _sb.from('user_data').upsert({ user_id: session.user.id, key, value: JSON.stringify(val), updated_at: new Date().toISOString() });
    });
  },
  teacher() { return JSON.parse(localStorage.getItem(this._k.teacher) || 'null'); },
  setTeacher(v) {
    localStorage.setItem(this._k.teacher, JSON.stringify(v));
    if (v) _sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) _sb.from('profiles').upsert({ id: session.user.id, ...v });
    });
  },
  id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  settings() {
    const def = {
      absenceThreshold: 5,
      periods: [
        {p:1,s:'07:30',e:'08:15'},{p:2,s:'08:20',e:'09:05'},{p:3,s:'09:10',e:'09:55'},
        {p:4,s:'10:15',e:'11:00'},{p:5,s:'11:05',e:'11:50'},{p:6,s:'12:10',e:'12:55'},
        {p:7,s:'13:00',e:'13:45'},{p:8,s:'13:50',e:'14:35'}
      ]
    };
    return Object.assign({}, def, JSON.parse(localStorage.getItem(this._k.settings) || '{}'));
  },
  saveSettings(v) {
    localStorage.setItem(this._k.settings, JSON.stringify(v));
    _sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) _sb.from('user_data').upsert({ user_id: session.user.id, key: 'settings', value: JSON.stringify(v), updated_at: new Date().toISOString() });
    });
  },
  allData() {
    const d = {}; Object.keys(this._k).forEach(k => { d[k] = localStorage.getItem(this._k[k]); }); return d;
  },
  loadAll(d) {
    Object.keys(this._k).forEach(k => { if (d[k]) localStorage.setItem(this._k[k], d[k]); });
    _sb.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const rows = Object.keys(this._k).filter(k => k !== 'teacher' && d[k])
        .map(k => ({ user_id: session.user.id, key: k, value: d[k], updated_at: new Date().toISOString() }));
      if (rows.length) _sb.from('user_data').upsert(rows);
      if (d.teacher) { const t = JSON.parse(d.teacher); if (t) _sb.from('profiles').upsert({ id: session.user.id, ...t }); }
    });
  }
};

/* ==================== GENDER TERMS ==================== */
const _T = {
  get _f() { return (DB.teacher()?.gender || 'male') === 'female'; },
  get tch()    { return this._f ? 'معلمة'              : 'معلم'; },
  get theTch() { return this._f ? 'المعلمة'            : 'المعلم'; },
  get stu()    { return this._f ? 'طالبة'               : 'طالب'; },
  get stus()   { return this._f ? 'طالبات'              : 'طلاب'; },
  get theStu() { return this._f ? 'الطالبة'             : 'الطالب'; },
  get theStus(){ return this._f ? 'الطالبات'            : 'الطلاب'; },
  get wkl()     { return this._f ? 'وكيلة المدرسة'     : 'وكيل المدرسة'; },
  get dir()     { return this._f ? 'مديرة المدرسة'     : 'مدير المدرسة'; },
  get rshd()    { return this._f ? 'مرشدة الطلاب'      : 'مرشد الطلاب'; },
  get doc()     { return this._f ? 'طبيبة المدرسة'     : 'طبيب المدرسة'; },
  get spec()    { return this._f ? 'أخصائية اجتماعية'  : 'أخصائي اجتماعي'; },
  get wklLbl()  { return this._f ? 'اسم الوكيلة'       : 'اسم الوكيل'; },
  get dirLbl()  { return this._f ? 'اسم المديرة'       : 'اسم المدير'; },
  get rshdLbl() { return this._f ? 'اسم المرشدة'       : 'اسم المرشد'; },
  get docLbl()  { return this._f ? 'اسم الطبيبة'       : 'اسم الطبيب'; },
  get specLbl() { return this._f ? 'اسم الأخصائية'     : 'اسم الأخصائي'; },
};

/* ==================== TOAST ==================== */
const Toast = {
  show(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: 'check-circle', error: 'times-circle', info: 'info-circle' };
    el.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i><span>${msg}</span>`;
    document.getElementById('toasts').appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
  }
};

/* ==================== PRINT ==================== */
const Print = {
  _win(html, title = 'منصة المعلم') {
    const teacher = DB.teacher() || {};
    const markup = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"><title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;color:#222;background:#fff;padding:20px;max-width:900px;margin:0 auto}
        h2{color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:16px}
        .stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px}
        .stat-card{background:#f0f4ff;border:1px solid #c0d0f0;border-radius:8px;padding:14px;text-align:center}
        .stat-val{font-size:1.5rem;font-weight:900} .stat-lbl{font-size:.72rem;color:#666}
        .no-print{text-align:center;margin-top:20px;padding:12px;background:#f3f4f6;border-radius:8px}
        .no-print button{padding:10px 24px;background:#2563EB;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:inherit}
        @media print{.no-print{display:none}body{padding:12px}}
      </style></head><body>
      <h2>${title}</h2>
      ${html}
      <div class="no-print"><button onclick="window.print()"><i></i> طباعة</button></div>
    </body></html>`;
    const url = URL.createObjectURL(new Blob([markup], { type: 'text/html;charset=utf-8' }));
    const w = window.open(url, '_blank', 'width=900,height=700');
    w.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
  },

  attendance(classId, date) {
    const cls     = DB.get('classes').find(c => c.id === classId);
    const teacher = DB.teacher() || {};
    const stus    = DB.get('students').filter(s => s.classId === classId);
    const rec     = DB.get('attendance').find(a => a.classId === classId && a.date === date);
    const map     = {}; rec?.records.forEach(r => { map[r.studentId] = r.status; });
    const present = stus.filter(s => (map[s.id]||'present') === 'present').length;
    const absent  = stus.filter(s => map[s.id] === 'absent').length;
    const late    = stus.filter(s => map[s.id] === 'late').length;
    const dateStr = date ? new Date(date).toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '—';
    const today   = new Date().toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'});
    const C = '#059669';
    const rows = stus.map((s,i) => {
      const st   = map[s.id] || 'present';
      const stAr = {present:'حاضر',absent:'غائب',late:'متأخر'}[st];
      const stColor = {present:'#16a34a',absent:'#dc2626',late:'#d97706'}[st];
      const stBg    = {present:'#f0fdf4',absent:'#fef2f2',late:'#fffbeb'}[st];
      return `<tr class="${i%2===0?'even':'odd'}">
        <td class="num">${i+1}</td>
        <td class="name">${s.name}</td>
        <td><span class="badge" style="background:${stBg};color:${stColor};border:1pt solid ${stColor}">${stAr}</span></td>
        <td class="notes"></td>
      </tr>`;
    }).join('');
    const logo = "data:image/png;base64,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";
    const markup = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"><title>كشف الحضور والغياب</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        html,body{width:210mm}
        body{font-family:'Tajawal',sans-serif;direction:rtl;color:#111;font-size:10pt;background:#fff;margin:0 auto}
        .page{width:210mm;padding:6mm 8mm;display:flex;flex-direction:column;gap:5pt}
        /* Header */
        .print-hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3pt solid ${C};padding-bottom:6pt}
        .print-hdr-right,.print-hdr-left{font-size:8.5pt;line-height:2;color:#111;font-weight:700;min-width:90pt}
        .print-hdr-left{text-align:left}
        .print-hdr-center{text-align:center;flex:1}
        .print-hdr-logo{height:56pt;display:block;margin:0 auto}
        .print-hdr-logo-ar{font-size:9pt;font-weight:700;color:${C};margin-top:2pt}
        /* Info */
        .info-row{display:flex;gap:6pt}
        .ifield{flex:1;border:1.5pt solid ${C};border-radius:6pt;padding:5pt 8pt;position:relative;text-align:center}
        .ifield-lbl{position:absolute;top:-7pt;right:8pt;background:#fff;padding:0 4pt;font-size:7.5pt;font-weight:700;color:${C}}
        .ifield-val{font-size:10pt;font-weight:700}
        /* Badges */
        .badge-row{display:flex;gap:8pt}
        .badge-box{flex:1;border:1.5pt solid ${C};border-radius:8pt;padding:6pt;text-align:center;background:#f0fdf4}
        .badge-box.ab{border-color:#dc2626;background:#fef2f2}
        .badge-box.lt{border-color:#d97706;background:#fffbeb}
        .badge-box.tot{border-color:#6b7280;background:#f9fafb}
        .badge-val{font-size:18pt;font-weight:900;color:#065f46}
        .badge-box.ab .badge-val{color:#dc2626}.badge-box.lt .badge-val{color:#d97706}.badge-box.tot .badge-val{color:#374151}
        .badge-lbl{font-size:8pt;color:#6b7280;margin-top:2pt}
        /* Table */
        table{width:100%;border-collapse:collapse;font-size:9.5pt;table-layout:fixed}
        colgroup col.c-num{width:5%}colgroup col.c-name{width:45%}colgroup col.c-st{width:18%}colgroup col.c-note{width:32%}
        th{background:${C};color:#fff;text-align:center;padding:5pt 3pt;font-weight:700;border:1pt solid rgba(255,255,255,.3)}
        th.name-h{text-align:right;padding-right:6pt}
        td{padding:4.5pt 3pt;text-align:center;border:1pt solid #d1fae5}
        td.name{text-align:right;padding-right:6pt;font-weight:600;font-size:9pt;word-break:break-word}
        td.num{color:#9ca3af;font-size:8.5pt}
        td.notes{border:1pt solid #d1fae5}
        tr.even{background:#fff}tr.odd{background:#f0fdf4}
        .badge{padding:2pt 10pt;border-radius:20pt;font-weight:700;font-size:9pt;display:inline-block}
        .summary-row td{background:#ecfdf5;font-weight:700;border-top:2pt solid ${C};padding:5pt 3pt;font-size:9pt}
        /* Sigs */
        .sigs{display:flex;gap:12pt;padding-top:8pt;border-top:1pt solid #d1fae5;margin-top:16pt;page-break-inside:avoid}
        .sig{flex:1;text-align:center}
        .sig-title{font-size:8.5pt;font-weight:700;color:${C};margin-bottom:16pt}
        .sig-line{border-top:1.5pt solid ${C};padding-top:3pt;font-size:8pt;color:#6b7280}
        .no-print{text-align:center;padding:10pt;background:#f3f4f6;margin:10pt;border-radius:6pt}
        .no-print button{padding:8pt 24pt;background:${C};color:#fff;border:none;border-radius:5pt;font-size:12pt;cursor:pointer;font-family:inherit;font-weight:700}
        @media print{@page{size:A4 portrait;margin:10mm 8mm}html,body{width:210mm}.no-print{display:none}thead{display:table-header-group}tr{page-break-inside:avoid}}
      </style></head><body>
      <div class="page">
        <div class="print-hdr">
          <div class="print-hdr-right">الإدارة العامة للتعليم<br>بمنطقة ${teacher.region||'___________'}<br>مدرسة ${teacher.school||'—'}</div>
          <div class="print-hdr-center">
            <img class="print-hdr-logo" src="${logo}">
            <div class="print-hdr-logo-ar">كشف الحضور والغياب</div>
          </div>
          <div class="print-hdr-left">${dateStr}</div>
        </div>

        <div class="info-row">
          <div class="ifield"><div class="ifield-lbl">الفصل الدراسي / الشعبة</div><div class="ifield-val">${cls?.name||'—'}</div></div>
          <div class="ifield"><div class="ifield-lbl">المادة / المقرر</div><div class="ifield-val">${cls?.subject||teacher.subject||'—'}</div></div>
          <div class="ifield"><div class="ifield-lbl">اسم ${_T.theTch}</div><div class="ifield-val">${teacher.name||'—'}</div></div>
          <div class="ifield"><div class="ifield-lbl">عدد ${_T.theStus}</div><div class="ifield-val">${stus.length}</div></div>
        </div>

        <div class="badge-row">
          <div class="badge-box"><div class="badge-val">${present}</div><div class="badge-lbl">حاضر</div></div>
          <div class="badge-box ab"><div class="badge-val">${absent}</div><div class="badge-lbl">غائب</div></div>
          <div class="badge-box lt"><div class="badge-val">${late}</div><div class="badge-lbl">متأخر</div></div>
          <div class="badge-box tot"><div class="badge-val">${stus.length}</div><div class="badge-lbl">المجموع</div></div>
          <div class="badge-box tot"><div class="badge-val">${stus.length?Math.round(present/stus.length*100):0}%</div><div class="badge-lbl">نسبة الحضور</div></div>
        </div>

        <table>
          <colgroup>
            <col class="c-num"><col class="c-name"><col class="c-st"><col class="c-note">
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th class="name-h">اسم ${_T.theStu}</th>
              <th>الحالة</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tbody>
            <tr class="summary-row">
              <td colspan="2" style="text-align:right;padding-right:6pt">المجموع: ${stus.length} ${_T.stu}</td>
              <td>حاضر: ${present} | غائب: ${absent} | متأخر: ${late}</td>
              <td>نسبة الحضور: ${stus.length?Math.round(present/stus.length*100):0}%</td>
            </tr>
          </tbody>
        </table>

        <div class="sigs">
          <div class="sig"><div class="sig-title">توقيع ${_T.theTch}</div><div class="sig-line">${teacher.name||'—'}</div></div>
        </div>
      </div>
      <div class="no-print"><button onclick="window.print()">🖨️ طباعة</button></div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.open(); w.document.write(markup); w.document.close();
  },
  grades(classId) {
    const cls     = DB.get('classes').find(c => c.id === classId);
    const teacher = DB.teacher() || {};
    const stus    = DB.get('students').filter(s => s.classId === classId);
    const gd      = DB.get('grades');
    const tots    = stus.map(s => { const g=gd.find(x=>x.studentId===s.id&&x.classId===classId)?.grades||{}; return _sumGrades(g); });
    const hasTots = tots.filter(t=>t>0);
    const avg     = hasTots.length ? Math.round(hasTots.reduce((a,x)=>a+x,0)/hasTots.length) : 0;
    const maxVal  = hasTots.length ? Math.max(...hasTots) : 0;
    const minVal  = hasTots.length ? Math.min(...hasTots) : 0;
    const passed  = tots.filter(t=>t>=50).length;
    const today   = new Date().toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric'});
    const C = '#1a6b5a';
    const _lc = l => ({'ممتاز+':'#065f46','ممتاز':'#16a34a','جيد جداً+':'#0369a1','جيد جداً':'#2563eb','جيد+':'#7c3aed','جيد':'#9333ea','مقبول':'#d97706','راسب':'#dc2626','—':'#9ca3af'})[l]||'#374151';
    const _cell = v => v != null ? `<td>${v}</td>` : `<td style="color:#ccc">—</td>`;
    const rows = stus.map((s,i) => {
      const g   = gd.find(x=>x.studentId===s.id&&x.classId===classId)?.grades||{};
      const tot = tots[i];
      const ltr = tot>0?_letter(tot):'—';
      const fail = tot>0&&tot<50;
      return `<tr class="${i%2===0?'even':'odd'}${fail?' fail':''}">
        <td class="num">${i+1}</td>
        <td class="name">${s.name}</td>
        ${_cell(g.homework??null)}
        ${_cell(g.participation??null)}
        ${_cell(g.exam1??null)}
        ${_cell(g.exam2??null)}
        ${_cell(g.final??null)}
        <td class="total ${fail?'fail-val':'pass-val'}">${tot||'—'}</td>
      </tr>`;
    }).join('');

    const markup = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"><title>كشف رصد الدرجات</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{width:210mm}
        body{font-family:'Tajawal',sans-serif;direction:rtl;color:#111;font-size:10pt;background:#fff;margin:0 auto}
        .page{width:210mm;padding:6mm 8mm;display:flex;flex-direction:column;gap:5pt}

        /* Header */
        .print-hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${C};padding-bottom:6pt}
        .print-hdr-right,.print-hdr-left{text-align:center;font-size:8.5pt;line-height:2;color:#111;font-weight:700;min-width:95pt}
        .print-hdr-center{text-align:center;flex:1;padding:0 6pt}
        .print-hdr-logo{height:60pt;display:block;margin:0 auto}
        .print-hdr-logo-ar{font-size:9pt;font-weight:700;color:${C};letter-spacing:.06em;margin-bottom:1pt}
        .print-hdr-logo-en{font-size:7pt;color:#555;letter-spacing:.09em}

        /* Info row */
        .info-row{display:flex;gap:6pt}
        .ifield{flex:1;border:1.5pt solid ${C};border-radius:6pt;padding:5pt 8pt;position:relative;text-align:center}
        .ifield-lbl{position:absolute;top:-7pt;right:8pt;background:#fff;padding:0 4pt;font-size:7.5pt;font-weight:700;color:${C}}
        .ifield-val{font-size:10pt;font-weight:700}

        /* Stats */
        .stats-row{display:flex;gap:5pt}
        .stat{flex:1;border:1.5pt solid ${C};border-radius:6pt;padding:5pt 4pt;text-align:center}
        .stat-val{font-size:16pt;font-weight:900;color:${C}}
        .stat.hi .stat-val{color:#16a34a}.stat.lo .stat-val{color:#dc2626}.stat.ps .stat-val{color:#7c3aed}.stat.fl .stat-val{color:#dc2626}
        .stat-lbl{font-size:7.5pt;color:#6b7280}

        /* Table */
        table{width:100%;border-collapse:collapse;font-size:9pt;table-layout:fixed}
        th{background:${C};color:#fff;text-align:center;padding:5pt 3pt;font-weight:700;font-size:9pt;border:1pt solid #fff;overflow:hidden}
        th.grp{background:#2e9e85;font-size:8.5pt}
        th.sub{background:#3db89a;font-size:8pt;font-weight:600}
        td{padding:4.5pt 3pt;text-align:center;border:1pt solid #d1fae5;overflow:hidden}
        td.name{text-align:right;font-weight:600;padding-right:6pt;word-break:break-word;font-size:9pt}
        td.num{color:#9ca3af;font-size:8.5pt}
        td.total{font-weight:900;font-size:11pt}
        td.pass-val{color:#065f46} td.fail-val{color:#dc2626}
        td.grade{font-weight:700;font-size:9pt}
        tr.even{background:#fff} tr.odd{background:#f0fdf4}
        tr.fail td{background:#fff5f5!important}
        .summary-row td{background:#ecfdf5;font-weight:700;border-top:2pt solid ${C};padding:5pt 3pt;font-size:9pt}

        /* Sigs */
        .sigs{display:flex;gap:12pt;padding-top:8pt;border-top:1pt solid #d1fae5;margin-top:16pt;page-break-inside:avoid}
        .sig{flex:1;text-align:center}
        .sig-title{font-size:8.5pt;font-weight:700;color:${C};margin-bottom:16pt}
        .sig-line{border-top:1.5pt solid ${C};padding-top:3pt;font-size:8pt;color:#6b7280}

        .no-print{text-align:center;padding:10pt;background:#f3f4f6;margin:10pt;border-radius:6pt}
        .no-print button{padding:8pt 24pt;background:${C};color:#fff;border:none;border-radius:5pt;font-size:12pt;cursor:pointer;font-family:inherit;font-weight:700}
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        @media print{@page{size:A4 portrait;margin:10mm 8mm}html,body{width:210mm}.no-print{display:none}thead{display:table-header-group}tr{page-break-inside:avoid}}
      </style></head><body>
      <div class="page">

        <div class="print-hdr">
          <div class="print-hdr-right">الإدارة العامة للتعليم<br>بمنطقة ${teacher.region||'___________'}<br>مدرسة ${teacher.school||'—'}</div>
          <div class="print-hdr-center">
            <img class="print-hdr-logo" src="data:image/png;base64,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">
            <div class="print-hdr-logo-ar">كشف الدرجات</div>
          </div>
          <div class="print-hdr-left">
            <div>${today}</div>
          </div>
        </div>

        <div class="info-row">
          <div class="ifield"><div class="ifield-lbl">الفصل الدراسي / الشعبة</div><div class="ifield-val">${cls?.name||'—'}</div></div>
          <div class="ifield"><div class="ifield-lbl">المادة / المقرر</div><div class="ifield-val">${cls?.subject||teacher.subject||'—'}</div></div>
          <div class="ifield"><div class="ifield-lbl">اسم ${_T.theTch}</div><div class="ifield-val">${teacher.name||'—'}</div></div>
          <div class="ifield"><div class="ifield-lbl">عدد ${_T.theStus}</div><div class="ifield-val">${stus.length}</div></div>
        </div>

        <div class="stats-row">
          <div class="stat"><div class="stat-val">${avg}</div><div class="stat-lbl">المعدل العام</div></div>
          <div class="stat hi"><div class="stat-val">${maxVal||'—'}</div><div class="stat-lbl">أعلى درجة</div></div>
          <div class="stat lo"><div class="stat-val">${minVal||'—'}</div><div class="stat-lbl">أدنى درجة</div></div>
          <div class="stat ps"><div class="stat-val">${passed}</div><div class="stat-lbl">ناجح</div></div>
          <div class="stat fl"><div class="stat-val">${stus.length-passed}</div><div class="stat-lbl">راسب</div></div>
          <div class="stat"><div class="stat-val">${stus.length?Math.round(passed/stus.length*100):0}%</div><div class="stat-lbl">نسبة النجاح</div></div>
        </div>

        <table>
          <colgroup>
            <col style="width:5%">
            <col style="width:28%">
            <col style="width:9%">
            <col style="width:9%">
            <col style="width:11%">
            <col style="width:11%">
            <col style="width:13%">
            <col style="width:14%">
          </colgroup>
          <thead>
            <tr>
              <th style="background:${C};border-bottom:1pt solid rgba(255,255,255,.3)"></th>
              <th style="text-align:right;padding-right:6pt;background:${C};border-bottom:1pt solid rgba(255,255,255,.3)"></th>
              <th colspan="2" class="grp" style="border-bottom:1pt solid rgba(255,255,255,.3)">الأعمال الفصلية الأولى<br><small style="font-weight:400;font-size:7pt">20 درجة</small></th>
              <th colspan="2" class="grp" style="border-bottom:1pt solid rgba(255,255,255,.3)">الاختبارات الفصلية<br><small style="font-weight:400;font-size:7pt">40 درجة</small></th>
              <th style="background:#2e9e85;border-bottom:1pt solid rgba(255,255,255,.3)"></th>
              <th style="background:#0f5132;border-bottom:1pt solid rgba(255,255,255,.3)"></th>
            </tr>
            <tr>
              <th>#</th>
              <th style="text-align:right;padding-right:6pt">اسم ${_T.theStu}</th>
              <th class="sub">الواجب<br><small>10</small></th>
              <th class="sub">مشاركة<br><small>10</small></th>
              <th class="sub">اختبار 1<br><small>20</small></th>
              <th class="sub">اختبار 2<br><small>20</small></th>
              <th class="grp">النهائي<br><small style="font-weight:400;font-size:7pt">40</small></th>
              <th style="background:#0f5132">المجموع<br><small style="font-weight:400;font-size:7pt">100</small></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tbody>
            <tr class="summary-row">
              <td colspan="2" style="text-align:right;padding-right:6pt">المجموع: ${stus.length} ${_T.stu}</td>
              <td colspan="5" style="text-align:center">المعدل العام: ${avg} / 100</td>
              <td>ناجح: ${passed}</td>
              <td>راسب: ${stus.length-passed}</td>
            </tr>
          </tbody>
        </table>

        <div class="sigs">
          <div class="sig"><div class="sig-title">توقيع ${_T.theTch}</div><div class="sig-line">${teacher.name||'—'}</div></div>
          <div class="sig"><div class="sig-title">اعتماد ${_T.dir}</div><div class="sig-line">_________________</div></div>
        </div>
      </div>
      <div class="no-print"><button onclick="window.print()">🖨️ طباعة</button></div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.open(); w.document.write(markup); w.document.close();
  },

  timetable() {
    const days    = [{k:'sun',l:'الأحد'},{k:'mon',l:'الاثنين'},{k:'tue',l:'الثلاثاء'},{k:'wed',l:'الأربعاء'},{k:'thu',l:'الخميس'}];
    const classes = DB.get('classes');
    const sched   = DB.get('schedule');
    const times   = DB.settings().periods;
    const hdr = days.map(d=>`<th>${d.l}</th>`).join('');
    const rows = Array.from({length:8},(_,i)=>i+1).map(p => {
      const t = times.find(x=>x.p===p);
      const cells = days.map(d => {
        const e = sched.find(s=>s.day===d.k&&s.period===p);
        const c = e ? classes.find(x=>x.id===e.classId) : null;
        return `<td style="text-align:center">${c ? `<strong>${c.name}</strong><br><small>${e.subject}</small>` : '—'}</td>`;
      }).join('');
      return `<tr><td style="text-align:center;background:#f3f4f6"><strong>${p}</strong>${t?`<br><small style="color:#9ca3af">${t.s}</small>`:''}</td>${cells}</tr>`;
    }).join('');
    this._win(`<h2>جدول الحصص الأسبوعي</h2>
      <table><thead><tr><th>الحصة</th>${hdr}</tr></thead><tbody>${rows}</tbody></table>`, 'جدول الحصص');
  },

  parentReport(studentId) {
    const s    = DB.get('students').find(x=>x.id===studentId);
    if (!s) return;
    const cls  = DB.get('classes').find(c=>c.id===s.classId);
    const g    = DB.get('grades').find(x=>x.studentId===studentId&&x.classId===s.classId)?.grades||{};
    const atts = DB.get('attendance');
    const absCount = _countAtt(studentId, 'absent', atts);
    const lateCount = _countAtt(studentId, 'late', atts);
    const tot = _sumGrades(g);
    const behCounts = s.behaviors || {};
    const posBehRows = BEH_TYPES.filter(b=>b.pos).map(b=>`<tr><td>${_bIcon(b)} ${b.label}</td><td style="text-align:center;font-weight:700;color:${b.color}">${behCounts[b.key]||0}</td></tr>`).join('');
    const negBehRows = BEH_TYPES.filter(b=>!b.pos).map(b=>`<tr><td>${_bIcon(b)} ${b.label}</td><td style="text-align:center;font-weight:700;color:${b.color}">${behCounts[b.key]||0}</td></tr>`).join('');
    this._win(`
      <h2>تقرير ولي الأمر — ${s.name}</h2>
      <table style="margin-bottom:1rem"><tr><td><strong>الفصل:</strong> ${cls?.name||'—'}</td><td><strong>المادة:</strong> ${cls?.subject||'—'}</td></tr></table>
      <div class="stat-row">
        <div class="stat-box"><div class="stat-val" style="color:#2563EB">${tot||'—'}</div><div class="stat-lbl">المجموع / 100</div></div>
        <div class="stat-box"><div class="stat-val">${tot>0?_letter(tot):'—'}</div><div class="stat-lbl">التقدير</div></div>
        <div class="stat-box"><div class="stat-val" style="color:#ef4444">${absCount}</div><div class="stat-lbl">أيام الغياب</div></div>
        <div class="stat-box"><div class="stat-val" style="color:#f59e0b">${lateCount}</div><div class="stat-lbl">التأخرات</div></div>
      </div>
      <h2>الدرجات</h2>
      <table><thead><tr><th>الواجب/10</th><th>المشاركة/10</th><th>اختبار1/20</th><th>اختبار2/20</th><th>النهائي/40</th><th>المجموع</th></tr></thead>
      <tbody><tr><td>${g.homework??'—'}</td><td>${g.participation??'—'}</td><td>${g.exam1??'—'}</td><td>${g.exam2??'—'}</td><td>${g.final??'—'}</td><td><strong>${tot||'—'}</strong></td></tr></tbody></table>
      <h2>إحصائيات السلوك</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:.5rem">
        <div>
          <div style="font-weight:700;color:#16a34a;margin-bottom:.4rem;font-size:.85rem">✓ إيجابي</div>
          <table><tbody>${posBehRows}</tbody></table>
        </div>
        <div>
          <div style="font-weight:700;color:#dc2626;margin-bottom:.4rem;font-size:.85rem">✗ سلبي</div>
          <table><tbody>${negBehRows}</tbody></table>
        </div>
      </div>
      <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div style="border-top:1px solid #e5e7eb;padding-top:8px;text-align:center;font-size:.8rem;color:#9ca3af">توقيع ${_T.theTch}</div>
        <div style="border-top:1px solid #e5e7eb;padding-top:8px;text-align:center;font-size:.8rem;color:#9ca3af">توقيع ولي الأمر</div>
      </div>`, 'تقرير ولي الأمر');
  },

  referral(stuId) {
    const s       = DB.get('students').find(x => x.id === stuId);
    if (!s) return;
    const cls     = DB.get('classes').find(c => c.id === s.classId);
    const teacher     = DB.teacher() || {};
    const date        = document.getElementById('ref-date')?.value || new Date().toISOString().slice(0,10);
    const region      = document.getElementById('ref-region')?.value.trim() || '';
    const school      = document.getElementById('ref-school')?.value.trim() || teacher.school || '—';
    const teacherSig  = document.getElementById('ref-teacher-name')?.value.trim() || teacher.name || '—';
    const refTo       = document.getElementById('ref-to')?.value || '—';
    const reason      = document.getElementById('ref-reason')?.value || '—';
    const notes       = document.getElementById('ref-notes')?.value || '';
    const _allReasons = ['ضعف تحصيل دراسي','كثرة الغياب','سلوك سلبي متكرر','مشكلة صحية','مشكلة اجتماعية أو أسرية','تأخر مستمر','أخرى (تُحدد في الملاحظات)'];
    const reasonsHtml = _allReasons.map(r => r===reason
      ? `<div class="r-item r-selected">☑&nbsp;<strong>${r}</strong></div>`
      : `<div class="r-item">☐&nbsp;${r}</div>`
    ).join('\n          ');
    const subject      = teacher.subject || '—';
    const refToName    = document.getElementById('ref-to-name')?.value.trim() || '';
    const _rnames = { ...(teacher.refToNames||{}), [refTo]: refToName };
    DB.setTeacher({ ...teacher, region, refSchool: school, refTeacherName: teacherSig, refToNames: _rnames });
    const students    = DB.get('students');
    const newCount    = (s.referralCount || 0) + 1;
    const clearedBehs = { ...(s.behaviors || {}) };
    BEH_TYPES.filter(b => !b.pos).forEach(b => { clearedBehs[b.key] = 0; });
    const today = new Date().toISOString().slice(0,10);
    const histEntry = { date: today, refTo, reason, notes, teacherName: teacherSig };
    const prevHistory = s.referralHistory || [];
    DB.set('students', students.map(x => x.id === stuId ? { ...x, referralCount: newCount, behaviors: clearedBehs, lastReferralDate: today, referralHistory: [...prevHistory, histEntry] } : x));
    Modal.close();
    const cur = Router.current;
    if (cur === 'behavior' || cur === 'students' || cur === 'referrals') Pages[cur]();

    const markup = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"><title>نموذج إحالة ${_T.stu}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{width:210mm}
        body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;color:#111;font-size:11pt;background:#fff;margin:0 auto}
        .page{width:210mm;margin:0 auto}
        .page-body{display:block}
        .hdr{padding:8pt 14pt;display:flex;align-items:center;justify-content:space-between;background:#fff}
        .hdr-right{text-align:center;font-size:9pt;line-height:2;color:#111;font-weight:700}
        .hdr-center{text-align:center;flex:1;padding:0 10pt}
        .hdr-logo{height:68pt;display:block;margin:0 auto}
        .hdr-logo-ar{font-size:9.5pt;font-weight:700;color:#1a6b5a;letter-spacing:.06em;margin-bottom:1pt}
        .hdr-logo-en{font-size:7pt;color:#555;letter-spacing:.09em}
        
        .form-title-wrap{display:flex;align-items:center;margin:4pt 14pt 10pt;gap:10pt}
        .ftlines{flex:1;display:flex;flex-direction:column;gap:4pt}
        .ftlines span{display:block;height:0;border-top:1px solid #bbb}
        .form-title-box{border:1.5px solid #1a6b5a;border-radius:18pt;padding:6pt 28pt;font-size:13pt;font-weight:900;color:#111;white-space:nowrap}
        .info-grid{display:grid;grid-template-columns:2fr 1fr;gap:12pt;margin:0 14pt 12pt}
        .info-grid.col3{grid-template-columns:1.5fr 1fr 1fr}
        .ifield{position:relative;border:1.5px solid #2e9e85;border-radius:8pt;padding:12pt 12pt 8pt}
        .ifield-lbl{position:absolute;top:-7.5pt;right:12pt;background:#fff;padding:0 5pt;font-size:8pt;font-weight:700;color:#2e9e85;white-space:nowrap}
        .ifield-val{font-size:11pt;font-weight:700;text-align:center}
        .sec{position:relative;border:1.5px solid #2e9e85;border-radius:8pt;margin:0 14pt 15pt;padding:14pt 12pt 10pt}
        .sec-lbl{position:absolute;top:-7.5pt;right:12pt;background:#fff;padding:0 5pt;font-size:8.5pt;font-weight:700;color:#2e9e85;white-space:nowrap}
        .sec-val{font-size:11pt;font-weight:700;min-height:32pt;line-height:2}
        .sec-val.center{text-align:center}
        .sec-val.light{font-weight:400;white-space:pre-line}
        .wline{border-bottom:1.5px solid #bbb;margin-bottom:16pt;margin-top:2pt}
        .r-grid{display:grid;grid-template-columns:1fr 1fr;gap:5pt 10pt;padding:4pt 4pt 2pt;font-size:10pt}
        .r-item{display:flex;align-items:center;gap:4pt;line-height:1.7}
        .r-selected{font-size:11pt;color:#1a6b5a}
        .sigs{margin:4pt 14pt 10pt;display:flex;gap:20pt}
        .sig{flex:1;text-align:center}
        .sig-ttl{font-size:9pt;font-weight:700;color:#1a6b5a;margin-bottom:4pt}
        .sig-name{font-size:10pt;font-weight:700;margin-bottom:20pt;min-height:16pt}
        .sig-line{border-top:1.5px solid #1a6b5a;margin-bottom:4pt}
        .sig-lbl{font-size:8pt;color:#666}
        .foot{border-top:2px solid #1a6b5a;padding:4pt 16pt;display:flex;justify-content:space-between;font-size:7.5pt;color:#666;margin-top:25pt}
        .no-print{text-align:center;padding:10pt;background:#f3f4f6;border-radius:6pt;margin:10pt}
        .no-print button{padding:8pt 24pt;background:#1a6b5a;color:white;border:none;border-radius:5pt;font-size:12pt;cursor:pointer;font-family:inherit;font-weight:700}
        @media print{
          @page{size:A4 portrait;margin:0}
          html,body{width:210mm}
          .no-print{display:none}
        }
      </style>
    </head><body>
    <div class="page">
      <div class="hdr">
        <div class="hdr-right">الإدارة العامة للتعليم<br>بمنطقة ${region}<br>مدرسة ${school}</div>
        <div class="hdr-center">
          <img class="hdr-logo" src="data:image/png;base64,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" alt="">
        </div>
        <div style="width:75pt"></div>
      </div>
      <div class="page-body">
      <div class="form-title-wrap">
        <div class="ftlines"><span></span><span></span><span></span></div>
        <div class="form-title-box">إحالة ${_T.stu}</div>
        <div class="ftlines"><span></span><span></span><span></span></div>
      </div>
      <div style="text-align:center;font-size:8pt;color:#888;margin:4pt 0 6pt">رقم الإحالة : ${newCount}</div>
      <div class="info-grid" style="margin-top:0;grid-template-columns:2fr 1fr 1fr">
        <div class="ifield">
          <span class="ifield-lbl">اسم ${_T.theStu} :</span>
          <div class="ifield-val">${s.name}</div>
        </div>
        <div class="ifield">
          <span class="ifield-lbl">الفصل الدراسي :</span>
          <div class="ifield-val">${cls?.name||'—'}</div>
        </div>
        <div class="ifield">
          <span class="ifield-lbl">المادة :</span>
          <div class="ifield-val">${subject}</div>
        </div>
      </div>
      <div class="info-grid" style="grid-template-columns:2fr 1fr 1fr">
        <div class="ifield">
          <span class="ifield-lbl">اسم ${_T.theTch} :</span>
          <div class="ifield-val">${teacherSig}</div>
        </div>
        <div class="ifield">
          <span class="ifield-lbl">التاريخ :</span>
          <div class="ifield-val">${date}</div>
        </div>
        <div class="ifield">
          <span class="ifield-lbl">الإحالة إلى :</span>
          <div class="ifield-val">${refTo}</div>
        </div>
      </div>
      <div class="sec">
        <span class="sec-lbl">سبب الإحالة :</span>
        <div class="r-grid">
          ${reasonsHtml}
        </div>
      </div>
      <div class="sec" style="overflow:visible;margin-bottom:15pt;min-height:150pt">
        <span class="sec-lbl">ملاحظات ${_T.theTch} :</span>
        <div class="sec-val light">${notes||'&nbsp;'}</div>
      </div>
      <div class="sec" style="overflow:visible;margin-bottom:8pt">
        <span class="sec-lbl">الإجراء المتخذ من قِبل ${refTo} :</span>
        <div class="sec-val">
          <div class="wline"></div>
          <div class="wline"></div>
          <div class="wline"></div>
          <div class="wline"></div>
          <div class="wline"></div>
          <div class="wline"></div>
          <div class="wline"></div>
          <div class="wline"></div>
        </div>
      </div>
      <div style="height:20pt"></div>
      </div>
      <div class="sigs">
        <div class="sig">
          <div class="sig-ttl">اسم ${_T.theTch}</div>
          <div class="sig-name">${teacherSig}</div>
          <div class="sig-line"></div>
          <div class="sig-lbl">التوقيع</div>
        </div>
        <div class="sig">
          <div class="sig-ttl">${refTo}</div>
          <div class="sig-name">${refToName||'&nbsp;'}</div>
          <div class="sig-line"></div>
          <div class="sig-lbl">التوقيع</div>
        </div>
      </div>
      <div class="foot">
        <span>منصة المعلم — نظام إدارة الفصل الدراسي</span>
        <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</span>
      </div>
    </div>
    <div class="no-print"><button onclick="window.print()">🖨 طباعة النموذج</button></div>
    </body></html>`;

        Modal.close();
    const url = URL.createObjectURL(new Blob([markup], { type: 'text/html;charset=utf-8' }));
    const w = window.open('', '_blank', 'width=860,height=800');
    w.document.open(); w.document.write(markup); w.document.close();
  },

  groups(groups) {
    const teacher = DB.teacher() || {};
    const today = new Date().toLocaleDateString('ar-SA', { year:'numeric', month:'long', day:'numeric' });
    const COLORS = ['#0d9488','#7c3aed','#dc2626','#ea580c','#0369a1','#65a30d','#c026d3','#b45309'];
    const cards = groups.map((g, gi) => {
      const c = COLORS[gi % COLORS.length];
      return `<div class="gcard" style="border-color:${c}">
        <div class="gcard-hdr" style="background:${c}">المجموعة ${gi + 1} (${g.length})</div>
        <ol>${g.map(n => `<li>${n}</li>`).join('')}</ol>
      </div>`;
    }).join('');

    const markup = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
<title>تقسيم المجموعات</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}
body{font-family:'Tahoma',sans-serif;padding:20px;font-size:13px;direction:rtl}
h1{font-size:1.1rem;font-weight:700;text-align:center;margin-bottom:4px}
.sub{text-align:center;color:#6b7280;font-size:.8rem;margin-bottom:16px}
.grid{display:flex;flex-wrap:wrap;gap:12px}
.gcard{border:2px solid;border-radius:10px;overflow:hidden;min-width:140px;flex:1}
.gcard-hdr{color:#fff;text-align:center;padding:6px 10px;font-weight:700;font-size:.88rem}
ol{list-style:decimal;padding:8px 24px;display:flex;flex-direction:column;gap:3px}
li{font-size:.85rem}
@media print{body{padding:10px}}
</style></head><body>
<h1>تقسيم المجموعات — ${teacher.teacherName || ''}</h1>
<div class="sub">${today} | ${groups.length} مجموعات | ${groups.reduce((s,g)=>s+g.length,0)} طالب</div>
<div class="grid">${cards}</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.open(); w.document.write(markup); w.document.close();
    setTimeout(() => w.print(), 600);
  }
};

/* ==================== BACKUP ==================== */
const Backup = {
  export() {
    const data = DB.allData();
    const teacher = DB.teacher();
    const blob = new Blob([JSON.stringify({ _v: 1, teacher, data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `teacher-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    Toast.show('تم تصدير النسخة الاحتياطية!');
  },
  import(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed._v || !parsed.data) throw new Error('invalid');
        if (!confirm('هل تريد استيراد البيانات؟ سيتم استبدال البيانات الحالية.')) { input.value=''; return; }
        if (parsed.teacher) DB.setTeacher(parsed.teacher);
        DB.loadAll(parsed.data);
        Toast.show('تم الاستيراد بنجاح! جارٍ إعادة التحميل...');
        setTimeout(() => location.reload(), 1500);
      } catch { Toast.show('الملف غير صالح', 'error'); }
      input.value = '';
    };
    reader.readAsText(file);
  }
};

/* ==================== MODAL ==================== */
const Modal = {
  open(title, html, large = false) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    const box = document.getElementById('modal-box');
    box.className = 'modal-box' + (large ? ' modal-lg' : '');
    document.getElementById('modal-backdrop').classList.remove('hidden');
  },
  close() { document.getElementById('modal-backdrop').classList.add('hidden'); }
};

/* ==================== ROUTER ==================== */
const Router = {
  current: 'dashboard',
  title(page) {
    return ({
      dashboard: 'الرئيسية | Dashboard',
      classes:   'الفصول الدراسية | Classes',
      students:  _T.theStus,
      attendance: _T.theStus,
      grades:    'الدرجات | Grades',
      analytics: 'التحليلات | Analytics',
      lessons:   'جدول الحصص | Timetable',
      referrals: 'الإحالات | Referrals',
      groups:    'المجموعات | Groups',
      settings:  'الإعدادات | Settings',
      admin:     'لوحة الإدارة | Admin Panel',
    })[page] || page;
  },
  go(page, params = {}) {
    this.current = page;
    clearInterval(this._nowTimer);
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
    document.getElementById('topbar-title').textContent = this.title(page);
    Pages[page] && Pages[page](params);
    if (page === 'dashboard') {
      this._nowTimer = setInterval(() => {
        const el = document.getElementById('now-widget-wrap');
        if (el) el.innerHTML = Pages._nowWidget();
        else clearInterval(this._nowTimer);
      }, 30000);
    }
  }
};

/* ==================== PAGES ==================== */
const Pages = {

  /* ---- DASHBOARD ---- */
  _nowWidget() {
    const settings  = DB.settings();
    const now       = new Date();
    const dayKey    = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
    const hhmm      = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const count     = settings.periodCount || this._periods;
    const ps        = settings.periods.filter(p => p.p <= count).sort((a,b) => a.p - b.p);
    const schedule  = DB.get('schedule');
    const classes   = DB.get('classes');

    const minDiff = (a, b) => {
      const [ah,am] = a.split(':').map(Number), [bh,bm] = b.split(':').map(Number);
      return (bh*60+bm) - (ah*60+am);
    };

    let current = null, next = null;
    for (const p of ps) {
      if (p.s && p.e && hhmm >= p.s && hhmm < p.e) { current = p; break; }
      if (p.s && hhmm < p.s && !next) { next = p; }
    }

    const entryFor = p => {
      const e = schedule.find(s => s.day === dayKey && s.period === p.p);
      return e ? classes.find(c => c.id === e.classId) : null;
    };

    if (dayKey === 'fri' || dayKey === 'sat') {
      return `<div class="now-widget now-off">
        <i class="fas fa-moon now-ico"></i>
        <div class="now-main">إجازة</div>
        <div class="now-sub">استمتع بعطلتك</div>
      </div>`;
    }

    if (current) {
      const cls   = entryFor(current);
      const left  = minDiff(hhmm, current.e);
      const color = cls ? (DB.get('classes').find(c=>c.id===cls.id)?.color || 'var(--primary)') : 'var(--primary)';
      return `<div class="now-widget now-active" style="--nw-color:${color}">
        <div class="now-badge">الحصة ${current.p}</div>
        <div class="now-main">${cls ? cls.name : '<span style="opacity:.6">فارغة</span>'}</div>
        <div class="now-sub">${current.s} — ${current.e} &nbsp;·&nbsp; <i class="fas fa-hourglass-half"></i> ${left} دقيقة متبقية</div>
      </div>`;
    }

    if (next) {
      const cls  = entryFor(next);
      const wait = minDiff(hhmm, next.s);
      return `<div class="now-widget now-break">
        <i class="fas fa-coffee now-ico"></i>
        <div class="now-main">استراحة</div>
        <div class="now-sub">الحصة ${next.p}${cls ? ' — ' + cls.name : ''} تبدأ بعد ${wait} دقيقة (${next.s})</div>
      </div>`;
    }

    const first = ps[0];
    if (first && hhmm < first.s) {
      const wait = minDiff(hhmm, first.s);
      return `<div class="now-widget now-break">
        <i class="fas fa-sun now-ico"></i>
        <div class="now-main">قبل بدء الحصص</div>
        <div class="now-sub">الحصة الأولى تبدأ بعد ${wait} دقيقة (${first.s})</div>
      </div>`;
    }

    return `<div class="now-widget now-off">
      <i class="fas fa-check-circle now-ico"></i>
      <div class="now-main">انتهت حصص اليوم</div>
      <div class="now-sub">إلى اللقاء غداً</div>
    </div>`;
  },

  dashboard() {
    const classes   = DB.get('classes');
    const students  = DB.get('students');
    const today     = new Date().toISOString().slice(0, 10);
    const allAtt    = DB.get('attendance');
    const todayAtt  = allAtt.filter(a => a.date === today);
    const todayDayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const todayLess = DB.get('schedule').filter(l => l.day === todayDayKey);

    const totalPresent = todayAtt.reduce((n, a) => n + a.records.filter(r => r.status === 'present').length, 0);
    const totalExpected = todayAtt.reduce((n, a) => n + a.records.length, 0);
    const attRate = totalExpected ? Math.round(totalPresent / totalExpected * 100) : 0;

    const classCards = classes.length ? classes.map(cls => {
      const cnt = students.filter(s => s.classId === cls.id).length;
      const att = todayAtt.find(a => a.classId === cls.id);
      const pres = att ? att.records.filter(r => r.status === 'present').length : 0;
      return `<div class="class-card" onclick="Router.go('attendance',{classId:'${cls.id}'})">
        <div class="class-name">${cls.name}</div>
        <div class="class-subject">${cls.subject}</div>
        <div class="class-stats">
          <span><i class="fas fa-users"></i> ${cnt}</span>
          <span class="${att ? 'text-green' : 'text-gray'}"><i class="fas fa-check"></i> ${pres}/${cnt}</span>
        </div>
      </div>`;
    }).join('') : '';

    const warnedCount = DB.get('students').filter(s => _behWarn(s).length > 0).length;

    document.getElementById('content').innerHTML = `
      <div id="now-widget-wrap">${this._nowWidget()}</div>
      <div class="stats-grid">
        <div class="stat-card stat-blue">
          <div class="stat-icon"><i class="fas fa-door-open"></i></div>
          <div class="stat-info"><div class="stat-value">${classes.length}</div><div class="stat-label">الفصول</div><div class="stat-label-en">Classes</div></div>
        </div>
        <div class="stat-card stat-green">
          <div class="stat-icon"><i class="fas fa-users"></i></div>
          <div class="stat-info"><div class="stat-value">${students.length}</div><div class="stat-label">${_T.theStus}</div><div class="stat-label-en">Students</div></div>
        </div>
        <div class="stat-card stat-orange">
          <div class="stat-icon"><i class="fas fa-clipboard-check"></i></div>
          <div class="stat-info"><div class="stat-value">${attRate}%</div><div class="stat-label">الحضور اليوم</div><div class="stat-label-en">Attendance</div></div>
        </div>
        <div class="stat-card stat-purple">
          <div class="stat-icon"><i class="fas fa-book-open"></i></div>
          <div class="stat-info"><div class="stat-value">${todayLess.length}</div><div class="stat-label">حصص اليوم</div><div class="stat-label-en">Lessons</div></div>
        </div>
      </div>

      <div class="section-card">
        <div class="card-header"><h3><i class="fas fa-bolt"></i> إجراءات سريعة | Quick Actions</h3></div>
        <div class="quick-actions">
          <button class="quick-btn blue" onclick="Router.go('attendance')"><i class="fas fa-clipboard-check"></i><span>الحضور</span></button>
          <button class="quick-btn green" onclick="Router.go('grades')"><i class="fas fa-star"></i><span>الدرجات</span></button>
          <button class="quick-btn orange" onclick="Router.go('lessons')"><i class="fas fa-book-open"></i><span>حصة جديدة</span></button>
          <button class="quick-btn purple" onclick="Router.go('referrals')"><i class="fas fa-file-medical-alt"></i><span>الإحالات</span></button>
        </div>
      </div>

      ${classes.length ? `
      <div class="section-card">
        <div class="card-header">
          <h3><i class="fas fa-door-open"></i> الفصول الدراسية</h3>
          <button class="btn btn-sm btn-outline" onclick="Router.go('classes')">عرض الكل</button>
        </div>
        <div class="classes-grid">${classCards}</div>
      </div>` : `
      <div class="section-card">
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-chalkboard-teacher"></i></div>
          <h3>مرحباً! ابدأ بإضافة فصلك الأول</h3>
          <p>أضف فصلاً دراسياً لتتمكن من إدارة ${_T.theStus} والحضور والدرجات</p>
          <button class="btn btn-primary" onclick="Router.go('classes')"><i class="fas fa-plus"></i> إضافة فصل</button>
        </div>
      </div>`}

      ${warnedCount ? `
      <div class="section-card" style="border:1.5px solid #fca5a5">
        <div class="card-header">
          <h3 style="color:#dc2626"><i class="fas fa-triangle-exclamation"></i> تحذيرات سلوكية — ${warnedCount} ${_T.stu} يحتاج تحويل</h3>
          <button class="btn btn-sm" style="background:#dc2626;color:#fff" onclick="Router.go('referrals')">عرض الإحالات</button>
        </div>
      </div>` : ''}
    `;
  },

  /* ---- CLASSES ---- */
  classes() {
    const classes  = DB.get('classes');
    const students = DB.get('students');
    const rows = classes.map(c => {
      const cnt = students.filter(s => s.classId === c.id).length;
      return `<div class="list-card">
        <div class="list-card-icon bg-blue"><i class="fas fa-door-open"></i></div>
        <div class="list-card-info">
          <div class="list-card-title">${c.name}</div>
          ${c.subject ? `<div class="list-card-subject"><i class="fas fa-book"></i> ${c.subject}</div>` : ''}
          <div class="list-card-subtitle">
            <span><i class="fas fa-users"></i> ${cnt} ${_T.stu}</span>
          </div>
        </div>
        <div class="list-card-actions">
          <button class="btn btn-sm btn-outline" onclick="Router.go('students',{classId:'${c.id}'})"><i class="fas fa-users"></i> ${_T.theStus}</button>
          <button class="btn btn-sm btn-outline" onclick="Pages.addClassModal('${c.id}')" title="تعديل الفصل"><i class="fas fa-edit"></i> تعديل</button>
          <button class="btn btn-sm btn-outline" onclick="Pages.shareClassModal('${c.id}')" title="مشاركة الفصل"><i class="fas fa-share-alt"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="Pages.deleteClass('${c.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2>الفصول الدراسية | Classes</h2>
        <div style="display:flex;gap:.5rem">
          <button class="btn btn-outline" onclick="Pages.importClassModal()"><i class="fas fa-file-import"></i> استيراد بكود</button>
          <button class="btn btn-outline" onclick="Pages.shareAllClassesModal()"><i class="fas fa-share-alt"></i> مشاركة الكل</button>
          <button class="btn btn-primary" onclick="Pages.addClassModal()"><i class="fas fa-plus"></i> إضافة فصل</button>
        </div>
      </div>
      ${classes.length ? `<div class="section-card">${rows}</div>` : `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-door-open"></i></div>
        <h3>لا توجد فصول دراسية بعد</h3>
        <p>ابدأ بإضافة فصلك الدراسي الأول</p>
        <button class="btn btn-primary" onclick="Pages.addClassModal()"><i class="fas fa-plus"></i> إضافة فصل</button>
      </div>`}
    `;
  },

  addClassModal(editId) {
    const cls = editId ? DB.get('classes').find(c => c.id === editId) : null;
    const gl  = cls?.gradeLevel || GRADE_LEVELS.find(g => (cls?.name||'').startsWith(g)) || GRADE_LEVELS[3];
    const st  = cls?.sectionType || 'letters';
    const sec = cls?.section || SECTIONS_LETTERS[0];
    const sectionOpts = (st === 'numbers' ? SECTIONS_NUMS : SECTIONS_LETTERS)
      .map(s => `<option${s===sec?' selected':''}>${s}</option>`).join('');
    Modal.open(editId ? 'تعديل الفصل' : 'إضافة فصل دراسي | Add Class', `
      <form onsubmit="Pages.saveClass(event${editId?`,'${editId}'`:''})">
        <div class="form-group"><label>المرحلة الدراسية *</label>
          <select name="gradeLevel" onchange="Pages._updateClassPreview()">
            ${GRADE_LEVELS.map(g => `<option${g===gl?' selected':''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group"><label>نوع الفصل</label>
            <div style="display:flex;gap:1rem;padding:.4rem 0">
              <label style="display:flex;align-items:center;gap:.35rem;cursor:pointer;font-weight:500">
                <input type="radio" name="sectionType" value="letters"${st==='letters'?' checked':''} onchange="Pages._updateSectionSel(this.value)"> حروف (أ،ب،ج)
              </label>
              <label style="display:flex;align-items:center;gap:.35rem;cursor:pointer;font-weight:500">
                <input type="radio" name="sectionType" value="numbers"${st==='numbers'?' checked':''} onchange="Pages._updateSectionSel(this.value)"> أرقام (1،2،3)
              </label>
            </div>
          </div>
          <div class="form-group"><label>الشعبة *</label>
            <select name="section" id="section-sel" onchange="Pages._updateClassPreview()">
              ${sectionOpts}
            </select>
          </div>
        </div>
        <div class="form-group"><label>اسم الفصل (مُولَّد تلقائياً)</label>
          <div id="class-name-preview" style="font-size:1.1rem;font-weight:700;color:var(--primary);background:var(--primary-light);border-radius:8px;padding:.5rem 1rem;text-align:center">${gl} ${sec}</div>
        </div>
        <div class="form-group"><label>المادة الدراسية *</label>
          <input type="text" name="subject" placeholder="الرياضيات، العلوم..." value="${cls?.subject||''}" required></div>
        <div class="form-group"><label>لون الفصل في الجدول</label>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap" id="color-picker">
            ${['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899','#84CC16','#F97316','#6366F1'].map(c =>
              `<div onclick="Pages._pickColor('${c}',this)" data-color="${c}"
                style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;border:3px solid transparent;transition:all .15s"></div>`
            ).join('')}
          </div>
          <input type="hidden" name="color" id="color-val" value="${cls?.color||'#2563EB'}">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
          <button type="button" class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
        </div>
      </form>
    `);
    const initColor = cls?.color || '#2563EB';
    requestAnimationFrame(() => Pages._pickColor(initColor, document.querySelector(`#color-picker [data-color="${initColor}"]`)));
  },

  _pickColor(color, el) {
    document.querySelectorAll('#color-picker div').forEach(d => d.style.border = '3px solid transparent');
    if (el) el.style.border = '3px solid #111';
    const inp = document.getElementById('color-val');
    if (inp) inp.value = color;
  },

  _updateSectionSel(type) {
    const sel = document.getElementById('section-sel');
    if (!sel) return;
    const opts = type === 'numbers' ? SECTIONS_NUMS : SECTIONS_LETTERS;
    sel.innerHTML = opts.map(s => `<option>${s}</option>`).join('');
    this._updateClassPreview();
  },

  _updateClassPreview() {
    const gradeEl = document.querySelector('[name="gradeLevel"]');
    const secEl   = document.getElementById('section-sel');
    const preview = document.getElementById('class-name-preview');
    if (!gradeEl || !secEl || !preview) return;
    preview.textContent = `${gradeEl.value} ${secEl.value}`;
  },

  saveClass(e, editId) {
    e.preventDefault();
    const f           = e.target;
    const gradeLevel  = f.gradeLevel.value;
    const sectionType = f.sectionType.value;
    const section     = f.section.value;
    const name        = `${gradeLevel} ${section}`;
    const list = DB.get('classes');
    if (editId) {
      const idx = list.findIndex(c => c.id === editId);
      if (idx >= 0) {
        const updated = { ...list[idx], name, gradeLevel, sectionType, section, subject: f.subject.value, color: f.color?.value || '#2563EB' };
        list.splice(idx, 1);
        list.push(updated);
      }
    } else {
      list.push({ id: DB.id(), name, gradeLevel, sectionType, section, subject: f.subject.value, color: f.color?.value || '#2563EB' });
    }
    DB.set('classes', list);
    Modal.close(); Toast.show(editId ? 'تم تحديث الفصل!' : 'تم إضافة الفصل!'); this.classes();
  },

  deleteClass(id) {
    if (!confirm('حذف هذا الفصل وجميع بياناته؟')) return;
    DB.set('classes', DB.get('classes').filter(c => c.id !== id));
    DB.set('students', DB.get('students').filter(s => s.classId !== id));
    DB.set('attendance', DB.get('attendance').filter(a => a.classId !== id));
    Toast.show('تم الحذف', 'error'); this.classes();
  },

  async shareClassModal(clsId) {
    const cls      = DB.get('classes').find(c => c.id === clsId);
    const students = DB.get('students').filter(s => s.classId === clsId);
    if (!cls) return;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const payload = {
      class:    { name: cls.name, subject: cls.subject, grade: cls.grade, semester: cls.semester, color: cls.color },
      students: students.map(s => ({ name: s.name, gender: s.gender, notes: s.notes }))
    };
    const { error } = await _sb.from('shared_classes').insert({ code, data: payload });
    if (error) { Toast.show('حدث خطأ أثناء المشاركة', 'error'); return; }
    Modal.open('مشاركة الفصل', `
      <div style="text-align:center;padding:1rem 0">
        <p style="color:var(--gray-500);margin-bottom:1rem">شارك هذا الكود مع أي ${_T.tch} ليستورد الفصل و${_T.theStus}</p>
        <div style="font-size:2.5rem;font-weight:900;letter-spacing:.4rem;color:var(--primary);background:var(--primary-light);border-radius:12px;padding:1rem 2rem;margin-bottom:1rem;font-family:monospace">${code}</div>
        <p style="font-size:.8rem;color:var(--gray-400);margin-bottom:1.25rem">الفصل: ${cls.name} — ${students.length} ${_T.stu}</p>
        <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${code}').then(()=>Toast.show('تم النسخ!'))">
          <i class="fas fa-copy"></i> نسخ الكود
        </button>
      </div>
    `);
  },

  async shareAllClassesModal() {
    const classes  = DB.get('classes');
    const students = DB.get('students');
    if (!classes.length) { Toast.show('لا يوجد فصول للمشاركة', 'error'); return; }
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const payload = {
      all: true,
      classes: classes.map(cls => ({
        class:    { name: cls.name, subject: cls.subject, grade: cls.grade, semester: cls.semester, color: cls.color },
        students: students.filter(s => s.classId === cls.id).map(s => ({ name: s.name, gender: s.gender, notes: s.notes }))
      }))
    };
    const { error } = await _sb.from('shared_classes').insert({ code, data: payload });
    if (error) { Toast.show('حدث خطأ أثناء المشاركة', 'error'); return; }
    const totalStudents = students.length;
    Modal.open('مشاركة جميع الفصول', `
      <div style="text-align:center;padding:1rem 0">
        <p style="color:var(--gray-500);margin-bottom:1rem">شارك هذا الكود مع أي ${_T.tch} ليستورد جميع فصولك و${_T.theStus}</p>
        <div style="font-size:2.5rem;font-weight:900;letter-spacing:.4rem;color:var(--primary);background:var(--primary-light);border-radius:12px;padding:1rem 2rem;margin-bottom:1rem;font-family:monospace">${code}</div>
        <p style="font-size:.8rem;color:var(--gray-400);margin-bottom:1.25rem">${classes.length} فصل — ${totalStudents} ${_T.stu}</p>
        <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${code}').then(()=>Toast.show('تم النسخ!'))">
          <i class="fas fa-copy"></i> نسخ الكود
        </button>
      </div>
    `);
  },

  importClassModal() {
    Modal.open('استيراد فصل بكود', `
      <div class="form-group">
        <label>أدخل كود الفصل</label>
        <input type="text" id="import-code" placeholder="مثال: AB12CD" maxlength="6"
          style="text-transform:uppercase;font-size:1.5rem;letter-spacing:.3rem;text-align:center;font-family:monospace">
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" onclick="Pages._doImportClass()"><i class="fas fa-file-import"></i> استيراد</button>
        <button class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
      </div>
    `);
  },

  _importQueue: [],

  async _doImportClass() {
    const code = document.getElementById('import-code').value.trim().toUpperCase();
    if (code.length !== 6) { Toast.show('الكود يجب أن يكون 6 أحرف', 'error'); return; }
    const { data, error } = await _sb.from('shared_classes').select('data').eq('code', code).maybeSingle();
    if (error || !data) { Toast.show('الكود غير صحيح أو منتهي', 'error'); return; }
    const payload = data.data;
    this._importQueue = payload.all ? payload.classes : [{ class: payload.class, students: payload.students }];
    document.getElementById('modal-title').textContent = 'استيراد الفصول';
    const rows = this._importQueue.map((item, i) => `
      <div class="import-row" id="irow-${i}">
        <input type="checkbox" class="import-chk" id="ichk-${i}" checked
          onchange="document.getElementById('irow-${i}').classList.toggle('import-row-off',!this.checked)">
        <div class="import-row-info">
          <div class="import-row-name">${item.class.name}
            ${item.class.grade ? `<span class="import-badge">${item.class.grade}</span>` : ''}
            ${item.class.semester ? `<span class="import-badge">${item.class.semester}</span>` : ''}
          </div>
          <div class="import-row-meta"><i class="fas fa-users"></i> ${item.students.length} ${_T.stu}</div>
        </div>
        <input type="text" class="import-subj" id="isubj-${i}" placeholder="اسم المادة...">
      </div>
    `).join('');
    document.getElementById('modal-body').innerHTML = `
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:.4rem;font-size:.85rem;cursor:pointer">
          <input type="checkbox" id="chk-all" checked onchange="Pages._toggleAllImport(this.checked)"> تحديد الكل
        </label>
        <div style="display:flex;gap:.4rem;flex:1;min-width:160px">
          <input type="text" id="subj-fill" placeholder="اكتب مادة وطبّقها على الكل" style="flex:1;padding:.4rem .7rem;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.83rem;font-family:inherit">
          <button class="btn btn-sm btn-outline" onclick="Pages._fillAllSubjects()"><i class="fas fa-fill-drip"></i> تطبيق</button>
        </div>
      </div>
      <div class="import-list">${rows}</div>
      <div class="form-actions" style="margin-top:1rem">
        <button class="btn btn-primary" onclick="Pages._confirmImport()"><i class="fas fa-file-import"></i> استيراد المحدد</button>
        <button class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
      </div>
    `;
  },

  _toggleAllImport(checked) {
    this._importQueue.forEach((_, i) => {
      document.getElementById(`ichk-${i}`).checked = checked;
      document.getElementById(`irow-${i}`).classList.toggle('import-row-off', !checked);
    });
  },

  _fillAllSubjects() {
    const val = document.getElementById('subj-fill').value.trim();
    if (!val) return;
    this._importQueue.forEach((_, i) => {
      if (document.getElementById(`ichk-${i}`)?.checked)
        document.getElementById(`isubj-${i}`).value = val;
    });
  },

  _confirmImport() {
    const selected = this._importQueue.filter((_, i) => document.getElementById(`ichk-${i}`)?.checked);
    if (!selected.length) { Toast.show('لم تحدد أي فصل', 'error'); return; }
    let totalStudents = 0;
    let hasEmpty = false;
    this._importQueue.forEach((item, i) => {
      if (!document.getElementById(`ichk-${i}`)?.checked) return;
      const subject = document.getElementById(`isubj-${i}`)?.value.trim();
      if (!subject) { hasEmpty = true; return; }
      const newClsId = DB.id();
      DB.set('classes', [...DB.get('classes'), { ...item.class, subject, id: newClsId }]);
      DB.set('students', [...DB.get('students'), ...item.students.map(s => ({ ...s, id: DB.id(), classId: newClsId }))]);
      totalStudents += item.students.length;
    });
    if (hasEmpty) { Toast.show('بعض الفصول المحددة ليس لها مادة — أضف اسم المادة أو ألغِ تحديدها', 'error'); return; }
    Modal.close();
    Toast.show(`تم استيراد ${selected.length} فصل بـ ${totalStudents} ${_T.stu}`);
    this.classes();
  },

  /* ---- STUDENTS (merged with attendance) ---- */
  students(params = {}) {
    const classes  = DB.get('classes');
    const allStus  = DB.get('students');
    if (!classes.length) {
      document.getElementById('content').innerHTML = `
        <div class="empty-state"><div class="empty-icon"><i class="fas fa-users"></i></div>
        <h3>أضف فصلاً دراسياً أولاً</h3>
        <button class="btn btn-primary" onclick="Router.go('classes')">إدارة الفصول</button></div>`;
      return;
    }
    const today   = new Date().toISOString().slice(0, 10);
    const selId   = params.classId || classes[0].id;
    const selDate = params.date   || today;
    const list    = allStus.filter(s => s.classId === selId);

    // attendance state
    const allAtt = DB.get('attendance');
    const rec    = allAtt.find(a => a.classId === selId && a.date === selDate);
    const map    = {}; if (rec) rec.records.forEach(r => { map[r.studentId] = r.status; });
    list.forEach(s => { if (!map[s.id]) map[s.id] = 'present'; });
    Pages._currentAtt  = { ...map };
    Pages._attStudents = list;
    Pages._attClassId  = selId;
    Pages._attDate     = selDate;

    const tabs = classes.map(c => `<button class="filter-btn ${c.id===selId?'active':''}" onclick="Pages.students({classId:'${c.id}',date:'${selDate}'})">
      <span>${c.name}</span>${c.subject ? `<span class="tab-subject">${c.subject}</span>` : ''}
    </button>`).join('');

    const rows = list.map((s, i) => {
      const st   = map[s.id] || 'present';
      const behs = s.behaviors || {};
      const warns = _behWarn(s);
      const warnBadge = warns.length
        ? `<span title="${warns.map(b=>b.label).join('، ')}" style="background:#fee2e2;color:#dc2626;border-radius:20px;padding:1px 7px;font-size:.7rem;font-weight:700;cursor:default">
             <i class="fas fa-triangle-exclamation"></i> تحذير</span>` : '';
      const mkBadge = b => `
        <button onclick="Pages.incBehavior('${s.id}','${b.key}','${selId}')" title="${b.label}"
          style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;
                 padding:5px 7px;border-radius:10px;border:1.5px solid ${b.color}30;
                 background:${b.color}12;cursor:pointer;transition:all .15s;min-width:38px"
          onmouseover="this.style.background='${b.color}28';this.style.transform='translateY(-1px)'"
          onmouseout="this.style.background='${b.color}12';this.style.transform='none'">
          ${_bIcon(b)}
          <span id="beh-${s.id}-${b.key}" style="font-size:.7rem;font-weight:800;color:${b.color};line-height:1">${behs[b.key]||0}</span>
        </button>`;
      const posBadges = BEH_TYPES.filter(b=>b.pos).map(mkBadge).join('');
      const negBadges = BEH_TYPES.filter(b=>!b.pos).map(mkBadge).join('');
      const rowCls = st === 'absent' ? 'stu-row-absent' : st === 'late' ? 'stu-row-late' : '';
      return `
      <tr id="ar-${s.id}" class="${rowCls}">
        <td style="text-align:center;width:36px">${i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="student-avatar-sm" style="flex-shrink:0">${s.name.charAt(0)}</div>
            <div><div style="font-weight:600">${s.name}</div>${warnBadge}</div>
          </div>
        </td>
        <td style="width:80px">
          <div class="att-v">
            <button class="att-btn p ${st==='present'?'active':''}" onclick="Pages.setAtt('${s.id}','present','${selId}','${selDate}')"><i class="fas fa-check"></i> حاضر</button>
            <button class="att-btn l ${st==='late'?'active':''}"    onclick="Pages.setAtt('${s.id}','late','${selId}','${selDate}')"><i class="fas fa-clock"></i> متأخر</button>
            <button class="att-btn a ${st==='absent'?'active':''}"  onclick="Pages.setAtt('${s.id}','absent','${selId}','${selDate}')"><i class="fas fa-times"></i> غائب</button>
          </div>
        </td>
        <td>
          <div style="display:flex;flex-direction:column;gap:3px;align-items:center">
            <div style="display:flex;gap:3px;flex-wrap:wrap;justify-content:center">${posBadges}</div>
            <div style="width:100%;border-top:1px dashed #e5e7eb;margin:1px 0"></div>
            <div style="display:flex;gap:3px;flex-wrap:wrap;justify-content:center">${negBadges}</div>
          </div>
        </td>
        <td style="width:40px">
          <div class="dot-menu" id="dm-${s.id}">
            <button class="dot-btn" onclick="Pages._dotToggle('${s.id}',event)"><i class="fas fa-ellipsis-v"></i></button>
            <div class="dot-drop hidden">
              <button onclick="Pages.studentProfile('${s.id}');Pages._dotClose()"><i class="fas fa-user"></i> الملف</button>
              <button onclick="Pages.editStudentModal('${s.id}');Pages._dotClose()"><i class="fas fa-edit"></i> تعديل</button>
              <button onclick="Pages.transferStudentModal('${s.id}','${selId}');Pages._dotClose()"><i class="fas fa-exchange-alt"></i> نقل</button>
              <button class="danger" onclick="Pages.deleteStudent('${s.id}','${selId}');Pages._dotClose()"><i class="fas fa-trash"></i> حذف</button>
            </div>
          </div>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2>${_T.theStus}</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
          <input type="date" class="date-input" value="${selDate}" onchange="Pages.students({classId:'${selId}',date:this.value})">
          ${list.length ? `<button class="btn btn-outline" onclick="Pages.diceRoll('${selId}')"><i class="fas fa-dice"></i> النرد</button>` : ''}
          ${list.length >= 2 ? `<button class="btn btn-outline" onclick="Router.go('groups',{classId:'${selId}'})"><i class="fas fa-object-group"></i> مجموعات</button>` : ''}
          <button class="btn btn-outline" onclick="Pages.bulkStudentsModal('${selId}')"><i class="fas fa-list"></i> إضافة جماعية</button>
          <button class="btn btn-primary" onclick="Pages.addStudentModal('${selId}')"><i class="fas fa-user-plus"></i> إضافة</button>
        </div>
      </div>
      <div class="filter-bar">${tabs}</div>
      ${list.length ? `
      <div class="section-card">
        <div class="card-header" style="padding:.75rem 1.25rem">
          <div id="att-summary">${this._attSummary(list, map)}</div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" onclick="Pages.markAll('present')"><i class="fas fa-check-double"></i> حضور الكل</button>
            <button class="btn btn-sm btn-outline" onclick="Pages.markAll('absent')"><i class="fas fa-times"></i> غياب الكل</button>
            <button class="btn btn-sm btn-outline" onclick="Print.attendance('${selId}','${selDate}')"><i class="fas fa-print"></i> طباعة كشف الحضور</button>
          </div>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr>
              <th style="width:36px">#</th>
              <th>الاسم</th>
              <th style="width:80px;text-align:center">الحضور</th>
              <th style="text-align:center">السلوك</th>
              <th style="width:40px"></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="padding:.5rem 1.25rem;font-size:.78rem;color:var(--gray-400);border-top:1px solid var(--gray-100)">
          <i class="fas fa-cloud"></i> يُحفظ تلقائياً عند كل تغيير
        </div>
      </div>` : `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-user-plus"></i></div>
        <h3>لا يوجد ${_T.theStus} في هذا الفصل</h3>
        <button class="btn btn-primary" onclick="Pages.addStudentModal('${selId}')"><i class="fas fa-user-plus"></i> إضافة ${_T.stu}</button>
      </div>`}
    `;
  },

  _dotToggle(stuId, e) {
    e.stopPropagation();
    const drop = document.querySelector(`#dm-${stuId} .dot-drop`);
    document.querySelectorAll('.dot-drop:not(.hidden)').forEach(d => { if (d !== drop) d.classList.add('hidden'); });
    drop?.classList.toggle('hidden');
  },

  _dotClose() {
    document.querySelectorAll('.dot-drop:not(.hidden)').forEach(d => d.classList.add('hidden'));
  },

  _diceQueues: {},

  diceRoll(classId) {
    const today = new Date().toISOString().slice(0, 10);
    const allAtt = DB.get('attendance');
    const rec = allAtt.find(a => a.classId === classId && a.date === today);
    const absentIds = new Set((rec?.records || []).filter(r => r.status === 'absent').map(r => r.studentId));
    const pool = DB.get('students').filter(s => s.classId === classId && !absentIds.has(s.id));
    if (!pool.length) { Toast.show('لا يوجد طلاب حاضرون اليوم', 'warn'); return; }

    // refill queue if empty
    if (!this._diceQueues[classId] || !this._diceQueues[classId].length) {
      this._diceQueues[classId] = [...pool].sort(() => Math.random() - .5).map(s => s.id);
    }
    const pickedId = this._diceQueues[classId].pop();
    const chosen = pool.find(s => s.id === pickedId) || pool[0];
    const remaining = this._diceQueues[classId].length;

    const allNames = pool.map(s => s.name);
    // find chosen student's group if groups are active for this class
    const grpIdx = (this._grpWork && this._grpClass === classId)
      ? this._grpWork.findIndex(g => g.some(s => s.id === chosen.id))
      : -1;
    const grpName = grpIdx !== -1 ? (this._grpNames[grpIdx] || `المجموعة ${grpIdx + 1}`) : null;
    const grpColor = grpIdx !== -1 ? this._GRP_COLORS[grpIdx % this._GRP_COLORS.length] : '#0d9488';
    const cls = DB.get('classes').find(c => c.id === classId);

    let idx = 0, frame = 0, speed = 40;

    Modal.open('🎲 النرد — اختيار عشوائي', `
      <div style="text-align:center;padding:.75rem 0">
        <div id="dice-avatar" class="dice-avatar" style="opacity:0">${chosen.name.charAt(0)}</div>
        <div id="dice-display" style="font-size:1.8rem;font-weight:900;color:#0d9488;
          min-height:52px;line-height:52px;border-radius:14px;
          padding:0 1.2rem;margin-bottom:.4rem;letter-spacing:-.5px">&nbsp;</div>
        <div id="dice-cls" style="color:#9ca3af;font-size:.78rem;margin-bottom:.2rem">${cls?.name || ''}</div>
        <div id="dice-grp" style="display:none;font-size:.8rem;font-weight:700;margin-bottom:.75rem"></div>
        <div id="dice-sub" style="color:#6b7280;font-size:.82rem;margin-bottom:.75rem">جاري الاختيار...</div>
        <div id="dice-remain" style="color:#9ca3af;font-size:.75rem;margin-bottom:.75rem;display:none"></div>
        <div id="dice-ans-btns" style="display:none;flex-direction:column;gap:.5rem;align-items:center;margin-bottom:.75rem">
          <div style="display:flex;gap:.65rem">
            <button class="btn btn-sm" style="background:#16a34a;color:#fff;min-width:110px;font-size:.85rem"
              onclick="Pages._diceAnswer('${chosen.id}','${classId}',true)">
              <i class="fas fa-check"></i> صحيحة
            </button>
            <button class="btn btn-sm" style="background:#dc2626;color:#fff;min-width:110px;font-size:.85rem"
              onclick="Pages._diceAnswer('${chosen.id}','${classId}',false)">
              <i class="fas fa-times"></i> خاطئة
            </button>
          </div>
        </div>
        <button id="dice-again-btn" class="btn btn-primary hidden" style="min-width:140px"
          onclick="Modal.close();Pages.diceRoll('${classId}')">
          <i class="fas fa-redo"></i> أعد الرمي
        </button>
      </div>`);

    const spin = () => {
      const el = document.getElementById('dice-display');
      if (!el) return;
      idx = (idx + 1) % allNames.length;
      el.textContent = allNames[idx];
      frame++;
      if (frame < 30) {
        Sound.tick(1);
        setTimeout(spin, speed);
      } else if (frame < 50) {
        speed = 60 + (frame - 30) * 10;
        Sound.tick(Math.max(0.1, 1 - (frame - 30) / 20));
        setTimeout(spin, speed);
      } else {
        Sound.land();
        el.textContent = chosen.name;
        el.style.color = '#065f46';
        // show avatar
        const av = document.getElementById('dice-avatar');
        if (av) { av.style.background = `linear-gradient(135deg,${grpColor},${grpColor}cc)`; av.style.opacity = '1'; }
        // show group badge
        if (grpName) {
          const gd = document.getElementById('dice-grp');
          if (gd) { gd.style.display = 'block'; gd.innerHTML = `<span style="background:${grpColor}22;color:${grpColor};padding:.2rem .7rem;border-radius:99px"><i class="fas fa-users"></i> ${grpName}</span>`; }
        }
        const sub = document.getElementById('dice-sub');
        if (sub) sub.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981"></i> تم الاختيار`;
        const rem = document.getElementById('dice-remain');
        if (rem) {
          rem.style.display = 'block';
          rem.textContent = remaining > 0
            ? `متبقى ${remaining} ${_T.stu} لم يُختاروا بعد`
            : `تم اختيار الجميع — ستُعاد القرعة من البداية`;
        }
        const ans = document.getElementById('dice-ans-btns');
        if (ans) ans.style.display = 'flex';
        const btn = document.getElementById('dice-again-btn');
        if (btn) btn.classList.remove('hidden');
      }
    };
    setTimeout(spin, 50);
  },

  _diceAnswer(stuId, classId, correct) {
    if (correct) this.incBehavior(stuId, 'correct', classId);
    correct ? Sound.correct() : Sound.wrong();

    // avatar flash
    const av = document.getElementById('dice-avatar');
    if (av) {
      av.classList.add(correct ? 'correct-flash' : 'wrong-flash');
      av.textContent = correct ? '✓' : '✗';
    }

    // group session points
    if (this._grpWork && this._grpClass === classId) {
      const gi = this._grpWork.findIndex(grp => grp.some(s => s.id === stuId));
      if (gi !== -1) {
        this._grpSessionPts[gi] = Math.max(0, (this._grpSessionPts[gi] || 0) + (correct ? 1 : -1));
        const ptEl = document.getElementById(`grp-ses-${gi}`);
        if (ptEl) ptEl.textContent = this._grpSessionPts[gi];
      }
    }

    const stu = DB.get('students').find(s => s.id === stuId);
    Toast.show(correct
      ? `✅ ${stu?.name} — إجابة صحيحة!`
      : `❌ ${stu?.name} — إجابة خاطئة`, correct ? 'success' : 'error');

    const ans = document.getElementById('dice-ans-btns');
    if (ans) ans.style.display = 'none';
  },

  /* ---- GROUPS PAGE ---- */
  _GRP_COLORS: ['#0d9488','#7c3aed','#dc2626','#ea580c','#0369a1','#65a30d','#c026d3','#b45309'],
  _grpDrag: null,
  _grpWork: null,
  _grpClass: null,
  _grpSessionPts: [],
  _grpNames: [],

  _grpDefaultName: (i) => `المجموعة ${i + 1}`,

  groups(params = {}) {
    const classes = DB.get('classes');
    if (!classes.length) {
      document.getElementById('content').innerHTML = `
        <div class="empty-state"><div class="empty-icon"><i class="fas fa-object-group"></i></div>
        <h3>أضف فصلاً دراسياً أولاً</h3>
        <button class="btn btn-primary" onclick="Router.go('classes')">إدارة الفصول</button></div>`;
      return;
    }
    const selId = params.classId || classes[0].id;
    const switchingClass = selId !== this._grpClass;
    this._grpClass = selId;
    const saved = (DB.get('groups') || []).find(g => g.classId === selId);
    if (params.work !== undefined) {
      this._grpWork = params.work;
      this._grpSessionPts = params.work.map(() => 0);
      this._grpNames = params.work.map((_, i) => saved?.groupNames?.[i] || `المجموعة ${i + 1}`);
    } else if (saved) {
      const students = DB.get('students');
      this._grpWork = saved.members.map(ids => ids.map(id => students.find(s => s.id === id)).filter(Boolean));
      if (switchingClass || !this._grpSessionPts.length || this._grpSessionPts.length !== saved.members.length)
        this._grpSessionPts = saved.members.map(() => 0);
      this._grpNames = saved.members.map((_, i) => saved.groupNames?.[i] || `المجموعة ${i + 1}`);
    } else {
      this._grpWork = null;
      this._grpSessionPts = [];
      this._grpNames = [];
    }

    const tabs = classes.map(c => `<button class="filter-btn ${c.id===selId?'active':''}" onclick="Pages.groups({classId:'${c.id}'})">
      <span>${c.name}</span>${c.subject ? `<span class="tab-subject">${c.subject}</span>` : ''}
    </button>`).join('');

    const isSaved = !!saved;
    const hasWork = !!this._grpWork;
    const totalPts = saved?.totalPoints || [];
    const hasPts = totalPts.some(p => p > 0);

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2>المجموعات | Groups</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="Pages._grpSplitModal('${selId}')"><i class="fas fa-random"></i> تقسيم جديد</button>
          ${hasWork ? `<button class="btn btn-outline" onclick="Pages._grpDiceRoll('${selId}')"><i class="fas fa-dice"></i> نرد المجموعات</button>` : ''}
          ${hasWork && isSaved ? `<button class="btn btn-primary" onclick="Pages._grpSaveSession('${selId}')"><i class="fas fa-save"></i> حفظ نقاط الحصة</button>` : ''}
          ${hasWork && !isSaved ? `<button class="btn btn-primary" onclick="Pages._grpSave('${selId}')"><i class="fas fa-thumbtack"></i> تثبيت المجموعات</button>` : ''}
          ${isSaved && hasPts ? `<button class="btn btn-outline" onclick="Pages._grpHonor('${selId}')" style="color:#d97706;border-color:#d97706"><i class="fas fa-trophy"></i> تكريم الفائز</button>` : ''}
          ${isSaved ? `<button class="btn btn-outline-danger" onclick="Pages._grpDelete('${selId}')"><i class="fas fa-trash"></i> حذف</button>` : ''}
          ${hasWork ? `<button class="btn btn-outline" onclick="Print.groups(Pages._grpWork.map(g=>g.map(s=>s.name)))"><i class="fas fa-print"></i> طباعة</button>` : ''}
        </div>
      </div>
      <div class="filter-bar">${tabs}</div>
      ${isSaved && hasPts ? this._grpLeaderboard(saved, selId) : ''}
      <div id="grp-container">${this._grpRender(selId)}</div>`;
  },

  _grpLeaderboard(saved, classId) {
    const C = this._GRP_COLORS;
    const pts = saved.totalPoints || [];
    const ranked = pts.map((p, i) => ({ i, p })).sort((a, b) => b.p - a.p);
    const medals = ['🥇','🥈','🥉'];
    const rows = ranked.map((r, ri) => `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:10px;
        background:${ri===0?'#fef9c3':'#f9fafb'};border:1px solid ${ri===0?'#fde047':'#e5e7eb'}">
        <span style="font-size:1.1rem">${medals[ri]||''}</span>
        <div style="width:10px;height:10px;border-radius:50%;background:${C[r.i%C.length]};flex-shrink:0"></div>
        <span style="font-weight:700;flex:1">${saved.groupNames?.[r.i] || `المجموعة ${r.i+1}`}</span>
        <span style="font-weight:900;color:${C[r.i%C.length]};font-size:1.05rem">${r.p}</span>
        <span style="color:#9ca3af;font-size:.78rem">نقطة</span>
      </div>`).join('');
    const history = saved.sessions?.length
      ? `<div style="color:#6b7280;font-size:.78rem;margin-top:.4rem;text-align:center">${saved.sessions.length} حصة مسجّلة</div>` : '';
    return `<div class="section-card" style="padding:.75rem 1rem;margin-bottom:.5rem">
      <div style="font-weight:700;font-size:.88rem;margin-bottom:.5rem;color:#374151"><i class="fas fa-trophy" style="color:#d97706"></i> لوحة النقاط التراكمية</div>
      <div style="display:flex;flex-direction:column;gap:5px">${rows}</div>
      ${history}
    </div>`;
  },

  _grpRender() {
    if (!this._grpWork) {
      const classId = this._grpClass;
      return `<div class="empty-state">
        <div class="empty-icon"><i class="fas fa-object-group"></i></div>
        <h3>لا توجد مجموعات محفوظة لهذا الفصل</h3>
        <button class="btn btn-primary" onclick="Pages._grpSplitModal('${classId}')"><i class="fas fa-random"></i> تقسيم جديد</button>
      </div>`;
    }
    const C = this._GRP_COLORS;
    const posBeh = BEH_TYPES.filter(b => b.pos);
    const saved = (DB.get('groups') || []).find(g => g.classId === this._grpClass);
    const totalPts = saved?.totalPoints || this._grpWork.map(() => 0);

    const cards = this._grpWork.map((g, gi) => {
      const c = C[gi % C.length];
      const sesPts = this._grpSessionPts[gi] || 0;
      const totPts = totalPts[gi] || 0;
      const isEmpty = g.length === 0;

      const behBtns = posBeh.map(b => `
        <button onclick="Pages._grpIncBehavior(${gi},'${b.key}')"
          title="منح '${b.label}' لكل المجموعة (+1 نقطة)"
          style="display:flex;flex-direction:column;align-items:center;gap:2px;
            padding:5px 8px;border-radius:9px;border:1.5px solid ${b.color}40;
            background:${b.color}10;cursor:pointer;flex:1;transition:background .15s"
          onmouseover="this.style.background='${b.color}25'"
          onmouseout="this.style.background='${b.color}10'">
          <span style="font-size:1.1rem">${b.emoji}</span>
          <span style="font-size:.65rem;color:${b.color};font-weight:700;white-space:nowrap">${b.label}</span>
        </button>`).join('');

      const items = g.map(s => `
        <div draggable="true"
          ondragstart="Pages._grpDragStart(event,'${s.id}',${gi})"
          ondragend="Pages._grpDragEnd(event)"
          style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;
            background:#fff;border:1px solid #e5e7eb;cursor:grab;transition:opacity .15s">
          <i class="fas fa-grip-vertical" style="color:#d1d5db;font-size:.7rem"></i>
          <span style="font-size:.88rem;flex:1">${s.name}</span>
        </div>`).join('');

      const grpName = this._grpNames[gi] || `المجموعة ${gi + 1}`;
      return `
        <div ondragover="event.preventDefault()" ondrop="Pages._grpDrop(event,${gi})"
          style="background:#f9fafb;border:2px solid ${isEmpty?'#e5e7eb':c};border-radius:14px;
            overflow:hidden;min-width:190px;flex:1;opacity:${isEmpty?.6:1}">
          <div style="background:${isEmpty?'#9ca3af':c};color:#fff;display:flex;align-items:center;
            padding:7px 10px;gap:6px">
            <span id="grp-name-${gi}"
              contenteditable="true"
              onblur="Pages._grpRenameBlur(${gi},this)"
              onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
              onclick="event.stopPropagation()"
              style="font-weight:700;font-size:.9rem;flex:1;outline:none;cursor:text;
                border-bottom:1px dashed rgba(255,255,255,.5);min-width:0"
              title="اضغط لتعديل الاسم">${grpName}</span>
            <span style="opacity:.65;font-size:.76rem;flex-shrink:0">(${g.length})</span>
            ${isEmpty ? `<button onclick="Pages._grpRemoveEmpty(${gi})"
              style="background:rgba(255,255,255,.25);border:none;color:#fff;
                border-radius:5px;padding:2px 7px;cursor:pointer;font-size:.72rem;font-family:inherit"
              title="حذف المجموعة الفارغة">حذف</button>` : ''}
          </div>

          <!-- نقاط -->
          <div style="display:flex;align-items:center;gap:6px;
            padding:5px 10px;background:${c}12;border-bottom:1px solid ${c}25">
            <div style="flex:1">
              <span id="grp-ses-${gi}" style="font-size:1.4rem;font-weight:900;color:${c}">${sesPts}</span>
              <span style="font-size:.68rem;color:#9ca3af;margin-right:3px">هذه الحصة</span>
            </div>
            <button onclick="Pages._grpDeduct(${gi})" title="خصم نقطة (مشاغبة)"
              style="flex-shrink:0;padding:3px 9px;border-radius:7px;border:1.5px solid #dc2626;
                background:#fff;color:#dc2626;cursor:pointer;font-size:.78rem;font-weight:700;
                transition:background .12s"
              onmouseover="this.style.background='#fee2e2'"
              onmouseout="this.style.background='#fff'">−1 🔴</button>
            <div style="text-align:left;font-size:.72rem;color:#9ca3af;flex-shrink:0">
              ترم: <span id="grp-tot-${gi}" style="font-weight:800;color:${c};font-size:.83rem">${totPts}</span>
            </div>
          </div>

          <!-- السلوك -->
          ${isEmpty ? '' : `<div style="padding:7px 8px;display:flex;gap:4px;border-bottom:1px solid #e5e7eb;flex-wrap:wrap">${behBtns}</div>`}

          <!-- الأعضاء -->
          <div style="padding:8px;display:flex;flex-direction:column;gap:5px;min-height:32px">
            ${items}
            ${isEmpty ? `<div style="text-align:center;color:#9ca3af;font-size:.8rem;padding:4px">فارغة — اسحب إليها أعضاء</div>` : ''}
          </div>
        </div>`;
    }).join('');

    return `<div class="section-card" style="padding:1rem">
      <div style="display:flex;flex-wrap:wrap;gap:12px">${cards}</div>
      <p style="color:#9ca3af;font-size:.78rem;margin-top:.8rem;text-align:center">
        <i class="fas fa-info-circle"></i> اسحب الأسماء بين المجموعات لإعادة التوزيع
      </p>
    </div>`;
  },

  _grpIncBehavior(gi, key) {
    const group = this._grpWork?.[gi];
    if (!group?.length) return;
    const stuIds = new Set(group.map(s => s.id));
    const bDef = BEH_TYPES.find(b => b.key === key);
    const list = DB.get('students');
    let warnNames = [];
    const updated = list.map(s => {
      if (!stuIds.has(s.id)) return s;
      const behs = { ...(s.behaviors || {}) };
      behs[key] = (behs[key] || 0) + 1;
      if (bDef?.warnAt && behs[key] >= bDef.warnAt) warnNames.push(s.name);
      return { ...s, behaviors: behs };
    });
    DB.set('students', updated);
    const fresh = DB.get('students');
    this._grpWork = this._grpWork.map(g => g.map(s => fresh.find(x => x.id === s.id) || s));
    // auto-add 1 point per positive behavior
    this._grpSessionPts[gi] = (this._grpSessionPts[gi] || 0) + 1;
    const ptEl = document.getElementById(`grp-ses-${gi}`);
    if (ptEl) ptEl.textContent = this._grpSessionPts[gi];
    Toast.show(`${bDef?.emoji || ''} "${bDef?.label}" — ${group.length} ${_T.stus} (+1 نقطة)`);
    if (warnNames.length) Toast.show(`⚠️ تحذير: ${warnNames.join('، ')}`, 'error');
  },

  _grpDragStart(e, stuId, fromGroup) {
    this._grpDrag = { stuId, fromGroup };
    e.target.style.opacity = '.4';
    e.dataTransfer.effectAllowed = 'move';
  },

  _grpDragEnd(e) {
    e.target.style.opacity = '1';
  },

  _grpDrop(e, toGroup) {
    if (!this._grpDrag || this._grpDrag.fromGroup === toGroup) return;
    const { stuId, fromGroup } = this._grpDrag;
    const stu = this._grpWork[fromGroup].find(s => s.id === stuId);
    if (!stu) return;
    this._grpWork[fromGroup] = this._grpWork[fromGroup].filter(s => s.id !== stuId);
    this._grpWork[toGroup] = [...this._grpWork[toGroup], stu];
    this._grpDrag = null;
    document.getElementById('grp-container').innerHTML = this._grpRender();
  },

  _grpAddPt(gi, delta) {
    this._grpSessionPts[gi] = Math.max(0, (this._grpSessionPts[gi] || 0) + delta);
    const el = document.getElementById(`grp-ses-${gi}`);
    if (el) el.textContent = this._grpSessionPts[gi];
  },

  _grpRenameBlur(gi, el) {
    const name = el.textContent.trim() || `المجموعة ${gi + 1}`;
    el.textContent = name;
    this._grpNames[gi] = name;
    // persist if already saved
    const all = DB.get('groups') || [];
    const existing = all.find(g => g.classId === this._grpClass);
    if (existing) {
      const names = [...(existing.groupNames || existing.members.map((_, i) => `المجموعة ${i + 1}`))];
      names[gi] = name;
      DB.set('groups', [...all.filter(g => g.classId !== this._grpClass), { ...existing, groupNames: names }]);
    }
  },

  _grpRemoveEmpty(gi) {
    if (!this._grpWork) return;
    if (this._grpWork[gi]?.length > 0) return;
    this._grpWork.splice(gi, 1);
    this._grpSessionPts.splice(gi, 1);
    this._grpNames.splice(gi, 1);
    document.getElementById('grp-container').innerHTML = this._grpRender();
  },

  _grpDiceQueues: {},

  _grpDiceRoll(classId) {
    if (!this._grpWork?.length) return;
    const nonEmpty = this._grpWork.map((g, i) => ({ i, g })).filter(x => x.g.length > 0);
    if (!nonEmpty.length) { Toast.show('لا توجد مجموعات بها أعضاء', 'warn'); return; }

    // no-repeat queue
    const qKey = classId + '_' + this._grpWork.length;
    if (!this._grpDiceQueues[qKey]?.length)
      this._grpDiceQueues[qKey] = [...nonEmpty].sort(() => Math.random() - .5).map(x => x.i);
    const chosenIdx = this._grpDiceQueues[qKey].pop();
    const remaining = this._grpDiceQueues[qKey].length;
    const chosen = nonEmpty.find(x => x.i === chosenIdx) || nonEmpty[0];

    const C = this._GRP_COLORS;
    const labels = nonEmpty.map(x => this._grpNames[x.i] || `المجموعة ${x.i + 1}`);
    const chosenLabel = this._grpNames[chosen.i] || `المجموعة ${chosen.i + 1}`;
    const chosenColor = C[chosen.i % C.length];
    let idx = 0, frame = 0, speed = 40;

    Modal.open('🎲 نرد المجموعات', `
      <div style="text-align:center;padding:.5rem 0">
        <div id="grp-dice-display" style="font-size:2rem;font-weight:900;color:#0d9488;
          min-height:64px;line-height:64px;background:#f0fdfa;border-radius:16px;
          padding:0 1.5rem;margin-bottom:1rem;letter-spacing:-.5px">&nbsp;</div>
        <div id="grp-dice-sub" style="color:#6b7280;font-size:.85rem;margin-bottom:.5rem">جاري الاختيار...</div>
        <div id="grp-dice-remain" style="display:none;color:#9ca3af;font-size:.75rem;margin-bottom:.8rem"></div>
        <div id="grp-dice-actions" style="display:none;flex-direction:column;gap:.5rem;align-items:center">
          <button class="btn btn-primary" style="min-width:190px"
            onclick="Pages._grpDicePt(${chosen.i},1)">
            ✅ إجابة صحيحة (+1 نقطة)
          </button>
          <button class="btn btn-outline-danger" style="min-width:190px"
            onclick="Pages._grpDicePt(${chosen.i},-1)">
            ❌ إجابة خاطئة (−1 نقطة)
          </button>
          <button class="btn btn-outline" style="min-width:190px"
            onclick="Modal.close();Pages._grpDiceRoll('${classId}')">
            <i class="fas fa-redo"></i> أعد الرمي
          </button>
          <button class="btn btn-outline" style="min-width:190px" onclick="Modal.close()">إغلاق</button>
        </div>
      </div>`);

    const spin = () => {
      const el = document.getElementById('grp-dice-display');
      if (!el) return;
      idx = (idx + 1) % labels.length;
      el.textContent = labels[idx];
      frame++;
      if (frame < 25) { Sound.tick(1); setTimeout(spin, speed); }
      else if (frame < 45) { speed = 60 + (frame - 25) * 12; Sound.tick(Math.max(0.1, 1 - (frame-25)/20)); setTimeout(spin, speed); }
      else {
        Sound.land();
        el.textContent = chosenLabel;
        el.style.color = chosenColor;
        el.style.background = chosenColor + '18';
        const sub = document.getElementById('grp-dice-sub');
        if (sub) sub.innerHTML = `<i class="fas fa-users" style="color:${chosenColor}"></i> <strong>${chosenLabel}</strong>`;
        const rem = document.getElementById('grp-dice-remain');
        if (rem) {
          rem.style.display = 'block';
          rem.textContent = remaining > 0
            ? `متبقى ${remaining} مجموعة لم تُختار بعد`
            : `تم اختيار جميع المجموعات — ستُعاد القرعة من البداية`;
        }
        const acts = document.getElementById('grp-dice-actions');
        if (acts) acts.style.display = 'flex';
      }
    };
    setTimeout(spin, 50);
  },

  _grpDicePt(gi, delta) {
    this._grpSessionPts[gi] = Math.max(0, (this._grpSessionPts[gi] || 0) + delta);
    delta > 0 ? Sound.correct() : Sound.wrong();
    Modal.close();
    const sign = delta > 0 ? `✅ +${delta}` : `❌ ${delta}`;
    Toast.show(`${sign} نقطة للمجموعة ${gi + 1}`);
    const el = document.getElementById(`grp-ses-${gi}`);
    if (el) el.textContent = this._grpSessionPts[gi];
  },

  _grpDeduct(gi) {
    this._grpSessionPts[gi] = Math.max(0, (this._grpSessionPts[gi] || 0) - 1);
    Toast.show(`🔴 −1 نقطة من المجموعة ${gi + 1}`, 'error');
    const el = document.getElementById(`grp-ses-${gi}`);
    if (el) el.textContent = this._grpSessionPts[gi];
  },

  _grpSaveSession(classId) {
    if (!this._grpWork) return;
    const today = new Date().toISOString().slice(0, 10);
    const all = DB.get('groups') || [];
    const existing = all.find(g => g.classId === classId);
    if (!existing) { Toast.show('ثبّت المجموعات أولاً', 'warn'); return; }
    const prevTotal = existing.totalPoints || existing.members.map(() => 0);
    const newTotal = prevTotal.map((p, i) => p + (this._grpSessionPts[i] || 0));
    const sessions = [...(existing.sessions || []), { date: today, points: [...this._grpSessionPts] }];
    const updated = { ...existing, totalPoints: newTotal, sessions, groupNames: [...this._grpNames] };
    DB.set('groups', [...all.filter(g => g.classId !== classId), updated]);
    Toast.show(`✅ تم حفظ نقاط الحصة — ${today}`);
    this._grpSessionPts = this._grpWork.map(() => 0);
    Pages.groups({ classId });
  },

  _grpHonor(classId) {
    const saved = (DB.get('groups') || []).find(g => g.classId === classId);
    if (!saved?.totalPoints?.length) return;
    const C = this._GRP_COLORS;
    const pts = saved.totalPoints;
    const maxPts = Math.max(...pts);
    const winners = pts.map((p, i) => ({ i, p })).filter(x => x.p === maxPts);
    const students = DB.get('students');
    const winnerCards = winners.map(w => {
      const c = C[w.i % C.length];
      const members = saved.members[w.i].map(id => students.find(s => s.id === id)?.name).filter(Boolean);
      return `<div style="border:3px solid ${c};border-radius:14px;overflow:hidden;flex:1;min-width:160px">
        <div style="background:${c};color:#fff;text-align:center;padding:8px;font-weight:700">
          🏆 ${saved.groupNames?.[w.i] || `المجموعة ${w.i + 1}`}
        </div>
        <div style="padding:10px;text-align:center">
          <div style="font-size:2rem;font-weight:900;color:${c};margin-bottom:4px">${w.p}</div>
          <div style="font-size:.78rem;color:#6b7280;margin-bottom:8px">نقطة</div>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:3px">
            ${members.map(n => `<li style="font-size:.84rem;background:#f9fafb;border-radius:6px;padding:3px 8px">${n}</li>`).join('')}
          </ul>
        </div>
      </div>`;
    }).join('');

    const sessions = saved.sessions || [];
    const history = sessions.length ? `
      <div style="margin-top:1rem">
        <div style="font-weight:700;font-size:.85rem;color:#374151;margin-bottom:.4rem">سجل الحصص (${sessions.length})</div>
        <div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto">
          ${sessions.map(s => `<div style="display:flex;gap:8px;font-size:.8rem;padding:4px 8px;background:#f9fafb;border-radius:7px">
            <span style="color:#6b7280;flex-shrink:0">${s.date}</span>
            ${s.points.map((p, gi) => `<span style="color:${C[gi%C.length]};font-weight:700">${saved.groupNames?.[gi]||`م${gi+1}`}: ${p}</span>`).join(' | ')}
          </div>`).join('')}
        </div>
      </div>` : '';

    Modal.open('🏆 تكريم الفائز', `
      <div style="text-align:center;margin-bottom:1rem">
        <div style="font-size:2rem">🎉🏆🎉</div>
        <div style="font-weight:700;font-size:1rem;color:#374151;margin-top:.4rem">
          ${winners.length > 1 ? 'تعادل! الفائزون:' : 'المجموعة الفائزة:'}
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">${winnerCards}</div>
      ${history}
    `);
  },

  _grpSplitModal(classId) {
    const total = DB.get('students').filter(s => s.classId === classId).length;
    Modal.open('تقسيم إلى مجموعات', `
      <form onsubmit="Pages._grpDoSplit(event,'${classId}')">
        <div style="color:#6b7280;font-size:.85rem;margin-bottom:1rem">عدد الطلاب: <strong>${total}</strong></div>
        <div class="form-group">
          <label>طريقة التقسيم</label>
          <div style="display:flex;gap:1rem;margin-top:.5rem">
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="radio" name="split-mode" value="count" checked
                onchange="document.getElementById('split-label').textContent='عدد المجموعات'"> عدد المجموعات
            </label>
            <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-weight:600">
              <input type="radio" name="split-mode" value="size"
                onchange="document.getElementById('split-label').textContent='طلاب في كل مجموعة'"> حجم المجموعة
            </label>
          </div>
        </div>
        <div class="form-group">
          <label id="split-label">عدد المجموعات</label>
          <input type="number" name="split-val" min="2" max="${total}" value="2" required style="max-width:120px">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fas fa-object-group"></i> تقسيم</button>
          <button type="button" class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
        </div>
      </form>`);
  },

  _grpDoSplit(e, classId) {
    e.preventDefault();
    const mode = e.target.querySelector('[name="split-mode"]:checked').value;
    const val  = parseInt(e.target.querySelector('[name="split-val"]').value) || 2;
    const students = DB.get('students').filter(s => s.classId === classId);
    const shuffled = [...students].sort(() => Math.random() - .5);
    let work = [];
    if (mode === 'count') {
      const n = Math.min(val, shuffled.length);
      for (let i = 0; i < n; i++) work.push([]);
      shuffled.forEach((s, i) => work[i % n].push(s));
    } else {
      const size = Math.max(1, val);
      for (let i = 0; i < shuffled.length; i += size) work.push(shuffled.slice(i, i + size));
    }
    Modal.close();
    Pages.groups({ classId, work });
  },

  _grpSave(classId) {
    if (!this._grpWork) return;
    const all = DB.get('groups') || [];
    const existing = all.find(g => g.classId === classId);
    const entry = {
      classId,
      savedAt: new Date().toISOString().slice(0, 10),
      members: this._grpWork.map(g => g.map(s => s.id)),
      totalPoints: existing?.totalPoints || this._grpWork.map(() => 0),
      sessions: existing?.sessions || [],
      groupNames: [...this._grpNames],
    };
    DB.set('groups', [...all.filter(g => g.classId !== classId), entry]);
    Toast.show('تم تثبيت المجموعات');
    Pages.groups({ classId });
  },

  _grpDelete(classId) {
    DB.set('groups', (DB.get('groups') || []).filter(g => g.classId !== classId));
    this._grpWork = null;
    Toast.show('تم حذف المجموعات');
    Pages.groups({ classId });
  },

  _studentForm(data = {}, classes = [], selClass = '') {
    return `
      <div class="form-group"><label>اسم ${_T.theStu} *</label>
        <input type="text" name="name" value="${data.name||''}" placeholder="الاسم الرباعي" required></div>
      <div class="form-group"><label>الفصل *</label>
        <select name="classId" required>
          ${classes.map(c => `<option value="${c.id}" ${(data.classId||selClass)===c.id?'selected':''}>${c.name}</option>`).join('')}
        </select></div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
        <button type="button" class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
      </div>`;
  },

  bulkStudentsModal(classId) {
    const classes = DB.get('classes');
    Modal.open(`إضافة جماعية | Bulk Add Students`, `
      <form onsubmit="Pages.saveBulkStudents(event, '${classId}')">
        <div class="form-group">
          <label>الفصل الدراسي *</label>
          <select name="classId" required>
            ${classes.map(c => `<option value="${c.id}" ${c.id===classId?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>أسماء ${_T.theStus} — كل سطر اسم واحد *</label>
          <textarea name="names" rows="12" placeholder="أحمد محمد علي&#10;خالد عبدالله السالم&#10;سعد يوسف الحربي&#10;..." required style="font-size:.95rem;line-height:1.8"></textarea>
          <div style="font-size:.78rem;color:var(--gray-400);margin-top:.3rem"><i class="fas fa-info-circle"></i> اكتب أو الصق الأسماء — كل سطر ${_T.stu}</div>
        </div>
        <div id="bulk-preview" style="margin-bottom:.75rem"></div>
        <div class="form-actions">
          <button type="button" class="btn btn-outline" onclick="Pages._previewBulk()"><i class="fas fa-eye"></i> معاينة</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> إضافة الكل</button>
          <button type="button" class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
        </div>
      </form>`);
  },

  _previewBulk() {
    const ta = document.querySelector('[name="names"]');
    if (!ta) return;
    const names = ta.value.split('\n').map(n => n.trim()).filter(n => n.length > 1);
    const el = document.getElementById('bulk-preview');
    if (!el) return;
    if (!names.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div style="background:var(--green-light);color:var(--green);padding:.6rem 1rem;border-radius:8px;font-size:.85rem;font-weight:700">
      <i class="fas fa-check-circle"></i> سيتم إضافة ${names.length} ${_T.stu}:
      <div style="margin-top:.4rem;color:var(--gray-700);font-weight:400">${names.slice(0,5).join(' — ')}${names.length>5?` ... و${names.length-5} آخرين`:''}</div>
    </div>`;
  },

  saveBulkStudents(e, _classId) {
    e.preventDefault(); const f = e.target;
    const names = f.names.value.split('\n').map(n => n.trim()).filter(n => n.length > 1);
    if (!names.length) { Toast.show('لا توجد أسماء للإضافة', 'error'); return; }
    const list = DB.get('students');
    const clsId = f.classId.value;
    names.forEach(name => {
      list.push({ id: DB.id(), name, classId: clsId });
    });
    DB.set('students', list);
    Modal.close();
    Toast.show(`تم إضافة ${names.length} ${_T.stu} بنجاح! ✓`);
    this.students({ classId: clsId });
  },

  addStudentModal(classId) {
    const classes = DB.get('classes');
    Modal.open(`إضافة ${_T.stu} | Add Student`,
      `<form onsubmit="Pages.saveStudent(event)">${this._studentForm({}, classes, classId)}</form>`);
  },

  editStudentModal(id) {
    const s = DB.get('students').find(x => x.id === id);
    if (!s) return;
    Modal.open(`تعديل بيانات ${_T.theStu}`,
      `<form onsubmit="Pages.updateStudent(event,'${id}')">${this._studentForm(s, DB.get('classes'))}</form>`);
  },

  saveStudent(e) {
    e.preventDefault(); const f = e.target;
    const list = DB.get('students');
    list.push({ id: DB.id(), name: f.name.value, classId: f.classId.value });
    DB.set('students', list);
    Modal.close(); Toast.show(`تم إضافة ${_T.theStu}!`); this.students({ classId: f.classId.value });
  },

  updateStudent(e, id) {
    e.preventDefault(); const f = e.target;
    const list = DB.get('students');
    const idx  = list.findIndex(s => s.id === id);
    if (idx < 0) return;
    list[idx] = { ...list[idx], name: f.name.value, classId: f.classId.value };
    DB.set('students', list);
    Modal.close(); Toast.show(`تم تحديث بيانات ${_T.theStu}!`); this.students({ classId: f.classId.value });
  },

  deleteStudent(id, classId) {
    if (!confirm(`حذف هذا ${_T.theStu}؟`)) return;
    DB.set('students', DB.get('students').filter(s => s.id !== id));
    Toast.show('تم الحذف', 'error'); this.students({ classId });
  },

  transferStudentModal(stuId, currentClassId) {
    const s = DB.get('students').find(x => x.id === stuId);
    if (!s) return;
    const classes = DB.get('classes').filter(c => c.id !== currentClassId);
    if (!classes.length) { Toast.show('لا يوجد فصول أخرى للنقل إليها', 'error'); return; }
    Modal.open(`نقل ${_T.theStu}: ${s.name}`, `
      <div class="form-group">
        <label><i class="fas fa-door-open"></i> اختر الفصل الجديد</label>
        <select id="transfer-class">
          ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem">
        <button class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
        <button class="btn btn-primary" onclick="Pages.transferStudent('${stuId}','${currentClassId}')">
          <i class="fas fa-exchange-alt"></i> نقل
        </button>
      </div>`);
  },

  transferStudent(stuId, fromClassId) {
    const toClassId = document.getElementById('transfer-class')?.value;
    if (!toClassId) return;
    const list = DB.get('students');
    DB.set('students', list.map(s => s.id === stuId ? { ...s, classId: toClassId } : s));
    const toName = DB.get('classes').find(c => c.id === toClassId)?.name || '';
    Modal.close();
    Toast.show(`تم نقل ${_T.theStu} إلى ${toName}`);
    if (Router.current === 'attendance')
      this.attendance({ classId: fromClassId, date: Pages._attDate });
    else
      this.students({ classId: fromClassId });
  },

  incBehavior(stuId, key, classId) {
    const list = DB.get('students');
    const updated = list.map(s => {
      if (s.id !== stuId) return s;
      const behs = { ...(s.behaviors || {}) };
      behs[key] = (behs[key] || 0) + 1;
      return { ...s, behaviors: behs };
    });
    DB.set('students', updated);
    const stu = updated.find(s => s.id === stuId);
    const el = document.getElementById(`beh-${stuId}-${key}`);
    if (el) el.textContent = stu?.behaviors?.[key] || 0;
    const bDef = BEH_TYPES.find(b => b.key === key);
    if (bDef?.warnAt && (stu?.behaviors?.[key] || 0) >= bDef.warnAt) {
      Toast.show(`⚠️ ${stu?.name}: وصل لـ ${stu.behaviors[key]} مرات "${bDef.label}" — يُنصح بالتحويل`, 'error');
      this.students({ classId });
    }
  },

  /* ---- ATTENDANCE ---- */
  attendance(params = {}) {
    this.students(params);
  },

  _attendance_legacy(params = {}) {
    const classes  = DB.get('classes');
    const students = DB.get('students');
    if (!classes.length) {
      document.getElementById('content').innerHTML = `
        <div class="empty-state"><div class="empty-icon"><i class="fas fa-clipboard-check"></i></div>
        <h3>لا توجد فصول دراسية</h3>
        <button class="btn btn-primary" onclick="Router.go('classes')">إضافة فصل</button></div>`;
      return;
    }
    const today   = new Date().toISOString().slice(0, 10);
    const selId   = params.classId || classes[0].id;
    const selDate = params.date || today;
    const cls     = classes.find(c => c.id === selId);
    const clsStu  = students.filter(s => s.classId === selId);
    const allAtt  = DB.get('attendance');
    const rec     = allAtt.find(a => a.classId === selId && a.date === selDate);
    const map     = {}; if (rec) rec.records.forEach(r => { map[r.studentId] = r.status; });
    clsStu.forEach(s => { if (!map[s.id]) map[s.id] = 'present'; });
    Pages._currentAtt  = { ...map };
    Pages._attStudents = clsStu;
    Pages._attClassId  = selId;
    Pages._attDate     = selDate;

    const tabs = classes.map(c =>
      `<button class="filter-btn ${c.id===selId?'active':''}" onclick="Pages.attendance({classId:'${c.id}',date:'${selDate}'})">
        <span>${c.name}</span>${c.subject ? `<small style="display:block;font-size:.72em;opacity:.75">${c.subject}</small>` : ''}
      </button>`
    ).join('');

    const attRows = clsStu.map((s, i) => {
      const st = map[s.id] || 'present';
      return `<div class="att-row ${st==='absent'?'is-absent':st==='late'?'is-late':''}" id="ar-${s.id}">
        <div class="att-num">${i+1}</div>
        <div class="att-info"><div class="student-avatar-sm">${s.name.charAt(0)}</div><div class="att-name">${s.name}</div></div>
        <div class="att-btns">
          <button class="att-btn p ${st==='present'?'active':''}" onclick="Pages.setAtt('${s.id}','present','${selId}','${selDate}')"><i class="fas fa-check"></i> حاضر</button>
          <button class="att-btn a ${st==='absent'?'active':''}" onclick="Pages.setAtt('${s.id}','absent','${selId}','${selDate}')"><i class="fas fa-times"></i> غائب</button>
          <button class="att-btn l ${st==='late'?'active':''}" onclick="Pages.setAtt('${s.id}','late','${selId}','${selDate}')"><i class="fas fa-clock"></i> متأخر</button>
          <button class="att-btn" style="background:var(--gray-100);color:var(--gray-500)" title="نقل لفصل آخر" onclick="Pages.transferStudentModal('${s.id}','${selId}')"><i class="fas fa-exchange-alt"></i></button>
        </div>
      </div>`;
    }).join('');

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2>الحضور والغياب | Attendance</h2>
        <input type="date" class="date-input" value="${selDate}" onchange="Pages.attendance({classId:'${selId}',date:this.value})">
      </div>
      <div class="filter-bar">${tabs}</div>
      ${clsStu.length ? `
      <div class="section-card">
        <div class="card-header">
          <h3><i class="fas fa-users"></i> ${cls?.name} — ${selDate}</h3>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <button class="btn btn-sm btn-outline" onclick="Pages.markAll('present')"><i class="fas fa-check-double"></i> حضور الكل</button>
            <button class="btn btn-sm btn-outline" onclick="Pages.markAll('absent')"><i class="fas fa-times"></i> غياب الكل</button>
            <button class="btn btn-sm btn-outline" onclick="Print.attendance('${selId}','${selDate}')"><i class="fas fa-print"></i> طباعة</button>
          </div>
        </div>
        <div id="att-summary" style="padding:.75rem 1.25rem;border-bottom:1px solid var(--gray-100)">
          ${this._attSummary(clsStu, map)}
        </div>
        <div class="attendance-list">${attRows}</div>
        <div class="card-footer" style="font-size:.8rem;color:var(--gray-400)">
          <i class="fas fa-cloud-check"></i> يُحفظ تلقائياً عند كل تغيير
        </div>
      </div>` : `
      <div class="empty-state"><h3>لا يوجد ${_T.theStus} في هذا الفصل</h3>
        <button class="btn btn-primary" onclick="Pages.addStudentModal('${selId}')">إضافة ${_T.theStus}</button></div>`}
    `;
  },

  _attSummary(students, map) {
    const p = students.filter(s => (map[s.id]||'present') === 'present').length;
    const a = students.filter(s => map[s.id] === 'absent').length;
    const l = students.filter(s => map[s.id] === 'late').length;
    return `<div class="att-summary">
      <div class="att-stat green"><i class="fas fa-check"></i> حاضر: ${p}</div>
      <div class="att-stat red"><i class="fas fa-times"></i> غائب: ${a}</div>
      <div class="att-stat orange"><i class="fas fa-clock"></i> متأخر: ${l}</div>
      <div class="att-stat gray"><i class="fas fa-users"></i> المجموع: ${students.length}</div>
    </div>`;
  },

  _applyAttRow(row, status) {
    if (!row) return;
    row.classList.remove('stu-row-absent', 'stu-row-late');
    if (status === 'absent') row.classList.add('stu-row-absent');
    else if (status === 'late') row.classList.add('stu-row-late');
    row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
    row.querySelector(`.att-btn.${{present:'p',absent:'a',late:'l'}[status]}`)?.classList.add('active');
  },

  setAtt(stuId, status) {
    if (!Pages._currentAtt) Pages._currentAtt = {};
    Pages._currentAtt[stuId] = status;
    this._applyAttRow(document.getElementById(`ar-${stuId}`), status);
    document.getElementById('att-summary')?.replaceWith(
      Object.assign(document.createElement('div'), { id: 'att-summary', innerHTML: this._attSummary(Pages._attStudents || [], Pages._currentAtt) })
    );
    this.saveAtt(Pages._attClassId, Pages._attDate, true);
  },

  markAll(status) {
    const students = Pages._attStudents || [];
    students.forEach(s => {
      Pages._currentAtt[s.id] = status;
      this._applyAttRow(document.getElementById(`ar-${s.id}`), status);
    });
    document.getElementById('att-summary')?.replaceWith(
      Object.assign(document.createElement('div'), { id: 'att-summary', innerHTML: this._attSummary(students, Pages._currentAtt) })
    );
    this.saveAtt(Pages._attClassId, Pages._attDate, true);
  },

  saveAtt(clsId, date, silent = false) {
    if (!Pages._currentAtt || !clsId || !date) return;
    const list = DB.get('attendance');
    const idx  = list.findIndex(a => a.classId === clsId && a.date === date);
    const rec  = { classId: clsId, date, records: Object.entries(Pages._currentAtt).map(([studentId, status]) => ({ studentId, status })) };
    if (idx >= 0) list[idx] = rec; else list.push(rec);
    DB.set('attendance', list);
    if (!silent) Toast.show('تم حفظ الحضور بنجاح! ✓');
  },

  /* ---- GRADES ---- */
  grades(params = {}) {
    const classes  = DB.get('classes');
    const students = DB.get('students');
    if (!classes.length) {
      document.getElementById('content').innerHTML = `
        <div class="empty-state"><div class="empty-icon"><i class="fas fa-star-half-alt"></i></div>
        <h3>لا توجد فصول دراسية</h3>
        <button class="btn btn-primary" onclick="Router.go('classes')">إضافة فصل</button></div>`;
      return;
    }
    const selId  = params.classId || classes[0].id;
    const cls    = classes.find(c => c.id === selId);
    const schema = _schema(cls);
    const total  = schema.reduce((s, c) => s + c.max, 0);
    const clsStu = students.filter(s => s.classId === selId);
    const gData  = DB.get('grades');
    const tabs   = classes.map(c =>
      `<button class="filter-btn ${c.id===selId?'active':''}" onclick="Pages.grades({classId:'${c.id}'})">
        <span>${c.name}</span>${c.subject ? `<small style="display:block;font-size:.72em;opacity:.75">${c.subject}</small>` : ''}
      </button>`
    ).join('');

    const mkLetter = (tot, hasSome) => hasSome ? _letter(Math.round(tot / total * 100)) : '—';
    const rows = clsStu.map((s, i) => {
      const g   = gData.find(x => x.studentId === s.id && x.classId === selId);
      const v   = g?.grades || {};
      const tot = _sumBySchema(v, schema);
      const hasSome = schema.some(c => v[c.key] != null);
      const letter  = mkLetter(tot, hasSome);
      const cells = schema.map(c => `
        <td style="padding:4px 6px">
          <input type="number" min="0" max="${c.max}" step=".5"
            value="${v[c.key] ?? ''}" placeholder="—"
            data-sid="${s.id}" data-skey="${c.key}"
            style="width:${Math.max(44, String(c.max).length*10+28)}px;text-align:center;
                   border:1.5px solid transparent;border-radius:6px;padding:4px;
                   font-family:inherit;font-size:.88rem;background:transparent;
                   transition:border .15s"
            onfocus="this.style.borderColor='var(--primary)';this.style.background='#fff'"
            onblur="this.style.borderColor='transparent';this.style.background='transparent';
                    Pages.saveGradeCell('${s.id}','${selId}','${c.key}',this.value,'${total}','${c.max}')"
            onkeydown="if(event.key==='Enter'){this.blur();event.preventDefault()}">
        </td>`).join('');
      return `<tr>
        <td>${i+1}</td>
        <td><div class="student-name-cell"><div class="student-avatar-sm">${s.name.charAt(0)}</div>${s.name}</div></td>
        ${cells}
        <td class="grade-cell total-grade" id="tot-${s.id}">${hasSome ? tot : '—'}</td>
        <td id="let-${s.id}"><span class="grade-badge grade-${_letterCss[letter]||'-'}">${letter}</span></td>
      </tr>`;
    }).join('');

    const schemaHeads = schema.map(c =>
      `<th style="min-width:60px;white-space:nowrap">${c.label}<br><small>/${c.max}</small>
        <button onclick="Pages.bulkSkillModal('${selId}','${c.key}','${c.label}',${c.max})"
          title="إدخال جماعي لـ ${c.label}"
          style="display:block;margin:.2rem auto 0;background:var(--primary)18;border:1px solid var(--primary)40;
                 color:var(--primary);border-radius:5px;padding:1px 6px;font-size:.68rem;cursor:pointer;width:100%">
          <i class="fas fa-users"></i> للكل
        </button>
      </th>`).join('');

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2>الدرجات | Grades</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" onclick="Pages.editSchemaModal('${selId}')"><i class="fas fa-sliders"></i> مخطط الدرجات</button>
          <button class="btn btn-sm btn-outline" onclick="Print.grades('${selId}')"><i class="fas fa-print"></i> طباعة</button>
        </div>
      </div>
      <div class="filter-bar">${tabs}</div>
      ${clsStu.length ? `
      <div class="section-card">
        <div class="card-header">
          <h3><i class="fas fa-star-half-alt"></i> ${cls?.name} — ${cls?.subject}</h3>
          <span style="font-size:.78rem;color:var(--gray-400)"><i class="fas fa-circle-info"></i> اضغط على أي خانة لتعديلها مباشرةً</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead><tr>
              <th>#</th><th>${_T.theStu}</th>
              ${schemaHeads}
              <th>المجموع<br><small>/${total}</small></th>
              <th>التقدير</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${(() => {
          const tots = clsStu.map(s => {
            const g = gData.find(x=>x.studentId===s.id&&x.classId===selId)?.grades||{};
            return _sumBySchema(g, schema);
          }).filter(t=>t>0);
          if (!tots.length) return '';
          const avg = Math.round(tots.reduce((a,x)=>a+x,0)/tots.length);
          const pass = tots.filter(t => Math.round(t/total*100) >= 50).length;
          return `<div class="grade-stats-bar">
            <div class="grade-stat-item"><span class="gs-label">المعدل:</span> <span style="color:var(--primary)">${avg}</span></div>
            <div class="grade-stat-item"><span class="gs-label">الأعلى:</span> <span style="color:var(--green)">${Math.max(...tots)}</span></div>
            <div class="grade-stat-item"><span class="gs-label">الأدنى:</span> <span style="color:var(--red)">${Math.min(...tots)}</span></div>
            <div class="grade-stat-item"><span class="gs-label">ناجح:</span> <span style="color:var(--green)">${pass}</span></div>
            <div class="grade-stat-item"><span class="gs-label">راسب:</span> <span style="color:var(--red)">${tots.length-pass}</span></div>
          </div>`;
        })()}
      </div>` : `<div class="empty-state"><h3>لا يوجد ${_T.theStus} في هذا الفصل</h3></div>`}
    `;
  },

  editSchemaModal(clsId) {
    const cls = DB.get('classes').find(c => c.id === clsId);
    if (!cls) return;
    const schema = _schema(cls);
    Modal.open(`مخطط الدرجات: ${cls.name}`, `
      <div style="font-size:.8rem;color:var(--gray-400);margin-bottom:.75rem">
        <i class="fas fa-info-circle"></i> يمكنك تعديل أسماء المهارات ودرجاتها أو إضافة مهارات جديدة مثل "عملي" أو "مشروع"
      </div>
      <div style="display:grid;grid-template-columns:1fr 80px 36px;gap:.4rem;align-items:center;margin-bottom:.3rem;font-size:.78rem;color:var(--gray-400);font-weight:600;padding:0 4px">
        <span>اسم المهارة</span><span style="text-align:center">الدرجة العظمى</span><span></span>
      </div>
      <div id="schema-rows">
        ${schema.map(c => Pages._schemaRow(c)).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:.75rem">
        <button type="button" class="btn btn-outline btn-sm" onclick="Pages._addSchemaRow()">
          <i class="fas fa-plus"></i> إضافة مهارة
        </button>
        <div id="schema-total-display"></div>
      </div>
      <div class="form-actions" style="margin-top:.75rem">
        <button type="button" class="btn btn-primary" onclick="Pages._saveSchema('${clsId}')">
          <i class="fas fa-save"></i> حفظ المخطط
        </button>
        <button type="button" class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
      </div>`);
    this._updateSchemaTotal();
    this._initSchemaDrag();
  },

  _schemaRow(comp) {
    return `<div class="schema-row" draggable="true"
      style="display:grid;grid-template-columns:18px 1fr 80px 36px;gap:.4rem;align-items:center;margin-bottom:.4rem;border-radius:8px;transition:background .1s">
      <span class="drag-handle" title="اسحب لإعادة الترتيب"
        style="cursor:grab;color:var(--gray-300);font-size:.88rem;text-align:center;touch-action:none;padding:2px 0;user-select:none">
        <i class="fas fa-grip-vertical"></i>
      </span>
      <input type="hidden" class="s-key" value="${comp.key}">
      <input type="text" class="s-label" placeholder="اسم المهارة" value="${comp.label}"
        style="padding:.45rem .6rem;border:1px solid var(--gray-200);border-radius:6px;font-family:inherit;font-size:.9rem;width:100%"
        oninput="Pages._updateSchemaTotal()">
      <input type="number" class="s-max" min="1" max="200" value="${comp.max}"
        style="padding:.45rem;border:1px solid var(--gray-200);border-radius:6px;text-align:center;font-family:inherit;width:100%"
        oninput="Pages._updateSchemaTotal()">
      <button type="button" onclick="this.closest('.schema-row').remove();Pages._updateSchemaTotal()"
        style="background:none;border:none;color:#dc2626;cursor:pointer;padding:4px;font-size:1rem;line-height:1">
        <i class="fas fa-trash"></i>
      </button>
    </div>`;
  },

  _addSchemaRow() {
    const container = document.getElementById('schema-rows');
    if (!container) return;
    container.insertAdjacentHTML('beforeend', Pages._schemaRow({ key: 'comp_' + DB.id(), label: '', max: 10 }));
    Pages._updateSchemaTotal();
  },

  _initSchemaDrag() {
    const container = document.getElementById('schema-rows');
    if (!container) return;
    let dragging = null;

    container.addEventListener('dragstart', e => {
      dragging = e.target.closest('.schema-row');
      if (!dragging) { e.preventDefault(); return; }
      dragging.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    container.addEventListener('dragend', () => {
      if (dragging) dragging.style.opacity = '';
      dragging = null;
    });
    container.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragging) return;
      const target = e.target.closest('.schema-row');
      if (!target || target === dragging) return;
      const mid = target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
      container.insertBefore(dragging, e.clientY < mid ? target : target.nextSibling);
    });

    // Touch drag
    let tDrag = null, tClone = null, tOffY = 0;
    container.addEventListener('touchstart', e => {
      if (!e.target.closest('.drag-handle')) return;
      tDrag = e.target.closest('.schema-row');
      const touch = e.touches[0];
      const rect = tDrag.getBoundingClientRect();
      tOffY = touch.clientY - rect.top;
      tClone = tDrag.cloneNode(true);
      Object.assign(tClone.style, {
        position:'fixed', zIndex:'9999', opacity:'.85', pointerEvents:'none',
        width: rect.width+'px', left: rect.left+'px', top: (touch.clientY - tOffY)+'px',
        boxShadow:'0 6px 20px #0002', borderRadius:'8px', background:'#fff'
      });
      document.body.appendChild(tClone);
      tDrag.style.opacity = '0.3';
      e.preventDefault();
    }, { passive: false });
    container.addEventListener('touchmove', e => {
      if (!tDrag || !tClone) return;
      const touch = e.touches[0];
      tClone.style.top = (touch.clientY - tOffY) + 'px';
      for (const row of [...container.querySelectorAll('.schema-row')].filter(r => r !== tDrag)) {
        const rect = row.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          container.insertBefore(tDrag, touch.clientY < rect.top + rect.height / 2 ? row : row.nextSibling);
          break;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const endTouch = () => {
      tClone?.remove(); tClone = null;
      if (tDrag) { tDrag.style.opacity = ''; tDrag = null; }
    };
    container.addEventListener('touchend', endTouch);
    container.addEventListener('touchcancel', endTouch);
  },

  _updateSchemaTotal() {
    const rows  = document.querySelectorAll('#schema-rows .schema-row');
    let total = 0;
    rows.forEach(r => { total += Number(r.querySelector('.s-max')?.value || 0); });
    const el = document.getElementById('schema-total-display');
    if (!el) return;
    const color = total === 100 ? '#16a34a' : total > 100 ? '#dc2626' : '#d97706';
    el.innerHTML = `<span style="color:${color};font-weight:700;font-size:.88rem">
      المجموع: ${total} ${total===100?'✓ مثالي':total>100?'⚠ تجاوز 100':'من 100'}
    </span>`;
  },

  _saveSchema(clsId) {
    const rows = document.querySelectorAll('#schema-rows .schema-row');
    const schema = [];
    rows.forEach(r => {
      const key   = r.querySelector('.s-key')?.value;
      const label = r.querySelector('.s-label')?.value.trim();
      const max   = Number(r.querySelector('.s-max')?.value);
      if (label && max > 0) schema.push({ key, label, max });
    });
    if (!schema.length) { Toast.show('أضف مهارة واحدة على الأقل', 'error'); return; }
    const total = schema.reduce((s, c) => s + c.max, 0);
    if (total > 100) { Toast.show(`المجموع ${total} يتجاوز 100 — عدّل الدرجات`, 'error'); return; }
    DB.set('classes', DB.get('classes').map(c => c.id === clsId ? { ...c, gradeSchema: schema } : c));
    Modal.close(); Toast.show('تم حفظ مخطط الدرجات!'); this.grades({ classId: clsId });
  },

  saveGradeCell(stuId, clsId, key, value, totalMax, skillMax) {
    if (value !== '') {
      const num = Number(value);
      if (num < 0 || num > Number(skillMax)) {
        Toast.show(`الدرجة يجب أن تكون بين 0 و ${skillMax}`, 'error');
        const inp = document.querySelector(`input[data-sid="${stuId}"][data-skey="${key}"]`);
        if (inp) {
          const prev = DB.get('grades').find(x => x.studentId === stuId && x.classId === clsId);
          inp.value = prev?.grades?.[key] ?? '';
        }
        return;
      }
    }
    const list   = DB.get('grades');
    const idx    = list.findIndex(g => g.studentId === stuId && g.classId === clsId);
    const grades = idx >= 0 ? { ...list[idx].grades } : {};
    grades[key]  = value !== '' ? Number(value) : undefined;
    const rec    = { studentId: stuId, classId: clsId, grades };
    if (idx >= 0) list[idx] = rec; else list.push(rec);
    DB.set('grades', list);
    const cls     = DB.get('classes').find(c => c.id === clsId);
    const schema  = _schema(cls);
    const tot     = _sumBySchema(grades, schema);
    const hasSome = schema.some(c => grades[c.key] != null);
    const letter  = hasSome ? _letter(Math.round(tot / Number(totalMax) * 100)) : '—';
    const totEl = document.getElementById(`tot-${stuId}`);
    const letEl = document.getElementById(`let-${stuId}`);
    if (totEl) totEl.textContent = hasSome ? tot : '—';
    if (letEl) letEl.innerHTML = `<span class="grade-badge grade-${_letterCss[letter]||'-'}">${letter}</span>`;
  },

  bulkSkillModal(clsId, key, label, max) {
    Modal.open(`إدخال جماعي: ${label}`, `
      <p style="color:var(--gray-400);font-size:.85rem;margin-bottom:1rem">
        سيتم تطبيق الدرجة على جميع ${_T.theStus} في الفصل (من 0 إلى ${max})
      </p>
      <div class="form-group">
        <label>الدرجة</label>
        <input type="number" id="bulk-val" class="form-input" min="0" max="${max}" step=".5" placeholder="0 – ${max}">
      </div>
      <button class="btn btn-primary btn-full" onclick="Pages._applyBulkSkill('${clsId}','${key}',${max})">
        <i class="fas fa-check"></i> تطبيق على الجميع
      </button>`);
  },
  _applyBulkSkill(clsId, key, max) {
    const raw = document.getElementById('bulk-val').value;
    if (raw === '') { Toast.show('أدخل درجة أولاً', 'error'); return; }
    const num = Number(raw);
    if (num < 0 || num > max) { Toast.show(`الدرجة يجب أن تكون بين 0 و ${max}`, 'error'); return; }
    const students = DB.get('students').filter(s => s.classId === clsId);
    const list = DB.get('grades');
    students.forEach(s => {
      const idx = list.findIndex(g => g.studentId === s.id && g.classId === clsId);
      if (idx >= 0) list[idx] = { ...list[idx], grades: { ...list[idx].grades, [key]: num } };
      else list.push({ studentId: s.id, classId: clsId, grades: { [key]: num } });
    });
    DB.set('grades', list);
    Modal.close();
    Toast.show(`تم تطبيق ${num} على ${students.length} ${_T.stu}`);
    this.grades({ classId: clsId });
  },

  /* ---- LESSONS ---- */
  /* ---- TIMETABLE ---- */
  _days: [
    { key: 'sun', label: 'الأحد' },
    { key: 'mon', label: 'الاثنين' },
    { key: 'tue', label: 'الثلاثاء' },
    { key: 'wed', label: 'الأربعاء' },
    { key: 'thu', label: 'الخميس' }
  ],
  _periods: 8,

  lessons() {
    const classes  = DB.get('classes');
    const schedule = DB.get('schedule');
    const settings = DB.settings();
    const colors   = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899','#84CC16'];

    const clsColor = {};
    classes.forEach((c, i) => { clsColor[c.id] = c.color || colors[i % colors.length]; });

    const periods = Array.from({ length: settings.periodCount || this._periods }, (_, i) => i + 1);

    const headerCells = this._days.map(d =>
      `<th class="tt-day-hdr"><span class="tt-day-ar">${d.label}</span></th>`
    ).join('');

    const bodyRows = periods.map(p => {
      const t = settings.periods.find(x => x.p === p);
      const dayCells = this._days.map(d => {
        const entry = schedule.find(s => s.day === d.key && s.period === p);
        const cls   = entry ? classes.find(c => c.id === entry.classId) : null;
        const color = cls ? clsColor[cls.id] : null;
        return entry && cls
          ? `<td class="tt-cell tt-filled" onclick="Pages.editScheduleModal('${entry.id}')"
               style="--cell-color:${color}">
               <div class="tt-chip" style="background:${color}20;border-color:${color}40;color:${color}">${cls.name}</div>
               <div class="tt-subject">${entry.subject}</div>
               ${entry.notes ? `<div class="tt-notes"><i class="fas fa-tag"></i> ${entry.notes}</div>` : ''}
             </td>`
          : `<td class="tt-cell tt-empty" onclick="Pages.addScheduleModal('${d.key}',${p})">
               <div class="tt-add-icon"><i class="fas fa-plus-circle"></i></div>
             </td>`;
      }).join('');
      return `<tr>
        <td class="tt-period-hdr" ondblclick="Pages.editPeriodsModal()">
          <div class="tt-period-num">${p}</div>
          ${t ? `<div class="tt-period-time">${t.s}<br>${t.e}</div>` : '<div class="tt-period-time">—</div>'}
        </td>
        ${dayCells}
      </tr>`;
    }).join('');

    const legend = classes.map(c =>
      `<div class="tt-legend-item" onclick="Pages.changeClassColor('${c.id}')" title="غيّر لون الفصل">
        <div class="tt-legend-dot" style="background:${clsColor[c.id]};box-shadow:0 0 0 3px ${clsColor[c.id]}30"></div>
        <div style="display:flex;flex-direction:column;gap:.1rem">
          <span>${c.name}</span>
          ${c.subject ? `<small style="font-size:.72em;opacity:.7">${c.subject}</small>` : ''}
        </div>
        <i class="fas fa-pen" style="font-size:.58rem;color:var(--gray-400)"></i>
      </div>`
    ).join('');

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2>جدول الحصص</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" onclick="Pages.editPeriodsModal()"><i class="fas fa-clock"></i> تعديل الأوقات</button>
          <button class="btn btn-sm btn-outline" onclick="Print.timetable()"><i class="fas fa-print"></i> طباعة</button>
          <button class="btn btn-sm btn-outline-danger" onclick="Pages.clearSchedule()"><i class="fas fa-trash"></i> مسح</button>
        </div>
      </div>
      ${classes.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-calendar-alt"></i></div>
          <h3>أضف فصولاً دراسية أولاً</h3>
          <button class="btn btn-primary" onclick="Router.go('classes')">إضافة فصل</button>
        </div>` : `
        <div class="tt-legend-bar">${legend}</div>
        <div class="tt-card">
          <div class="tt-scroll">
            <table class="tt-table">
              <thead><tr><th class="tt-corner"><i class="fas fa-clock" style="opacity:.4"></i></th>${headerCells}</tr></thead>
              <tbody>${bodyRows}</tbody>
            </table>
          </div>
        </div>
        <p class="tt-hint"><i class="fas fa-info-circle"></i> اضغط خلية فارغة لإضافة — خلية ممتلئة لتعديل — انقر مرتين على وقت الحصة لتعديل الأوقات</p>`}
    `;
  },

  editPeriodsModal() {
    const s = DB.settings();
    const count = s.periodCount || this._periods;
    const countOpts = Array.from({length: 10}, (_,i) => i+1)
      .map(n => `<option value="${n}" ${n===count?'selected':''}>${n} حصص</option>`).join('');
    const rows = s.periods.map(p => `
      <div class="tt-period-edit-row" data-prow="${p.p}" style="${p.p > count ? 'opacity:.35' : ''}">
        <span class="tt-period-badge" style="${p.p > count ? 'background:var(--gray-400)' : ''}">${p.p}</span>
        <input type="time" value="${p.s}" data-p="${p.p}" data-f="s" class="form-input period-time-inp" style="font-size:.85rem;padding:.35rem .5rem">
        <span style="color:var(--gray-400);font-size:.8rem;text-align:center">←</span>
        <input type="time" value="${p.e}" data-p="${p.p}" data-f="e" class="form-input period-time-inp" style="font-size:.85rem;padding:.35rem .5rem">
      </div>`).join('');
    Modal.open('إعدادات الحصص', `
      <div style="background:var(--primary-light);border-radius:10px;padding:.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:.75rem">
        <i class="fas fa-layer-group" style="color:var(--primary);font-size:1.1rem"></i>
        <div style="flex:1">
          <div style="font-size:.8rem;color:var(--gray-500);margin-bottom:.25rem">عدد الحصص في اليوم</div>
          <select id="period-count" class="form-input" style="padding:.3rem .6rem;font-size:.9rem;font-weight:700"
            onchange="Pages._previewPeriodCount(this.value)">
            ${countOpts}
          </select>
        </div>
      </div>
      <div class="tt-period-edit-hdr"><span>رقم</span><span>البداية</span><span></span><span>النهاية</span></div>
      <div style="max-height:55vh;overflow-y:auto;padding-left:2px" id="period-rows">${rows}</div>
      <div class="form-actions" style="margin-top:.75rem">
        <button class="btn btn-primary" onclick="Pages._savePeriods()"><i class="fas fa-save"></i> حفظ</button>
        <button class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
      </div>`);
  },

  _previewPeriodCount(val) {
    const n = Number(val);
    document.querySelectorAll('[data-prow]').forEach(row => {
      const p = Number(row.dataset.prow);
      row.style.opacity = p > n ? '.35' : '1';
      row.querySelector('.tt-period-badge').style.background = p > n ? 'var(--gray-400)' : '';
    });
  },

  _savePeriods() {
    const s = DB.settings();
    s.periodCount = Number(document.getElementById('period-count')?.value) || this._periods;
    document.querySelectorAll('.period-time-inp').forEach(inp => {
      const period = s.periods.find(x => x.p === Number(inp.dataset.p));
      if (period) period[inp.dataset.f] = inp.value;
    });
    DB.saveSettings(s);
    Modal.close(); Toast.show('تم حفظ الإعدادات!'); this.lessons();
  },

  changeClassColor(classId) {
    const cls = DB.get('classes').find(c => c.id === classId);
    if (!cls) return;
    const palette = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#EC4899','#84CC16','#F97316','#6366F1'];
    Modal.open(`لون الفصل: ${cls.name}`, `
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center;padding:.5rem 0" id="cls-color-picker" data-selected="${cls.color||palette[0]}">
        ${palette.map(c => `
          <div onclick="Pages._pickClsColor('${c}',this)" data-color="${c}"
            style="width:36px;height:36px;border-radius:50%;background:${c};cursor:pointer;border:${(cls.color||palette[0])===c?'3px solid #111':'3px solid transparent'};transition:all .15s"></div>`
        ).join('')}
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.75rem">
        <button class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
        <button class="btn btn-primary" onclick="Pages._saveClsColor('${classId}')"><i class="fas fa-save"></i> حفظ</button>
      </div>`);
  },

  _pickClsColor(color, el) {
    document.querySelectorAll('#cls-color-picker div').forEach(d => d.style.border = '3px solid transparent');
    if (el) el.style.border = '3px solid #111';
    const picker = document.getElementById('cls-color-picker');
    if (picker) picker.dataset.selected = color;
  },

  _saveClsColor(classId) {
    const color = document.getElementById('cls-color-picker')?.dataset.selected;
    if (!color) { Modal.close(); return; }
    DB.set('classes', DB.get('classes').map(c => c.id === classId ? { ...c, color } : c));
    Modal.close(); Toast.show('تم تغيير اللون!'); this.lessons();
  },

  addScheduleModal(day, period) {
    const classes = DB.get('classes');
    const dayLabel = this._days.find(d => d.key === day)?.label || day;
    const t = DB.settings().periods.find(x => x.p === period);
    Modal.open(`إضافة حصة — ${dayLabel} / الحصة ${period}`, `
      <form onsubmit="Pages.saveSchedule(event,'','${day}',${period})">
        <div class="form-group"><label>الفصل الدراسي *</label>
          <select name="classId" required onchange="Pages._fillSubject(this)">
            <option value="">اختر الفصل</option>
            ${classes.map(c => `<option value="${c.id}" data-subject="${c.subject}">${c.name} — ${c.subject}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>المادة *</label>
          <input type="text" name="subject" id="sch-subject" placeholder="تُملأ تلقائياً" required></div>
        <div class="form-row">
          <div class="form-group"><label>وقت البداية</label>
            <input type="time" name="startTime" value="${t?.s||''}"></div>
          <div class="form-group"><label>وقت النهاية</label>
            <input type="time" name="endTime" value="${t?.e||''}"></div>
        </div>
        <div class="form-group"><label>ملاحظة (اختياري)</label>
          <input type="text" name="notes" placeholder="مثال: مختبر، فناء..."></div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> إضافة</button>
          <button type="button" class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
        </div>
      </form>`);
  },

  _fillSubject(sel) {
    const opt = sel.options[sel.selectedIndex];
    const subj = document.getElementById('sch-subject');
    if (subj && opt.dataset.subject) subj.value = opt.dataset.subject;
  },

  editScheduleModal(id) {
    const s = DB.get('schedule').find(x => x.id === id);
    if (!s) return;
    const classes = DB.get('classes');
    const dayLabel = this._days.find(d => d.key === s.day)?.label || s.day;
    Modal.open(`تعديل حصة — ${dayLabel} / الحصة ${s.period}`, `
      <form onsubmit="Pages.saveSchedule(event,'${id}','${s.day}',${s.period})">
        <div class="form-group"><label>الفصل الدراسي *</label>
          <select name="classId" required onchange="Pages._fillSubject(this)">
            <option value="">اختر الفصل</option>
            ${classes.map(c => `<option value="${c.id}" data-subject="${c.subject}" ${c.id===s.classId?'selected':''}>${c.name} — ${c.subject}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>المادة *</label>
          <input type="text" name="subject" id="sch-subject" value="${s.subject}" required></div>
        <div class="form-group"><label>ملاحظة</label>
          <input type="text" name="notes" value="${s.notes||''}"></div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
          <button class="btn btn-danger" type="button" onclick="Pages.deleteSchedule('${id}')"><i class="fas fa-trash"></i> حذف</button>
          <button type="button" class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
        </div>
      </form>`);
  },

  saveSchedule(e, existId, day, period) {
    e.preventDefault(); const f = e.target;
    const list = DB.get('schedule');
    const rec  = { id: existId || DB.id(), day, period: Number(period),
      classId: f.classId.value, subject: f.subject.value, notes: f.notes.value,
      startTime: f.startTime?.value || '', endTime: f.endTime?.value || '' };
    if (existId) { const i = list.findIndex(s => s.id === existId); if (i >= 0) list[i] = rec; }
    else list.push(rec);
    DB.set('schedule', list); Modal.close(); Toast.show('تم الحفظ!'); this.lessons();
  },

  deleteSchedule(id) {
    DB.set('schedule', DB.get('schedule').filter(s => s.id !== id));
    Modal.close(); Toast.show('تم الحذف', 'error'); this.lessons();
  },

  clearSchedule() {
    if (!confirm('مسح جدول الحصص كاملاً؟')) return;
    DB.set('schedule', []); Toast.show('تم مسح الجدول', 'error'); this.lessons();
  },

  /* ---- REFERRALS ---- */
  referrals() {
    const students = DB.get('students');
    const classes  = DB.get('classes');
    const referred = students.filter(s => s.referralCount > 0)
                             .sort((a,b) => (b.referralCount||0) - (a.referralCount||0));
    const warned   = students.filter(s => _behWarn(s).length > 0)
                             .sort((a,b) => _behWarn(b).length - _behWarn(a).length);
    const cls = id => classes.find(c => c.id === id)?.name || '—';
    const cntBadge = n => {
      const color = n >= 5 ? '#dc2626' : n >= 3 ? '#d97706' : '#0d9488';
      return `<span style="background:${color};color:#fff;border-radius:20px;padding:2px 10px;font-size:.78rem;font-weight:700">${n}</span>`;
    };

    const warnRows = warned.map(s => {
      const triggers = _behWarn(s).map(b =>
        `<span style="background:${b.color}15;color:${b.color};border:1px solid ${b.color}40;border-radius:6px;padding:1px 8px;font-size:.75rem;font-weight:700">
          ${_bIcon(b)} ${b.label}: ${s.behaviors[b.key]}
        </span>`).join(' ');
      return `<tr>
        <td><strong>${s.name}</strong></td>
        <td>${cls(s.classId)}</td>
        <td style="line-height:2">${triggers}</td>
        <td>
          <button class="btn btn-sm" style="background:#dc2626;color:#fff" onclick="Pages.referralModal('${s.id}')">
            <i class="fas fa-file-medical-alt"></i> تحويل
          </button>
        </td>
      </tr>`;
    }).join('');

    const reasonLabel = r => ({
      'ضعف تحصيل دراسي':'📚 ضعف تحصيل','كثرة الغياب':'🚫 غياب','سلوك سلبي متكرر':'😤 سلوك',
      'مشكلة صحية':'🏥 صحية','مشكلة اجتماعية أو أسرية':'👨‍👩‍👧 أسرية','تأخر مستمر':'⏰ تأخر','أخرى (تُحدد في الملاحظات)':'📝 أخرى'
    })[r] || r;
    const refRows = referred.length ? referred.map(s => {
      const hist = (s.referralHistory || []).slice().reverse();
      const uid = 'rh_' + s.id;
      const histItems = hist.map(h => `
        <div style="border-right:3px solid #0d9488;padding:6px 10px;margin-bottom:6px;background:#f9fafb;border-radius:0 6px 6px 0;font-size:.82rem">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
            <span style="color:#6b7280"><i class="fas fa-calendar-alt"></i> ${h.date||'—'}</span>
            <span style="font-weight:700;color:#065f46">${reasonLabel(h.reason||'—')}</span>
            <span style="color:#0d9488"><i class="fas fa-arrow-left"></i> ${h.refTo||'—'}</span>
            ${h.notes ? `<span style="color:#6b7280;font-style:italic">${h.notes}</span>` : ''}
          </div>
        </div>`).join('');
      return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${cls(s.classId)}</td>
        <td style="text-align:center">${cntBadge(s.referralCount)}</td>
        <td style="text-align:center">
          ${hist.length ? `<button class="btn btn-sm btn-outline" style="font-size:.78rem" onclick="
            const el=document.getElementById('${uid}');
            const ic=this.querySelector('i');
            if(el.style.display==='none'||!el.style.display){el.style.display='block';ic.className='fas fa-chevron-up'}
            else{el.style.display='none';ic.className='fas fa-chevron-down'}
          "><i class="fas fa-chevron-down"></i> السجل (${hist.length})</button>` : '<span style="color:#9ca3af;font-size:.78rem">—</span>'}
        </td>
        <td><button class="btn btn-sm btn-outline" onclick="Pages.referralModal('${s.id}')"><i class="fas fa-plus"></i> إحالة جديدة</button></td>
      </tr>
      ${hist.length ? `<tr id="${uid}" style="display:none"><td colspan="5" style="padding:4px 12px 10px">
        ${histItems}
      </td></tr>` : ''}`;
    }).join('') :
      `<tr><td colspan="4" style="text-align:center;color:var(--gray-400);padding:32px">لا توجد إحالات مسجّلة بعد</td></tr>`;

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-file-medical-alt"></i> سجل الإحالات</h2>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <span style="font-size:.85rem;color:var(--gray-400)">إجمالي ${_T.theStus} المُحالين: ${referred.length}</span>
          <button class="btn btn-sm btn-primary" onclick="Pages._pickStudentForReferral()">
            <i class="fas fa-plus"></i> إحالة ${_T.stu} جديدة
          </button>
        </div>
      </div>
      ${warned.length ? `
      <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;padding:1rem;margin-bottom:1.25rem">
        <div style="font-weight:700;color:#dc2626;margin-bottom:.75rem;font-size:1rem">
          <i class="fas fa-triangle-exclamation"></i> ${_T.theStus} يحتاجون تحويل — تجاوزوا حد التحذير السلوكي
        </div>
        <table class="data-table" style="background:#fff;border-radius:8px;overflow:hidden">
          <thead><tr><th>${_T.theStu}</th><th>الفصل</th><th>السبب</th><th></th></tr></thead>
          <tbody>${warnRows}</tbody>
        </table>
      </div>` : ''}
      <div class="card" style="overflow:hidden">
        <div style="font-weight:700;padding:.75rem 1rem .25rem;color:var(--gray-600)">
          <i class="fas fa-history"></i> سجل الإحالات السابقة
        </div>
        <table class="data-table">
          <thead><tr>
            <th>اسم ${_T.theStu}</th><th>الفصل</th><th style="text-align:center">عدد الإحالات</th><th style="text-align:center">السجل</th><th></th>
          </tr></thead>
          <tbody>${refRows}</tbody>
        </table>
      </div>`;
  },

  _pickStudentForReferral() {
    const students = DB.get('students').sort((a,b) => a.name.localeCompare(b.name,'ar'));
    const classes  = DB.get('classes');
    const cls = id => classes.find(c => c.id === id)?.name || '—';
    const rows = students.map(s => `
      <tr style="cursor:pointer" onclick="Modal.close();Pages.referralModal('${s.id}')">
        <td><strong>${s.name}</strong></td>
        <td>${cls(s.classId)}</td>
        <td style="text-align:center;color:var(--gray-400);font-size:.8rem">${s.referralCount||0} إحالة</td>
      </tr>`).join('');
    Modal.open(`اختر ${_T.stu}اً للإحالة`, `
      <div style="margin-bottom:.75rem">
        <input type="text" class="form-control" placeholder="بحث باسم ${_T.theStu}..." oninput="
          const q=this.value.trim().toLowerCase();
          this.closest('.modal-body').querySelectorAll('tbody tr').forEach(r=>{
            r.style.display=r.cells[0].textContent.toLowerCase().includes(q)?'':'none';
          })">
      </div>
      <div style="max-height:340px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>الاسم</th><th>الفصل</th><th style="text-align:center">الإحالات</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`);
  },

  _clearAllReferrals() {
    Modal.open('مسح جميع الإحالات', `
      <p style="margin-bottom:1rem;color:var(--gray-600)">هل أنت متأكد من مسح جميع الإحالات؟ لا يمكن التراجع عن هذا الإجراء.</p>
      <label style="display:flex;align-items:center;gap:.5rem;margin-bottom:1.25rem;cursor:pointer;font-size:.95rem">
        <input type="checkbox" id="clear-beh-also" style="width:1.1rem;height:1.1rem;accent-color:#dc2626">
        مسح السجل السلوكي أيضاً (إعادة تصفير جميع الأجراءات السلوكية)
      </label>
      <div style="display:flex;gap:.75rem;justify-content:flex-end">
        <button class="btn btn-sm btn-outline" onclick="Modal.close()">إلغاء</button>
        <button class="btn btn-sm" style="background:#dc2626;color:#fff" onclick="Pages._confirmClearReferrals()">
          <i class="fas fa-trash-alt"></i> تأكيد المسح
        </button>
      </div>`);
  },

  _confirmClearReferrals() {
    const clearBeh = document.getElementById('clear-beh-also')?.checked || false;
    const updated = DB.get('students').map(s => {
      const upd = Object.assign({}, s, { referralCount: 0 });
      if (clearBeh) upd.behaviors = {};
      return upd;
    });
    DB.set('students', updated);
    Modal.close();
    App.go(App.current || 'referrals');
    Toast.show('تم مسح جميع الإحالات' + (clearBeh ? ' والسجل السلوكي' : ''), 'success');
  },

  studentProfile(stuId) {
    const s    = DB.get('students').find(x => x.id === stuId);
    if (!s) return;
    const cls  = DB.get('classes').find(c => c.id === s.classId);
    const allAtt = DB.get('attendance');
    const abs  = _countAtt(stuId, 'absent', allAtt);
    const late = _countAtt(stuId, 'late', allAtt);
    const pres = _countAtt(stuId, 'present', allAtt);
    const absDates = allAtt
      .filter(a => a.records.some(r => r.studentId === stuId && r.status === 'absent'))
      .map(a => a.date)
      .sort()
      .reverse();
    const lateDates = allAtt
      .filter(a => a.records.some(r => r.studentId === stuId && r.status === 'late'))
      .map(a => a.date)
      .sort()
      .reverse();
    const g    = DB.get('grades').find(x => x.studentId===stuId && x.classId===s.classId)?.grades || {};
    const tot  = _sumGrades(g);
    const behCounts = s.behaviors || {};
    const posBeh = BEH_TYPES.filter(b => b.pos);
    const negBeh = BEH_TYPES.filter(b => !b.pos);

    Modal.open(`ملف ${_T.theStu} | ${s.name}`, `
      <div class="profile-header">
        <div class="profile-big-avatar">${s.name.charAt(0)}</div>
        <div>
          <div class="profile-main-name">${s.name}</div>
          <div class="profile-meta">${cls?.name||'—'} | ${cls?.subject||'—'}</div>
        </div>
      </div>
      <div class="profile-section">
        <div class="profile-section-title"><i class="fas fa-clipboard-check"></i> الحضور</div>
        <div class="profile-stats">
          <div class="profile-stat"><div class="profile-stat-val" style="color:var(--green)">${pres}</div><div class="profile-stat-lbl">حاضر</div></div>
          <div class="profile-stat" ${absDates.length ? `onclick="const el=document.getElementById('abs-dates');el.style.display=el.style.display==='none'?'block':'none'" style="cursor:pointer"` : ''}>
            <div class="profile-stat-val" style="color:var(--red)">${abs}</div>
            <div class="profile-stat-lbl">غائب${absDates.length ? ' <i class="fas fa-chevron-down" style="font-size:.6rem"></i>' : ''}</div>
          </div>
          <div class="profile-stat" ${lateDates.length ? `onclick="const el=document.getElementById('late-dates');el.style.display=el.style.display==='none'?'block':'none'" style="cursor:pointer"` : ''}>
            <div class="profile-stat-val" style="color:var(--orange)">${late}</div>
            <div class="profile-stat-lbl">متأخر${lateDates.length ? ' <i class="fas fa-chevron-down" style="font-size:.6rem"></i>' : ''}</div>
          </div>
        </div>
        ${absDates.length ? `
        <div id="abs-dates" style="display:none;margin-top:.75rem">
          <div style="font-size:.75rem;font-weight:700;color:var(--red);margin-bottom:.4rem"><i class="fas fa-calendar-times"></i> أيام الغياب</div>
          <div style="display:flex;flex-wrap:wrap;gap:.35rem">
            ${absDates.map(d => `<span style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:.2rem .6rem;font-size:.78rem;font-weight:600">${d}</span>`).join('')}
          </div>
        </div>` : ''}
        ${lateDates.length ? `
        <div id="late-dates" style="display:none;margin-top:.6rem">
          <div style="font-size:.75rem;font-weight:700;color:var(--orange);margin-bottom:.4rem"><i class="fas fa-clock"></i> أيام التأخر</div>
          <div style="display:flex;flex-wrap:wrap;gap:.35rem">
            ${lateDates.map(d => `<span style="background:#fff7ed;color:#ea580c;border-radius:6px;padding:.2rem .6rem;font-size:.78rem;font-weight:600">${d}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
      <div class="profile-section">
        <div class="profile-section-title"><i class="fas fa-star-half-alt"></i> الدرجات</div>
        <div class="profile-stats">
          <div class="profile-stat"><div class="profile-stat-val" style="color:var(--primary)">${tot||'—'}</div><div class="profile-stat-lbl">المجموع / 100</div></div>
          <div class="profile-stat"><div class="profile-stat-val">${tot>0?_letter(tot):'—'}</div><div class="profile-stat-lbl">التقدير</div></div>
          <div class="profile-stat"><div class="profile-stat-val" style="color:${tot>=50?'var(--green)':'var(--red)'};font-size:1rem">${tot>0?(tot>=50?'ناجح':'راسب'):'—'}</div><div class="profile-stat-lbl">الحالة</div></div>
        </div>
      </div>
      <div class="profile-section">
        <div class="profile-section-title"><i class="fas fa-smile"></i> السلوك والمشاركة</div>
        <div style="margin-bottom:.5rem;font-size:.75rem;color:var(--gray-400);font-weight:600">إيجابي</div>
        <div class="profile-stats" style="margin-bottom:.75rem">
          ${posBeh.map(b => `<div class="profile-stat">
            <div class="profile-stat-val" style="color:${b.color}">${behCounts[b.key]||0}</div>
            <div class="profile-stat-lbl">${_bIcon(b,true)} ${b.label}</div>
          </div>`).join('')}
        </div>
        <div style="margin-bottom:.5rem;font-size:.75rem;color:var(--gray-400);font-weight:600">سلبي</div>
        <div class="profile-stats">
          ${negBeh.map(b => `<div class="profile-stat">
            <div class="profile-stat-val" style="color:${b.color}">${behCounts[b.key]||0}</div>
            <div class="profile-stat-lbl">${_bIcon(b,true)} ${b.label}</div>
          </div>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:.5rem;padding-top:.5rem;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="Print.parentReport('${stuId}')"><i class="fas fa-print"></i> تقرير ولي الأمر</button>
        <button class="btn btn-outline btn-sm" onclick="Modal.close();Pages.editStudentModal('${stuId}')"><i class="fas fa-edit"></i> تعديل</button>
        <button class="btn btn-sm" style="background:var(--primary);color:#fff" onclick="Modal.close();Pages.referralModal('${stuId}')"><i class="fas fa-file-medical-alt"></i> إحالة ${_T.stu}</button>
      </div>
    `);
  },

  analytics() {
    const classes  = DB.get('classes');
    const students = DB.get('students');
    const allAtt   = DB.get('attendance');
    const grades   = DB.get('grades');

    if (!classes.length) {
      document.getElementById('content').innerHTML = `<div style="text-align:center;padding:4rem;color:#9ca3af"><i class="fas fa-chart-bar" style="font-size:3rem;opacity:.3"></i><p style="margin-top:1rem">لا توجد بيانات بعد — أضف فصولاً وطلاباً أولاً</p></div>`;
      return;
    }

    // --- attendance + engagement per class ---
    const classStats = classes.map(cls => {
      const stus = students.filter(s => s.classId === cls.id);
      const attRecs = allAtt.filter(a => a.classId === cls.id);
      const totalSlots = stus.length * attRecs.length;
      const presentCount = attRecs.reduce((n, a) =>
        n + a.records.filter(r => r.status === 'present' || r.status === 'late').length, 0);
      const attRate = totalSlots > 0 ? Math.round(presentCount / totalSlots * 100) : null;
      const posBeh = stus.reduce((n, s) => {
        const b = s.behaviors || {};
        return n + BEH_TYPES.filter(bt => bt.pos).reduce((a, bt) => a + (b[bt.key] || 0), 0);
      }, 0);
      return { cls, stus: stus.length, attRate, posBeh, sessions: attRecs.length };
    });

    const maxBeh = Math.max(1, ...classStats.map(x => x.posBeh));

    // --- students needing attention ---
    const needsAtt = students.map(s => {
      const absCount = _countAtt(s.id, 'absent', allAtt);
      const gr = grades.find(g => g.studentId === s.id && g.classId === s.classId);
      const tot = gr ? _sumGrades(gr.grades) : null;
      const negBeh = BEH_TYPES.filter(b => !b.pos).reduce((n, b) => n + (s.behaviors?.[b.key] || 0), 0);
      const score = (absCount >= 3 ? 2 : 0) + (tot !== null && tot < 50 ? 2 : 0) + (negBeh >= 5 ? 1 : 0);
      if (!score) return null;
      const cls = classes.find(c => c.id === s.classId);
      return { s, cls, absCount, tot, negBeh, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8);

    // --- grade distribution ---
    const distMap = { 'ممتاز+':0,'ممتاز':0,'جيد جداً+':0,'جيد جداً':0,'جيد+':0,'جيد':0,'مقبول':0,'راسب':0 };
    grades.forEach(g => {
      const tot = _sumGrades(g.grades);
      if (tot > 0) distMap[_letter(tot)]++;
    });
    const distTotal = Object.values(distMap).reduce((a, b) => a + b, 0);

    // --- summary stats ---
    const totalStudents = students.length;
    const totalAbs = students.reduce((n, s) => n + _countAtt(s.id, 'absent', allAtt), 0);
    const totalSessions = allAtt.length;

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-chart-bar"></i> لوحة التحليلات</h2>
      </div>

      <div class="stats-row" style="margin-bottom:0">
        <div class="stat-card"><div class="stat-val">${totalStudents}</div><div class="stat-lbl">إجمالي الطلاب</div></div>
        <div class="stat-card"><div class="stat-val">${classes.length}</div><div class="stat-lbl">الفصول</div></div>
        <div class="stat-card"><div class="stat-val">${totalSessions}</div><div class="stat-lbl">جلسات حضور مسجّلة</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--red)">${totalAbs}</div><div class="stat-lbl">إجمالي الغيابات</div></div>
      </div>

      <div class="analytics-grid">

        <div class="analytics-card">
          <div class="analytics-card-title"><i class="fas fa-clipboard-check" style="color:#10b981"></i> نسبة الحضور لكل فصل</div>
          ${classStats.map(x => {
            const rate = x.attRate;
            const color = rate === null ? '#9ca3af' : rate >= 80 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#dc2626';
            return `<div class="att-bar-row">
              <div class="att-bar-label">
                <span>${x.cls.name}</span>
                <span style="color:${color};font-weight:700">${rate === null ? 'لا بيانات' : rate + '%'}</span>
              </div>
              <div class="att-bar-track"><div class="att-bar-fill" style="width:${rate ?? 0}%;background:${color}"></div></div>
            </div>`;
          }).join('')}
        </div>

        <div class="analytics-card">
          <div class="analytics-card-title"><i class="fas fa-fire" style="color:#7c3aed"></i> أكثر الفصول تفاعلاً</div>
          ${classStats.sort((a,b) => b.posBeh - a.posBeh).map(x => `
            <div class="engage-row">
              <span class="engage-name">${x.cls.name}</span>
              <div class="engage-bar-track"><div class="engage-bar-fill" style="width:${Math.round(x.posBeh/maxBeh*100)}%"></div></div>
              <span class="engage-val">${x.posBeh}</span>
            </div>`).join('')}
        </div>

        <div class="analytics-card" style="grid-column:1/-1">
          <div class="analytics-card-title"><i class="fas fa-exclamation-triangle" style="color:#dc2626"></i> طلاب يحتاجون اهتمام</div>
          ${needsAtt.length === 0
            ? `<div style="text-align:center;padding:1.5rem;color:#9ca3af"><i class="fas fa-check-circle" style="color:#10b981;font-size:1.5rem"></i><p style="margin-top:.5rem">ممتاز — لا يوجد طلاب بحاجة لتدخل حالياً</p></div>`
            : needsAtt.map(({s, cls, absCount, tot, negBeh}) => `
              <div class="attention-row" onclick="Pages.studentProfile('${s.id}')" style="cursor:pointer">
                <div class="attention-avatar">${s.name.charAt(0)}</div>
                <div>
                  <div class="attention-name">${s.name}</div>
                  <div class="attention-meta">
                    <span style="color:#6b7280">${cls?.name || '—'}</span>
                    ${absCount >= 3 ? `<span class="attention-tag tag-abs">غاب ${absCount} مرات</span>` : ''}
                    ${tot !== null && tot < 50 ? `<span class="attention-tag tag-fail">درجة ${tot}/100</span>` : ''}
                    ${negBeh >= 5 ? `<span class="attention-tag tag-beh">سلوك سلبي ${negBeh}</span>` : ''}
                  </div>
                </div>
              </div>`).join('')}
        </div>

        <div class="analytics-card">
          <div class="analytics-card-title"><i class="fas fa-graduation-cap" style="color:#0369a1"></i> توزيع التقديرات</div>
          ${distTotal === 0
            ? `<div style="text-align:center;padding:1rem;color:#9ca3af">لا توجد درجات مسجّلة</div>`
            : Object.entries(distMap).filter(([,v])=>v>0).map(([label, count]) => {
                const pct = Math.round(count / distTotal * 100);
                return `<div class="grade-dist-row">
                  <span style="font-weight:600">${label}</span>
                  <span style="color:#6b7280">${count} طالب (${pct}%)</span>
                </div>`;
              }).join('')}
        </div>

      </div>`;
  },

  async settings() {
    const t = DB.teacher() || {};
    const fsIdx = FontSize._sizes.indexOf(FontSize.current());
    const sett = DB.settings();

    const _students   = DB.get('students');
    const _classes    = DB.get('classes');
    const _grades     = DB.get('grades');
    const _attendance = DB.get('attendance');
    const _cnt = {
      referrals:  _students.filter(s => (s.referralCount||0) > 0).length,
      behavior:   _students.filter(s => s.behaviors && Object.values(s.behaviors).some(v => v > 0)).length,
      grades:     _grades.length,
      attendance: _attendance.length,
      all:        _students.length + _classes.length,
    };
    const _badge = (n, unit) => n > 0
      ? `<span style="font-size:.78rem;color:var(--gray-500)">${n} ${unit}</span>`
      : `<span style="font-size:.78rem;color:#10b981">لا توجد بيانات</span>`;

    const subHtml = `<div class="settings-card">
      <div class="settings-card-hdr"><i class="fas fa-crown"></i> الاشتراك</div>
      <div style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0">
        <span style="background:#10b981;color:#fff;padding:.25rem .75rem;border-radius:999px;font-size:.85rem;font-weight:700"><i class="fas fa-infinity"></i> مجاني — بدون قيود</span>
      </div>
    </div>`;

    document.getElementById('content').innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-cog"></i> الإعدادات | Settings</h2>
      </div>
      <div class="settings-grid">
        ${subHtml}

        <div class="settings-card">
          <div class="settings-card-hdr"><i class="fas fa-bell"></i> إشعارات الحصص</div>
          <div class="settings-row">
            <div><div style="font-weight:600">إشعار بداية الحصة</div><div style="font-size:.82rem;color:var(--gray-500)">تنبيه عند بدء كل حصة في جدولك</div></div>
            <label class="toggle-switch">
              <input type="checkbox" id="notif-start" ${sett.notifyStart?'checked':''} onchange="Notify.toggle('notifyStart',this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <div><div style="font-weight:600">إشعار قرب نهاية الحصة</div><div style="font-size:.82rem;color:var(--gray-500)">تنبيه قبل انتهاء الحصة بدقائق</div></div>
            <label class="toggle-switch">
              <input type="checkbox" id="notif-end" ${sett.notifyEnd?'checked':''} onchange="Notify.toggle('notifyEnd',this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row" id="notif-before-row" style="${sett.notifyEnd?'':'opacity:.4;pointer-events:none'}">
            <div><div style="font-weight:600">التنبيه قبل النهاية بـ</div></div>
            <div style="display:flex;align-items:center;gap:.4rem">
              <input type="number" min="1" max="20" value="${sett.notifyEndBefore??5}"
                style="width:52px;padding:.3rem .4rem;border:1.5px solid var(--border);border-radius:8px;text-align:center;font-family:inherit"
                onchange="const s=DB.settings();s.notifyEndBefore=+this.value;DB.saveSettings(s);document.getElementById('notif-before-row').style.opacity=''">
              <span style="font-size:.85rem;color:var(--gray-500)">دقيقة</span>
            </div>
          </div>
          <div style="font-size:.75rem;color:var(--gray-400);margin-top:.5rem;padding-top:.5rem;border-top:1px solid var(--gray-100)">
            <i class="fas fa-info-circle"></i> يجب إبقاء المتصفح مفتوحاً لاستقبال الإشعارات
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-hdr"><i class="fas fa-text-height"></i> حجم الخط</div>
          <div class="settings-row">
            <span>حجم الخط الحالي</span>
            <div style="display:flex;align-items:center;gap:.5rem">
              <button class="btn btn-sm btn-outline" onclick="FontSize.change(-1);Pages._updateFsLabel()" id="fs-down-s" ${fsIdx===0?'disabled':''}>A <i class="fas fa-minus"></i></button>
              <span id="fs-label-s" style="font-weight:700;color:var(--primary);min-width:2.5rem;text-align:center">${FontSize.current()}px</span>
              <button class="btn btn-sm btn-outline" onclick="FontSize.change(1);Pages._updateFsLabel()" id="fs-up-s" ${fsIdx===FontSize._sizes.length-1?'disabled':''}>A <i class="fas fa-plus"></i></button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-hdr"><i class="fas fa-user-tie"></i> بيانات الحساب</div>
          <div class="form-group"><label>اسم ${_T.theTch}</label>
            <input type="text" id="sett-name" value="${t.name||''}"></div>
          <div class="form-group"><label>المنطقة التعليمية</label>
            <input type="text" id="sett-region" placeholder="مثال: الرياض، جدة، الدمام..." value="${t.region||''}"></div>
          <div class="form-group"><label>اسم المدرسة</label>
            <input type="text" id="sett-school" value="${t.school||''}"></div>
          <div class="form-group"><label>المادة الافتراضية</label>
            <input type="text" id="sett-subject" value="${t.subject||''}"></div>
          <div class="form-actions">
            <button class="btn btn-primary" onclick="Pages._saveProfile()"><i class="fas fa-save"></i> حفظ</button>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-hdr"><i class="fas fa-database"></i> إدارة البيانات</div>
          <div class="settings-row">
            <div>
              <div style="font-weight:600">مسح جميع الإحالات</div>
              <div style="font-size:.82rem;color:var(--gray-500)">إعادة تصفير عداد الإحالات لجميع ${_T.theStus}</div>
              ${_badge(_cnt.referrals, `${_T.stu} محال`)}
            </div>
            <button class="btn btn-sm" style="background:#ef4444;color:#fff;white-space:nowrap" onclick="Pages._clearAllReferrals()"><i class="fas fa-trash"></i> مسح</button>
          </div>
          <div class="settings-row">
            <div>
              <div style="font-weight:600">مسح جميع الإجراءات السلوكية</div>
              <div style="font-size:.82rem;color:var(--gray-500)">حذف سجلات السلوك لجميع ${_T.theStus}</div>
              ${_badge(_cnt.behavior, `${_T.stu} لديه سجل سلوكي`)}
            </div>
            <button class="btn btn-sm" style="background:#ef4444;color:#fff;white-space:nowrap" onclick="Pages._clearData('behavior')"><i class="fas fa-trash"></i> مسح</button>
          </div>
          <div class="settings-row">
            <div>
              <div style="font-weight:600">مسح جميع الدرجات</div>
              <div style="font-size:.82rem;color:var(--gray-500)">حذف درجات جميع ${_T.theStus}</div>
              ${_badge(_cnt.grades, 'سجل درجات')}
            </div>
            <button class="btn btn-sm" style="background:#ef4444;color:#fff;white-space:nowrap" onclick="Pages._clearData('grades')"><i class="fas fa-trash"></i> مسح</button>
          </div>
          <div class="settings-row">
            <div>
              <div style="font-weight:600">مسح جميع سجلات الحضور</div>
              <div style="font-size:.82rem;color:var(--gray-500)">حذف جميع سجلات الحضور والغياب</div>
              ${_badge(_cnt.attendance, 'سجل حضور')}
            </div>
            <button class="btn btn-sm" style="background:#ef4444;color:#fff;white-space:nowrap" onclick="Pages._clearData('attendance')"><i class="fas fa-trash"></i> مسح</button>
          </div>
          <div class="settings-row">
            <div>
              <div style="font-weight:600;color:#ef4444">مسح جميع البيانات</div>
              <div style="font-size:.82rem;color:var(--gray-500)">حذف ${_T.theStus} والفصول وجميع السجلات</div>
              ${_badge(_cnt.all, `${_T.stu} وفصل`)}
            </div>
            <button class="btn btn-sm" style="background:#7f1d1d;color:#fff;white-space:nowrap" onclick="Pages._clearData('all')"><i class="fas fa-bomb"></i> مسح الكل</button>
          </div>
        </div>

      </div>
    `;
  },

  _updateFsLabel() {
    const lbl  = document.getElementById('fs-label-s');
    const dBtn = document.getElementById('fs-down-s');
    const uBtn = document.getElementById('fs-up-s');
    if (!lbl) return;
    const cur = FontSize.current();
    const idx = FontSize._sizes.indexOf(cur);
    lbl.textContent = cur + 'px';
    if (dBtn) dBtn.disabled = idx === 0;
    if (uBtn) uBtn.disabled = idx === FontSize._sizes.length - 1;
  },

  _saveProfile() {
    const name    = document.getElementById('sett-name').value.trim();
    const region  = document.getElementById('sett-region').value.trim();
    const school  = document.getElementById('sett-school').value.trim();
    const subject = document.getElementById('sett-subject').value.trim();
    if (!name) { Toast.show(`يرجى إدخال اسم ${_T.theTch}`, 'error'); return; }
    DB.setTeacher({ ...DB.teacher(), name, region, school, subject });
    document.getElementById('sb-name').textContent   = name;
    document.getElementById('sb-school').textContent = school;
    Toast.show('تم حفظ البيانات!', 'success');
  },

  _clearData(type) {
    const labels = {
      behavior:   'جميع الإجراءات السلوكية',
      grades:     'جميع الدرجات',
      attendance: 'جميع سجلات الحضور',
      all:        `جميع البيانات (${_T.theStus} والفصول وكل السجلات)`
    };
    if (!confirm(`هل أنت متأكد من مسح ${labels[type]}؟ لا يمكن التراجع.`)) return;
    if (type === 'behavior') {
      DB.set('students', DB.get('students').map(s => ({ ...s, behaviors: {} })));
    } else if (type === 'grades') {
      DB.set('grades', []);
    } else if (type === 'attendance') {
      DB.set('attendance', []);
    } else if (type === 'all') {
      ['classes','attendance','grades','schedule','comms'].forEach(k => DB.set(k, []));
      DB.set('students', []);
    }
    Toast.show('تم المسح بنجاح', 'success');
    this.settings();
  },

  _refToChange(prevRole) {
    const sel  = document.getElementById('ref-to');
    const inp  = document.getElementById('ref-to-name');
    const wrap = document.getElementById('ref-to-name-wrap');
    const lbl  = document.getElementById('ref-to-name-lbl');
    const val  = sel?.value || '';
    const labels = {
      [_T.wkl]:  _T.wklLbl,
      [_T.dir]:  _T.dirLbl,
      [_T.rshd]: _T.rshdLbl,
      [_T.doc]:  _T.docLbl,
      [_T.spec]: _T.specLbl,
    };
    // Save previous role's name
    if (prevRole && inp) {
      const t = DB.teacher() || {};
      const names = t.refToNames || {};
      names[prevRole] = inp.value.trim();
      DB.setTeacher({ ...t, refToNames: names });
    }
    const show = !!labels[val];
    if (wrap) wrap.style.display = show ? '' : 'none';
    if (lbl && labels[val]) lbl.textContent = labels[val];
    // Load saved name for new role
    if (inp && show) {
      const saved = (DB.teacher()?.refToNames || {})[val] || '';
      inp.value = saved;
    }
  },
  _refReasonChange() {
    const r = document.getElementById('ref-reason')?.value || '';
    const map = {
      'ضعف تحصيل دراسي': `${_T._f?'تعاني':'يعاني'} ${_T.theStu} من ضعف ملحوظ في مستوى التحصيل الدراسي، ورُصد تراجع مستمر في أدائه خلال الفترة الماضية. ${_T._f?'حرصت':'حرص'} ${_T.theTch} على تقديم شرح إضافي وتبسيط المادة وتنويع أساليب التدريس، إلا أن الوضع يستدعي تدخلاً من الجهة المختصة لدعم ${_T.theStu} ومتابعة مستواه.`,
      'كثرة الغياب': `${_T._f?'تُسجّل':'يُسجّل'} ${_T.theStu} غياباً متكرراً عن الحصص مما أثّر سلباً على متابعتها للمادة وتحصيلها الدراسي. تمّت مناصحة ${_T.theStu} مراراً وتنبيهها بأهمية الانتظام، غير أن الغياب لا يزال مستمراً ويستدعي متابعة من الجهة المختصة.`,
      'سلوك سلبي متكرر': `${_T._f?'تُظهر':'يُظهر'} ${_T.theStu} سلوكاً سلبياً متكرراً داخل الفصل يؤثر على سير الدرس وزملائه. ${_T._f?'اتخذت':'اتخذ'} ${_T.theTch} جملةً من الإجراءات التربوية بما فيها التوجيه المباشر والتنبيه المتكرر، إلا أن السلوك لم يتحسن، مما يستدعي تدخل الجهة المختصة.`,
      'مشكلة صحية': `لُوحظ على ${_T.theStu} أعراض تشير إلى احتمال وجود مشكلة صحية تؤثر على حضورها الذهني ومتابعتها للدراسة. ${_T._f?'ترى':'يرى'} ${_T.theTch} ضرورة إحالتها للجهة المختصة للكشف على وضعها واتخاذ ما يلزم.`,
      'مشكلة اجتماعية أو أسرية': `لُوحظ على ${_T.theStu} تغيّرات واضحة في مزاجها ومستوى تفاعلها ومشاركتها، مما يُشير إلى وجود ضغوط أو ظروف خاصة تؤثر على حضورها الذهني. ${_T._f?'قامت':'قام'} ${_T.theTch} بالتحدث مع ${_T.theStu} وتشجيعها، و${_T._f?'ترى':'يرى'} إحالتها لمن يختص لمزيد من المتابعة والدعم.`,
      'تأخر مستمر': `${_T._f?'تُداوم':'يُداوم'} ${_T.theStu} على التأخر في الوصول للفصل مما يُعيق متابعتها للدروس ويؤثر على تحصيلها. ${_T._f?'وجّهت':'وجّه'} ${_T.theTch} ${_T.theStu} بضرورة الالتزام بمواعيد الحضور أكثر من مرة، إلا أن التأخر لا يزال مستمراً ويستدعي متابعة من الجهة المختصة.`,
      'أخرى': ''
    };
    const ta = document.getElementById('ref-notes');
    if (ta && map[r] !== undefined) ta.value = map[r];
  },
  referralModal(stuId) {
    const s = DB.get('students').find(x => x.id === stuId);
    if (!s) return;
    const cls = DB.get('classes').find(c => c.id === s.classId);
    const teacher = DB.teacher() || {};
    const today = new Date().toISOString().slice(0, 10);
    Modal.open(`إحالة ${_T.stu} | Student Referral`, `
      <div class="form-group">
        <label>${_T.theStu} / Student</label>
        <input type="text" value="${s.name}" readonly style="background:var(--gray-50)">
      </div>
      <div class="form-group">
        <label>الفصل / Class</label>
        <input type="text" value="${cls?.name||'—'}" readonly style="background:var(--gray-50)">
      </div>
      <div class="form-group">
        <label><i class="fas fa-map-marker-alt"></i> المنطقة / Region</label>
        <input type="text" id="ref-region" value="${teacher.region||''}" placeholder="مثال: الرياض، مكة المكرمة...">
      </div>
      <div class="form-group">
        <label><i class="fas fa-school"></i> المدرسة / School</label>
        <input type="text" id="ref-school" value="${teacher.refSchool||teacher.school||''}" placeholder="اسم المدرسة">
      </div>
      <div class="form-group">
        <label><i class="fas fa-user-edit"></i> اسم ${_T.theTch} في النموذج</label>
        <input type="text" id="ref-teacher-name" value="${teacher.refTeacherName||teacher.name||''}" placeholder="الاسم الذي يظهر في النموذج">
      </div>
      <div style="background:var(--gray-50);border-radius:8px;padding:10px 14px;margin-bottom:.75rem;display:flex;align-items:center;gap:10px;font-size:.85rem">
        <i class="fas fa-history" style="color:var(--primary)"></i>
        <span>عدد إحالات <strong>${s.name}</strong> السابقة: <strong>${s.referralCount||0}</strong></span>
      </div>
      <div class="form-group">
        <label><i class="fas fa-calendar"></i> التاريخ / Date</label>
        <input type="date" id="ref-date" value="${today}">
      </div>
      <div class="form-group">
        <label><i class="fas fa-user-tie"></i> الإحالة إلى / Referred To</label>
        <select id="ref-to" onchange="Pages._refToChange(this.dataset.prev);this.dataset.prev=this.value">
          <option value="${_T.wkl}">${_T.wkl}</option>
          <option value="${_T.dir}">${_T.dir}</option>
          <option value="${_T.rshd}">${_T.rshd}</option>
          <option value="${_T.doc}">${_T.doc}</option>
          <option value="${_T.spec}">${_T.spec}</option>
          <option value="لجنة الانضباط المدرسي">لجنة الانضباط المدرسي</option>
        </select>
      </div>
      <div class="form-group" id="ref-to-name-wrap" style="display:none">
        <label><i class="fas fa-id-badge"></i> <span id="ref-to-name-lbl">اسم الوكيل</span></label>
        <input type="text" id="ref-to-name" value="" placeholder="اكتب الاسم...">
      </div>
      <div class="form-group">
        <label><i class="fas fa-list-ul"></i> سبب الإحالة / Reason</label>
        <select id="ref-reason" onchange="Pages._refReasonChange()">
          <option value="" disabled selected>— اختر سبب الإحالة —</option>
          <option value="ضعف تحصيل دراسي">ضعف تحصيل دراسي</option>
          <option value="كثرة الغياب">كثرة الغياب</option>
          <option value="سلوك سلبي متكرر">سلوك سلبي متكرر</option>
          <option value="مشكلة صحية">مشكلة صحية</option>
          <option value="مشكلة اجتماعية أو أسرية">مشكلة اجتماعية أو أسرية</option>
          <option value="تأخر مستمر">تأخر مستمر</option>
          <option value="أخرى (تُحدد في الملاحظات)">أخرى (تُحدد في الملاحظات)</option>
        </select>
      </div>
      <div class="form-group">
        <label><i class="fas fa-sticky-note"></i> ملاحظات ${_T.theTch} / Notes</label>
        <textarea id="ref-notes" rows="4" placeholder="يُملأ تلقائياً عند اختيار السبب، أو اكتب ملاحظاتك..."></textarea>
      </div>
      <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="Modal.close()">إلغاء</button>
        <button class="btn btn-primary" onclick="Print.referral('${stuId}')"><i class="fas fa-print"></i> طباعة الإحالة</button>
      </div>
    `);
    const refToSel = document.getElementById('ref-to');
    if (refToSel) { refToSel.dataset.prev = refToSel.value; }
    Pages._refToChange();
    // Load saved name for default role
    const _inp = document.getElementById('ref-to-name');
    if (_inp && refToSel) { _inp.value = (DB.teacher()?.refToNames||{})[refToSel.value] || ''; }
  },

  /* ---- PREVIEW MODE ---- */
  _previewOriginal: null,

  _previewAs(profile) {
    if (this._previewOriginal === null)
      this._previewOriginal = localStorage.getItem(DB._k.teacher);
    localStorage.setItem(DB._k.teacher, JSON.stringify(profile));
    const role = profile.gender === 'female' ? 'معلمة' : 'معلم';
    const label = profile.name ? `${role}: ${profile.name}` : role;
    document.getElementById('preview-banner-text').textContent = `وضع المعاينة — ${label}`;
    document.getElementById('preview-banner').classList.remove('hidden');
    document.getElementById('sb-name').textContent   = profile.name   || role;
    document.getElementById('sb-school').textContent = profile.school || '—';
    Router.go('dashboard');
  },

  _exitPreview() {
    if (this._previewOriginal !== null) {
      localStorage.setItem(DB._k.teacher, this._previewOriginal);
      this._previewOriginal = null;
    }
    document.getElementById('preview-banner').classList.add('hidden');
    const t = DB.teacher() || {};
    document.getElementById('sb-name').textContent   = t.name   || '—';
    document.getElementById('sb-school').textContent = t.school || '—';
    Router.go('admin');
  },

  /* ---- ADMIN PANEL ---- */
  async admin() {
    const el = document.getElementById('content');
    el.innerHTML = `<div class="page-header"><h2><i class="fas fa-shield-alt"></i> لوحة الإدارة | Admin Panel</h2></div>
      <div style="text-align:center;padding:4rem"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary)"></i></div>`;

    const [{ data: profiles, error: profErr }, { data: platRow }] = await Promise.all([
      _sb.rpc('get_all_users'),
      _sb.from('user_data').select('value').eq('key','platform_open').maybeSingle()
    ]);

    if (profErr) {
      el.innerHTML = `<div class="page-header"><h2><i class="fas fa-shield-alt"></i> لوحة الإدارة</h2></div>
        <div class="empty-state"><i class="fas fa-exclamation-triangle fa-3x" style="color:#ef4444"></i>
        <p>تعذّر تحميل البيانات — تحقق من صلاحيات Supabase (RLS)</p>
        <small style="direction:ltr;opacity:.6">${profErr.message}</small></div>`;
      return;
    }

    const isPlatformOpen = !platRow || platRow.value !== '0';
    const teachers = profiles || [];
    const males   = teachers.filter(p => p.gender !== 'female').length;
    const females = teachers.filter(p => p.gender === 'female').length;

    const rows = teachers.map((p, i) => {
      const pJson = JSON.stringify({ name: p.name||'', school: p.school||'', subject: p.subject||'', gender: p.gender||'male', email: p.email||'' }).replace(/"/g, '&quot;');
      return `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name || '—'}</td>
        <td style="direction:ltr;text-align:right;font-size:.82rem">${p.email || '—'}</td>
        <td><span class="badge ${p.gender === 'female' ? 'purple' : 'blue'}">${p.gender === 'female' ? 'معلمة' : 'معلم'}</span></td>
        <td>${p.school || '—'}</td>
        <td>${p.subject || '—'}</td>
        <td style="font-size:.78rem;color:var(--gray-500)">${p.created_at ? new Date(p.created_at).toLocaleDateString('ar-SA') : '—'}</td>
        <td><button class="btn btn-sm btn-outline" onclick='Pages._previewAs(${pJson})'><i class="fas fa-eye"></i> معاينة</button></td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-shield-alt"></i> لوحة الإدارة | Admin Panel</h2>
      </div>

      <div class="stats-grid" style="margin-bottom:1.5rem">
        <div class="stat-card">
          <div class="stat-icon" style="background:#e0e7ff;color:#4f46e5"><i class="fas fa-users"></i></div>
          <div class="stat-info"><div class="stat-val">${teachers.length}</div><div class="stat-lbl">إجمالي المعلمين</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#dbeafe;color:#2563EB"><i class="fas fa-male"></i></div>
          <div class="stat-info"><div class="stat-val">${males}</div><div class="stat-lbl">معلم</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fce7f3;color:#db2777"><i class="fas fa-female"></i></div>
          <div class="stat-info"><div class="stat-val">${females}</div><div class="stat-lbl">معلمة</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:${isPlatformOpen ? '#d1fae5' : '#fee2e2'};color:${isPlatformOpen ? '#059669' : '#dc2626'}">
            <i class="fas fa-${isPlatformOpen ? 'lock-open' : 'lock'}"></i>
          </div>
          <div class="stat-info">
            <div class="stat-val" style="font-size:1rem;color:${isPlatformOpen ? '#059669' : '#dc2626'}">${isPlatformOpen ? 'مفتوحة' : 'مغلقة'}</div>
            <div class="stat-lbl">حالة المنصة</div>
          </div>
        </div>
      </div>

      <div class="settings-card" style="margin-bottom:1.5rem">
        <div class="settings-card-hdr"><i class="fas fa-toggle-on"></i> التحكم في المنصة</div>
        <div class="settings-row">
          <div>
            <div style="font-weight:600">حالة المنصة</div>
            <div style="font-size:.82rem;color:var(--gray-500)">عند الإغلاق لن يتمكن أحد من التسجيل أو الدخول (عدا الأدمن)</div>
          </div>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-sm" style="background:#10b981;color:#fff" onclick="Pages._adminSetPlatform(true)" ${isPlatformOpen ? 'disabled' : ''}>
              <i class="fas fa-lock-open"></i> فتح
            </button>
            <button class="btn btn-sm" style="background:#ef4444;color:#fff" onclick="Pages._adminSetPlatform(false)" ${!isPlatformOpen ? 'disabled' : ''}>
              <i class="fas fa-lock"></i> إغلاق
            </button>
          </div>
        </div>
      </div>

      <div class="settings-card" style="margin-bottom:1.5rem">
        <div class="settings-card-hdr"><i class="fas fa-eye"></i> معاينة سريعة للمنصة</div>
        <div class="settings-row">
          <div>
            <div style="font-weight:600">استعرض المنصة كمعلم أو معلمة</div>
            <div style="font-size:.82rem;color:var(--gray-500)">ستنتقل للرئيسية وتقدر تتنقل في كل الصفحات — اضغط "خروج من المعاينة" للعودة</div>
          </div>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-sm" style="background:#2563EB;color:#fff"
              onclick='Pages._previewAs({name:"معلم (تجريبي)",school:"مدرسة تجريبية",subject:"مادة تجريبية",gender:"male"})'>
              <i class="fas fa-male"></i> معاينة كمعلم
            </button>
            <button class="btn btn-sm" style="background:#db2777;color:#fff"
              onclick='Pages._previewAs({name:"معلمة (تجريبية)",school:"مدرسة تجريبية",subject:"مادة تجريبية",gender:"female"})'>
              <i class="fas fa-female"></i> معاينة كمعلمة
            </button>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-hdr"><i class="fas fa-chalkboard-teacher"></i> قائمة المعلمين المسجلين (${teachers.length})</div>
        ${teachers.length === 0
          ? `<div class="empty-state"><i class="fas fa-users fa-2x"></i><p>لا يوجد معلمون مسجلون بعد</p></div>`
          : `<div style="overflow-x:auto"><table class="data-table">
              <thead><tr><th>#</th><th>الاسم</th><th>البريد الإلكتروني</th><th>الجنس</th><th>المدرسة</th><th>المادة</th><th>تاريخ الإنشاء</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>`
        }
      </div>`;
  },

  async _adminSetPlatform(open) {
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) return;
    const { error } = await _sb.from('user_data').upsert(
      { user_id: session.user.id, key: 'platform_open', value: open ? '1' : '0' },
      { onConflict: 'user_id,key' }
    );
    if (error) { Toast.show('حدث خطأ: ' + error.message, 'error'); return; }
    Toast.show(open ? 'تم فتح المنصة للجميع' : 'تم إغلاق المنصة', open ? 'success' : 'info');
    Pages.admin();
  }
};

/* ==================== ADMIN ==================== */
const _ADMIN_EMAIL = 'nassserf999@gmail.com';
const _isAdmin = () => (localStorage.getItem('tm_user_email') || '').toLowerCase() === _ADMIN_EMAIL;

/* ==================== AUTH ==================== */
const SBAuth = {
  async loadUserData(userId) {
    const [{ data: rows }, { data: profile }] = await Promise.all([
      _sb.from('user_data').select('key,value').eq('user_id', userId),
      _sb.from('profiles').select('name,school,subject,gender').eq('id', userId).maybeSingle()
    ]);
    if (rows) rows.forEach(r => { if (DB._k[r.key]) localStorage.setItem(DB._k[r.key], r.value); });
    if (profile) {
      const _existing = DB.teacher() || {};
      localStorage.setItem(DB._k.teacher, JSON.stringify({ ..._existing, ...profile }));
    }
  },

  async signUp(email, password, name, school, subject, gender) {
    const { data: platRow } = await _sb.from('user_data').select('value').eq('key','platform_open').maybeSingle();
    if (platRow?.value === '0') throw new Error('المنصة مغلقة حالياً. تواصل مع الإدارة.');
    const { data, error } = await _sb.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await _sb.from('profiles').upsert({ id: data.user.id, name, school, subject, gender, email: email.toLowerCase() });
      localStorage.setItem(DB._k.teacher, JSON.stringify({ name, school, subject, gender }));
      localStorage.setItem('tm_user_email', email.toLowerCase());
    }
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (email !== _ADMIN_EMAIL) {
      const { data: platRow } = await _sb.from('user_data').select('value').eq('key','platform_open').maybeSingle();
      if (platRow?.value === '0') throw new Error('المنصة مغلقة حالياً. تواصل مع الإدارة.');
    }
    const prevId = localStorage.getItem('tm_current_user');
    if (prevId && prevId !== data.user.id) {
      Object.values(DB._k).forEach(k => localStorage.removeItem(k));
    }
    localStorage.setItem('tm_current_user', data.user.id);
    localStorage.setItem('tm_user_email', email.toLowerCase());
    await this.loadUserData(data.user.id);
    _sb.from('profiles').upsert({ id: data.user.id, email: email.toLowerCase() }, { onConflict: 'id' });
    return data;
  },

  async checkSubscription() {
    return null;
  },

  async signOut() {
    await _sb.auth.signOut();
  }
};

/* ==================== APP INIT ==================== */
const App = {
  async init() {
    const now = new Date();
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('topbar-date').textContent = now.toLocaleDateString('ar-SA', opts);

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        Router.go(link.dataset.page);
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
      });
    });
    document.getElementById('menu-btn').addEventListener('click', () =>
      document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('collapse-btn').addEventListener('click', () =>
      document.getElementById('sidebar').classList.toggle('collapsed'));
    document.getElementById('modal-backdrop').addEventListener('click', e => {
      if (e.target === e.currentTarget) Modal.close();
    });

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    let _searchTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => {
        const q = searchInput.value.trim();
        if (q.length < 2) { searchResults.classList.add('hidden'); return; }
        const students = DB.get('students');
        const classes  = DB.get('classes');
        const results  = students.filter(s => s.name.includes(q)).slice(0, 8);
        if (!results.length) {
          searchResults.innerHTML = `<div class="search-empty">لا توجد نتائج</div>`;
        } else {
          searchResults.innerHTML = results.map(s => {
            const cls = classes.find(c => c.id === s.classId);
            return `<div class="search-item" onclick="Pages.studentProfile('${s.id}');document.getElementById('search-input').value='';document.getElementById('search-results').classList.add('hidden')">
              <div class="student-avatar-sm">${s.name.charAt(0)}</div>
              <div><div class="search-item-name">${s.name}</div><div class="search-item-cls">${cls?.name||'—'}</div></div>
            </div>`;
          }).join('');
        }
        searchResults.classList.remove('hidden');
      }, 200);
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) searchResults.classList.add('hidden');
      if (!e.target.closest('.dot-menu')) document.querySelectorAll('.dot-drop:not(.hidden)').forEach(d => d.classList.add('hidden'));
    });

    const { data: { session } } = await _sb.auth.getSession();
    if (session) {
      localStorage.setItem('tm_user_email', session.user.email.toLowerCase());
      try {
        await SBAuth.checkSubscription(session.user.id, session.user.email);
      } catch (err) {
        await SBAuth.signOut();
        document.getElementById('setup-screen').classList.remove('hidden');
        this._bindAuthForm();
        setTimeout(() => Toast.show(err.message, 'error'), 300);
        return;
      }
      await SBAuth.loadUserData(session.user.id);
      const teacher = DB.teacher();
      if (teacher) { this.start(teacher); return; }
    }
    document.getElementById('setup-screen').classList.remove('hidden');
    this._bindAuthForm();
  },

  switchAuthMode(mode) {
    document.getElementById('setup-form').dataset.mode = mode;
    document.getElementById('signup-fields').classList.toggle('hidden', mode !== 'signup');
    document.getElementById('auth-btn-text').textContent = mode === 'signup' ? 'إنشاء الحساب' : 'دخول';
    document.querySelectorAll('.auth-tab').forEach((t, i) =>
      t.classList.toggle('active', (i === 0) === (mode === 'login')));
    document.getElementById('auth-error').classList.add('hidden');
  },

  _bindAuthForm() {
    document.getElementById('setup-form').addEventListener('submit', async e => {
      e.preventDefault();
      const mode  = document.getElementById('setup-form').dataset.mode || 'login';
      const email = document.getElementById('setup-email').value.trim();
      const pwd   = document.getElementById('setup-password').value;
      const btn   = document.getElementById('auth-submit-btn');
      const errEl = document.getElementById('auth-error');
      btn.disabled = true;
      errEl.classList.add('hidden');
      try {
        if (mode === 'signup') {
          const name       = document.getElementById('setup-teacher').value.trim();
          const school     = document.getElementById('setup-school').value.trim();
          const subject    = document.getElementById('setup-subject').value.trim();
          const gender     = document.querySelector('input[name="setup-gender"]:checked')?.value || 'male';
          if (!name || !school || !subject) throw new Error('يرجى تعبئة جميع الحقول');
          const result = await SBAuth.signUp(email, pwd, name, school, subject, gender);
          if (result.session) {
            this.start(DB.teacher() || { name, school, subject });
          } else {
            Toast.show('تم إنشاء الحساب! يمكنك الدخول الآن', 'success');
            this.switchAuthMode('login');
            document.getElementById('setup-email').value = email;
            document.getElementById('setup-password').value = '';
          }
        } else {
          const loginData = await SBAuth.signIn(email, pwd);
          await SBAuth.checkSubscription(loginData.user.id, loginData.user.email);
          this.start(DB.teacher() || { name: email, school: '', subject: '' });
        }
      } catch (err) {
        const msgs = {
          'Invalid login credentials': 'البريد أو كلمة المرور غير صحيحة',
          'Email not confirmed': 'يرجى تأكيد بريدك الإلكتروني أولاً',
          'User already registered': 'هذا البريد مسجّل مسبقاً'
        };
        errEl.textContent = msgs[err.message] || err.message;
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
      }
    });
  },

  start(teacher) {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('sb-name').textContent = teacher.name;
    document.getElementById('sb-school').textContent = teacher.school;
    const adminLink = document.getElementById('admin-nav-link');
    if (adminLink) adminLink.classList.toggle('hidden', !_isAdmin());
    Router.go('dashboard');
    this._startSubWatcher();
  },

  _startSubWatcher() {
    clearInterval(this._subTimer);
    const check = async () => {
      const { data: { session } } = await _sb.auth.getSession();
      if (!session) return;
      try {
        const days = await SBAuth.checkSubscription(session.user.id, session.user.email);
        if (days !== null && days <= 3) {
          Toast.show(`تنبيه: باقي على انتهاء اشتراكك ${days} ${days === 1 ? 'يوم' : 'أيام'} — جدد الاشتراك قريباً`, 'error');
        }
      } catch {
        clearInterval(this._subTimer);
        await SBAuth.signOut();
        document.getElementById('app').classList.add('hidden');
        document.getElementById('setup-screen').classList.remove('hidden');
        this._bindAuthForm();
        setTimeout(() => Toast.show('انتهت صلاحية اشتراكك. تواصل مع الإدارة للتجديد.', 'error'), 300);
      }
    };
    check();
    this._subTimer = setInterval(check, 24 * 60 * 60 * 1000);
  },

  async logout() {
    if (!confirm('تسجيل الخروج؟ ستبقى جميع البيانات محفوظة.')) return;
    localStorage.removeItem('tm_user_email');
    await SBAuth.signOut();
    document.getElementById('app').classList.add('hidden');
    document.getElementById('admin-nav-link')?.classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
  }
};

/* ==================== FONT SIZE ==================== */
const FontSize = {
  _sizes: [13, 15, 17, 19],
  _key: 'tm_fontsize',
  current() {
    const v = parseInt(localStorage.getItem(this._key));
    return this._sizes.includes(v) ? v : 15;
  },
  apply(size) {
    document.documentElement.style.fontSize = size + 'px';
    localStorage.setItem(this._key, size);
    const idx = this._sizes.indexOf(size);
    document.getElementById('fs-down').disabled = idx === 0;
    document.getElementById('fs-up').disabled   = idx === this._sizes.length - 1;
  },
  change(delta) {
    const idx  = this._sizes.indexOf(this.current());
    const next = this._sizes[Math.max(0, Math.min(this._sizes.length - 1, idx + delta))];
    this.apply(next);
    Toast.show(delta > 0 ? 'تم تكبير الخط' : 'تم تصغير الخط', 'info');
  },
  init() { this.apply(this.current()); }
};

/* ==================== AI ASSISTANT ==================== */
const AI = {
  _history: [],
  _open: false,
  _busy: false,

  toggle() {
    this._open = !this._open;
    const panel = document.getElementById('ai-panel');
    panel?.classList.toggle('hidden', !this._open);
    if (this._open && !this._history.length) this._welcome();
    if (this._open) document.getElementById('ai-input')?.focus();
  },

  clear() {
    this._history = [];
    const el = document.getElementById('ai-messages');
    if (el) el.innerHTML = '';
    this._welcome();
  },

  _welcome() {
    const teacher = DB.teacher();
    const name = teacher?.teacherName || _T.tch;
    this._addMsg(`مرحباً ${name}! 👋\nأنا مساعدك الذكي. أعرف بيانات فصولك وطلابك.\nكيف أقدر أساعدك اليوم؟`, 'bot');
    this._showChips([
      'ملخص أداء الفصل',
      'طلاب يحتاجون اهتمام',
      'اقتراح استراتيجية للسلوك',
      'كيف أكتب تقرير طالب؟',
    ]);
  },

  _buildContext() {
    const teacher  = DB.teacher() || {};
    const classes  = DB.get('classes');
    const students = DB.get('students');
    const allAtt   = DB.get('attendance');
    const today    = new Date().toISOString().slice(0, 10);

    const classInfo = classes.map(cls => {
      const stus = students.filter(s => s.classId === cls.id);
      const todayRec = allAtt.find(a => a.classId === cls.id && a.date === today);
      const absentToday = todayRec ? todayRec.records.filter(r => r.status === 'absent').length : 0;
      const warns = stus.filter(s => _behWarn(s).length > 0).map(s => s.name);
      return `• ${cls.name}${cls.subject?' ('+cls.subject+')':''}: ${stus.length} طالب، غائب اليوم: ${absentToday}${warns.length?'، تحذيرات سلوك: '+warns.join('، '):''}`;
    }).join('\n');

    const isFemTch = _T._f;
    const tchRef   = isFemTch ? 'قامت المعلمة' : 'قام المعلم';

    return `أنت مساعد تربوي ذكي تساعد ${_T.theTch} ${teacher.teacherName||''} في مدرسة ${teacher.school||''}، ${isFemTch?'مادتها':'مادته'} ${teacher.subject||''}.
البيانات الحالية (${today}):
${classInfo || 'لا توجد فصول مسجّلة بعد.'}

قواعد اللغة (مهم جداً):
- ${_T.theTch} جنسها ${isFemTch?'أنثى':'ذكر'}. عند الإشارة لها استخدم: "${tchRef}..".
- عند الكتابة عن طالب ذكر استخدم ضمائر المذكر: (مزاجه، تفاعله، حضوره، إحالته، سلوكه).
- عند الكتابة عن طالبة أنثى استخدم ضمائر المؤنث: (مزاجها، تفاعلها، حضورها، إحالتها، سلوكها).
- تحقق دائماً من جنس الطالب قبل استخدام الضمائر.
أجب باللغة العربية بأسلوب مهني وودّي. الردود مختصرة ومفيدة.`;
  },

  _addMsg(text, role) {
    const el = document.getElementById('ai-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.className = `ai-msg ${role}`;
    div.textContent = text;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
    return div;
  },

  _showChips(items) {
    const el = document.getElementById('ai-suggestions');
    if (!el) return;
    el.innerHTML = items.map(t =>
      `<button class="ai-chip" onclick="AI._chipClick(this)">${t}</button>`
    ).join('');
  },

  _chipClick(btn) {
    document.getElementById('ai-input').value = btn.textContent;
    document.getElementById('ai-suggestions').innerHTML = '';
    this.send();
  },

  async send() {
    if (this._busy) return;
    const input = document.getElementById('ai-input');
    const text  = input?.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = 'auto';
    this._addMsg(text, 'user');
    document.getElementById('ai-suggestions').innerHTML = '';

    this._history.push({ role: 'user', content: text });

    this._busy = true;
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = true;
    const status = document.getElementById('ai-status');
    if (status) status.textContent = 'يكتب...';

    const typing = this._addMsg('…', 'bot typing');

    try {
      const messages = [
        { role: 'system', content: this._buildContext() },
        ...this._history.slice(-10),
      ];
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai', messages })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '—';

      typing?.remove();
      this._addMsg(reply, 'bot');
      this._history.push({ role: 'assistant', content: reply });

      // contextual follow-up chips
      this._showChips(['سؤال آخر', 'ملخص الفصل', 'طلاب بسلوك سيء', 'نصائح للتحفيز']);
    } catch (err) {
      typing?.remove();
      this._addMsg('حدث خطأ في الاتصال. تأكد من اتصال الإنترنت وحاول مجدداً.', 'bot');
    } finally {
      this._busy = false;
      if (sendBtn) sendBtn.disabled = false;
      if (status) status.textContent = '';
    }
  },
};

/* ==================== NOTIFICATIONS ==================== */
const Notify = {
  _interval: null,

  async requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const res = await Notification.requestPermission();
    return res === 'granted';
  },

  _fire(title, body) {
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: 'icons/icon-192.png', lang: 'ar' });
  },

  _hhmm(str) {
    const [h, m] = (str || '').split(':').map(Number);
    return h * 60 + m;
  },

  _check() {
    const s = DB.settings();
    if (!s.notifyStart && !s.notifyEnd) return;
    const now   = new Date();
    const cur   = now.getHours() * 60 + now.getMinutes();
    const today = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][now.getDay()];
    const sched = DB.get('schedule').filter(x => x.day === today);
    if (!sched.length) return;

    const periods = s.periods || [];
    const classes = DB.get('classes');

    sched.forEach(entry => {
      const period = periods.find(p => p.p === entry.period);
      if (!period) return;
      const cls = classes.find(c => c.id === entry.classId);
      const name = cls ? `${cls.name}${entry.subject ? ' — ' + entry.subject : ''}` : 'حصة';

      const startMin = this._hhmm(period.s);
      const endMin   = this._hhmm(period.e);
      const beforeMin = s.notifyEndBefore ?? 5;

      if (s.notifyStart && cur === startMin) {
        this._fire(`🔔 بداية الحصة`, `${name} — الفترة ${entry.period}`);
      }
      if (s.notifyEnd && cur === endMin - beforeMin) {
        this._fire(`⏰ قرب انتهاء الحصة`, `${name} — تبقى ${beforeMin} دقائق`);
      }
    });
  },

  init() {
    const s = DB.settings();
    if (s.notifyStart || s.notifyEnd) {
      this.requestPermission();
      this._start();
    }
  },

  _start() {
    clearInterval(this._interval);
    this._interval = setInterval(() => this._check(), 60000);
  },

  stop() {
    clearInterval(this._interval);
    this._interval = null;
  },

  async toggle(key, val) {
    const s = DB.settings();
    s[key] = val;
    DB.saveSettings(s);
    if ((s.notifyStart || s.notifyEnd) && val) {
      const ok = await this.requestPermission();
      if (!ok) {
        Toast.show('يجب السماح بالإشعارات من إعدادات المتصفح', 'warn');
        return;
      }
      this._start();
    } else if (!s.notifyStart && !s.notifyEnd) {
      this.stop();
    }
  },
};

document.addEventListener('DOMContentLoaded', () => { FontSize.init(); App.init(); Notify.init(); });
