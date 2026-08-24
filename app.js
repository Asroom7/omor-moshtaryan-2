/* app.js — اپ مدیریت مشتری (CRM)
   بدون فریم‌ورک، مبتنی بر IndexedDB (idb.js) + مسیریابی هش + تقویم جلالی داخلی */

/* ========================================================================
   1) توابع تقویم جلالی (الگوریتم استاندارد تبدیل میلادی <-> جلالی)
   ======================================================================== */
const J = (() => {
  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function jalCal(jy) {
    const bl = breaks.length;
    let gy = jy + 621, leapJ = -14, jp = breaks[0], jump = 0, jm;
    if (jy < jp || jy >= breaks[bl - 1]) jy = 1404;
    for (let i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    let n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    let leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap === 0, gy, march };
  }

  function g2d(gy, gm, gd) {
    let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }
  function d2g(jdn) {
    let j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1;
    const gm = mod(div(i, 153), 12) + 1;
    const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy, gm, gd };
  }
  function j2d(jy, jm, jd) {
    const r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }
  function d2j(jdn) {
    const gy = d2g(jdn).gy;
    let jy = gy - 621;
    const r = jalCal(jy);
    const jdn1f = g2d(gy, 3, r.march);
    let k = jdn - jdn1f, jm, jd;
    if (k >= 0) {
      if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return { jy, jm, jd }; }
      k -= 186;
    } else { jy -= 1; k += 179; if (r.leap) k += 1; }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy, jm, jd };
  }
  function toJalaali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
  function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }
  function isLeapJYear(jy) { return jalCal(jy).leap; }
  function daysInJMonth(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isLeapJYear(jy) ? 30 : 29;
  }
  return { toJalaali, toGregorian, isLeapJYear, daysInJMonth };
})();

const MONTHS_FA = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const DOW_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isoToJalali(iso) {
  if (!iso) return null;
  const [gy, gm, gd] = iso.split('-').map(Number);
  return J.toJalaali(gy, gm, gd);
}
function jalaliToISO(jy, jm, jd) {
  const g = J.toGregorian(jy, jm, jd);
  return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
}
function faDigits(v) {
  const map = { '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹' };
  return String(v).replace(/[0-9]/g, (d) => map[d]);
}
function formatJalaliDisplay(iso, withWeekday) {
  if (!iso) return '';
  const j = isoToJalali(iso);
  const base = `${faDigits(j.jd)} ${MONTHS_FA[j.jm - 1]} ${faDigits(j.jy)}`;
  return base;
}
function isoAddDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function weekRangeISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const offset = (dt.getDay() + 1) % 7; // فاصله از شنبه
  const start = isoAddDays(iso, -offset);
  const end = isoAddDays(start, 6);
  return { start, end };
}
function monthRangeISO(iso) {
  const j = isoToJalali(iso);
  const start = jalaliToISO(j.jy, j.jm, 1);
  const end = jalaliToISO(j.jy, j.jm, J.daysInJMonth(j.jy, j.jm));
  return { start, end };
}

/* ========================================================================
   2) آیکن‌ها (SVG سبک خطی)
   ======================================================================== */
const ICONS = {
  home: '<path d="M3 11.5l9-8 9 8"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2"/><circle cx="17.5" cy="9" r="2.4"/><path d="M15.3 14c2.7.4 4.7 2.7 4.7 6"/>',
  cart: '<circle cx="9.5" cy="20.2" r="1.3"/><circle cx="17" cy="20.2" r="1.3"/><path d="M2.2 3h2.3l2.3 12.2a2 2 0 002 1.6h8.6a2 2 0 002-1.6L21 7.2H6.2"/>',
  chat: '<path d="M4 4.5h16v11.2H8.3L4.5 19V4.5z"/>',
  box: '<path d="M3 7.2l9-4 9 4-9 4-9-4z"/><path d="M3 7.2v9.8l9 4 9-4V7.2"/><path d="M12 11.2v9.8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 000-3l1.8-1.5-2-3.4-2.2.7a7.6 7.6 0 00-2.6-1.5L14 2.5h-4l-.4 2.3a7.6 7.6 0 00-2.6 1.5l-2.2-.7-2 3.4L4.6 10.5a7.6 7.6 0 000 3L2.8 15l2 3.4 2.2-.7c.8.7 1.7 1.2 2.6 1.5l.4 2.3h4l.4-2.3a7.6 7.6 0 002.6-1.5l2.2.7 2-3.4z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  filter: '<path d="M3.5 5h17M6.5 12h11M10 19h4"/>',
  dots: '<circle cx="12" cy="5.2" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18.8" r="1.4"/>',
  edit: '<path d="M11.5 20.5h9"/><path d="M16 3.5a2.1 2.1 0 013 3L7.5 18l-4 1 1-4L16 3.5z"/>',
  trash: '<path d="M3.5 6.5h17"/><path d="M8.5 6.5V4h7v2.5"/><path d="M18.5 6.5L17.6 20H6.4L5.5 6.5"/><path d="M10 11v6M14 11v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chevL: '<path d="M15 6l-6 6 6 6"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  phone: '<path d="M5 4.2l3.6-.9 1.7 4.3-1.9 1.9c.9 2.7 2.6 4.4 5.3 5.3l1.9-1.9 4.3 1.7-.9 3.6c-7 .9-13.9-6-13-13z"/>',
  pin: '<path d="M12 21s7-6.6 7-11.2A7 7 0 105 9.8C5 14.4 12 21 12 21z"/><circle cx="12" cy="9.6" r="2.3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.3v5l3.3 3"/>',
  download: '<path d="M12 3v12M7.2 10.2L12 15l4.8-4.8"/><path d="M5 21h14"/>',
  upload: '<path d="M12 21V9M7.2 13.8L12 9l4.8 4.8"/><path d="M5 3h14"/>',
  wipe: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.9 18a2 2 0 001.7 3h17a2 2 0 001.7-3L12.9 3.9a2 2 0 00-2.6 0z"/>',
  star: '<path d="M12 2.5l3 6.4 6.9.7-5.1 4.8 1.4 6.9-6.2-3.5-6.2 3.5 1.4-6.9-5.1-4.8 6.9-.7z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  package: '<path d="M3 7.2l9-4 9 4-9 4-9-4z"/><path d="M3 7.2v9.8l9 4 9-4V7.2"/>',
};
function ic(name, cls) { return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`; }

/* ========================================================================
   3) وضعیت برنامه
   ======================================================================== */
const STATUS_LIST = ['جدید', 'تماس گرفته شده', 'نیاز به پیگیری', 'خرید کرده', 'منصرف شده'];
const STATUS_BADGE = { 'جدید': 'st-new', 'تماس گرفته شده': 'st-called', 'نیاز به پیگیری': 'st-followup', 'خرید کرده': 'st-bought', 'منصرف شده': 'st-lost' };
const RESULT_LIST = ['رضایت بخش', 'ناامید کننده', 'قابل پیگیری', 'منجر به خرید'];
const SALE_TYPE_LIST = ['قسطی', 'نقدی', 'سایر'];

const state = {
  customers: [], products: [], sales: [], conversations: [],
  filters: {
    customers: { status: '', q: '', due: '', sort: '' },
    products: { sort: 'name', q: '' },
    sales: { type: '', q: '', when: '' },
    conversations: { result: '', q: '', when: '' },
  },
};

/* --- تنظیمات ظاهری/اعلان (ذخیره در localStorage دستگاه) --- */
const THEME_KEY = 'crm-theme';
const NOTIFY_KEY = 'crm-notify-enabled';
const NOTIFY_LAST_KEY = 'crm-notify-last-shown';

let _themeMem = 'light';
let _notifyMem = '0';
function safeGet(key, fallback) { try { return localStorage.getItem(key); } catch (e) { return key === THEME_KEY ? _themeMem : _notifyMem; } finally { /* noop */ } }
function safeSet(key, val) { try { localStorage.setItem(key, val); } catch (e) { if (key === THEME_KEY) _themeMem = val; if (key === NOTIFY_KEY) _notifyMem = val; } }
function getTheme() { return safeGet(THEME_KEY) || 'light'; }
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); safeSet(THEME_KEY, t); }
function isNotifyEnabled() { return safeGet(NOTIFY_KEY) === '1'; }

function byId(list, id) { return list.find((x) => x.id === id); }
function fmtId(prefix, id) { return `${prefix}-${faDigits(String(id).padStart(4, '0'))}`; }
function fmtPrice(n) { return `${faDigits(Number(n || 0).toLocaleString('en-US'))} تومان`; }
function slug(s) { return String(s).replace(/ /g, '_'); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function loadAll() {
  const [customers, products, sales, conversations] = await Promise.all([
    idb.getAll('customers'), idb.getAll('products'), idb.getAll('sales'), idb.getAll('conversations'),
  ]);
  state.customers = customers.sort((a, b) => b.id - a.id);
  state.products = products.sort((a, b) => b.id - a.id);
  state.sales = sales.sort((a, b) => b.id - a.id);
  state.conversations = conversations.sort((a, b) => b.id - a.id);
}

/* ========================================================================
   4) توست، مودال، منوی کشویی
   ======================================================================== */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function openModal(html) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.id = 'modalWrap';
  wrap.innerHTML = `<div class="scrim" data-close-modal></div><div class="modal">${html}</div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close-modal')) closeModal(); });
  return wrap;
}
function closeModal() {
  const el = document.getElementById('modalWrap');
  if (el) el.remove();
  Object.keys(JCalState).forEach((k) => delete JCalState[k]);
}

function openMenu(anchorEl, items) {
  closeMenu();
  const rect = anchorEl.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'dropdown-menu';
  menu.id = 'dropMenu';
  menu.innerHTML = items.map((it) => (it.sep ? '<hr/>' : `<button data-act="${it.key}" class="${it.danger ? 'danger' : ''}">${ic(it.icon)}<span>${it.label}</span></button>`)).join('');
  document.body.appendChild(menu);
  const top = Math.min(rect.bottom + 6, window.innerHeight - menu.offsetHeight - 90);
  const menuW = 178;
  let left = rect.left - menuW + rect.width;
  if (left < 8) left = 8;
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.id = 'menuScrim';
  scrim.style.background = 'transparent';
  scrim.style.backdropFilter = 'none';
  scrim.addEventListener('click', closeMenu);
  document.body.appendChild(scrim);
  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const item = items.find((i) => i.key === btn.dataset.act);
    closeMenu();
    if (item && item.onClick) item.onClick();
  });
}
function closeMenu() {
  const m = document.getElementById('dropMenu'); if (m) m.remove();
  const s = document.getElementById('menuScrim'); if (s) s.remove();
}
document.addEventListener('scroll', closeMenu, true);

function confirmDialog(title, desc, onYes) {
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">${esc(title)}</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.8;margin-bottom:6px;">${esc(desc)}</p>
    <div class="modal__actions">
      <button class="btn secondary block" data-close-modal>انصراف</button>
      <button class="btn danger block" id="confirmYesBtn">${ic('trash')}تایید حذف</button>
    </div>`;
  const wrap = openModal(html);
  wrap.querySelector('#confirmYesBtn').addEventListener('click', () => { closeModal(); onYes(); });
}

/* ========================================================================
   5) تقویم جلالی برای فرم‌ها
   ======================================================================== */
const JCalState = {};
function dateFieldHTML(fieldKey, isoValue, label, required) {
  return `
    <div class="field date-field" data-field="${fieldKey}">
      <label>${esc(label)}${required ? ' *' : ''}</label>
      <div class="date-input">
        <input type="text" id="disp-${fieldKey}" readonly placeholder="انتخاب تاریخ" value="${esc(formatJalaliDisplay(isoValue))}" data-role="date-toggle" data-field="${fieldKey}">
        <button type="button" class="icon-btn" data-role="date-toggle" data-field="${fieldKey}">${ic('calendar')}</button>
      </div>
      <div class="jcal-slot" id="jcal-${fieldKey}"></div>
    </div>`;
}
function buildJCalHTML(fieldKey, jy, jm, selectedIso) {
  const gStart = J.toGregorian(jy, jm, 1);
  const startDow = (new Date(gStart.gy, gStart.gm - 1, gStart.gd).getDay() + 1) % 7;
  const daysCount = J.daysInJMonth(jy, jm);
  const today = todayISO();
  let cells = '';
  for (let i = 0; i < startDow; i += 1) cells += '<button class="jcal__day" disabled></button>';
  for (let d = 1; d <= daysCount; d += 1) {
    const iso = jalaliToISO(jy, jm, d);
    const cls = ['jcal__day'];
    if (iso === today) cls.push('today');
    if (iso === selectedIso) cls.push('selected');
    cells += `<button type="button" class="${cls.join(' ')}" onclick="pickJCal('${fieldKey}','${iso}')">${faDigits(d)}</button>`;
  }
  return `
    <div class="jcal__head">
      <button type="button" onclick="navJCal('${fieldKey}',1)">${ic('chevR')}</button>
      <span class="jcal__title">${MONTHS_FA[jm - 1]} ${faDigits(jy)}</span>
      <button type="button" onclick="navJCal('${fieldKey}',-1)">${ic('chevL')}</button>
    </div>
    <div class="jcal__grid">
      ${DOW_FA.map((d) => `<div class="jcal__dow">${d}</div>`).join('')}
      ${cells}
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;">
      <button type="button" class="btn secondary block" style="padding:8px;font-size:12px;" onclick="pickJCal('${fieldKey}','${today}')">امروز</button>
      <button type="button" class="btn secondary block" style="padding:8px;font-size:12px;" onclick="clearJCal('${fieldKey}')">پاک کردن</button>
    </div>`;
}
window.pickJCal = function (fieldKey, iso) {
  const st = JCalState[fieldKey]; if (!st) return;
  st.formData[fieldKey] = iso;
  const disp = document.getElementById(`disp-${fieldKey}`);
  if (disp) disp.value = formatJalaliDisplay(iso);
  const slot = document.getElementById(`jcal-${fieldKey}`);
  if (slot) { slot.classList.remove('open'); slot.innerHTML = ''; }
};
window.clearJCal = function (fieldKey) {
  const st = JCalState[fieldKey]; if (!st) return;
  st.formData[fieldKey] = null;
  const disp = document.getElementById(`disp-${fieldKey}`);
  if (disp) disp.value = '';
  const slot = document.getElementById(`jcal-${fieldKey}`);
  if (slot) { slot.classList.remove('open'); slot.innerHTML = ''; }
};
window.navJCal = function (fieldKey, dir) {
  const st = JCalState[fieldKey]; if (!st) return;
  st.jm += dir;
  if (st.jm < 1) { st.jm = 12; st.jy -= 1; }
  if (st.jm > 12) { st.jm = 1; st.jy += 1; }
  const slot = document.getElementById(`jcal-${fieldKey}`);
  if (slot) slot.innerHTML = buildJCalHTML(fieldKey, st.jy, st.jm, st.formData[fieldKey]);
};
function initDateFields(container, formData) {
  container.querySelectorAll('[data-role="date-toggle"]').forEach((elm) => {
    elm.addEventListener('click', () => {
      const fieldKey = elm.dataset.field;
      const slot = document.getElementById(`jcal-${fieldKey}`);
      const isOpen = slot.classList.contains('open');
      container.querySelectorAll('.jcal-slot.open').forEach((s) => { s.classList.remove('open'); s.innerHTML = ''; });
      if (isOpen) return;
      let base = formData[fieldKey] ? isoToJalali(formData[fieldKey]) : isoToJalali(todayISO());
      JCalState[fieldKey] = { jy: base.jy, jm: base.jm, formData };
      slot.classList.add('open');
      slot.innerHTML = buildJCalHTML(fieldKey, base.jy, base.jm, formData[fieldKey]);
    });
  });
}

/* ========================================================================
   6) مسیریابی
   ======================================================================== */
const NAV_ITEMS = [
  { key: 'dashboard', label: 'داشبرد', icon: 'home' },
  { key: 'customers', label: 'مشتریان', icon: 'users' },
  { key: 'sales', label: 'فروش‌ها', icon: 'cart' },
  { key: 'conversations', label: 'گفتگوها', icon: 'chat' },
  { key: 'products', label: 'محصولات', icon: 'box' },
  { key: 'settings', label: 'تنظیمات', icon: 'gear' },
];

function parseRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'dashboard' };
  if (parts[0] === 'customer-detail') return { name: 'customer-detail', id: Number(parts[1]), tab: parts[2] || 'conversations' };
  if (parts[0] === 'product-detail') return { name: 'product-detail', id: Number(parts[1]) };
  return { name: parts[0] };
}

function renderNav(active) {
  const nav = document.getElementById('bottomNav');
  nav.innerHTML = NAV_ITEMS.map((it) => `
    <button class="nav-item ${active === it.key ? 'active' : ''}" data-nav="${it.key}">
      ${ic(it.icon)}
      <span>${it.label}</span>
    </button>`).join('');
  nav.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => { location.hash = `#/${btn.dataset.nav}`; });
  });
}

async function router() {
  closeMenu();
  const route = parseRoute();
  const topActive = route.name === 'customer-detail' ? 'customers' : route.name === 'product-detail' ? 'products' : route.name;
  renderNav(topActive);
  const view = document.getElementById('view');
  view.scrollTop = 0;
  if (route.name === 'dashboard') return renderDashboard(view);
  if (route.name === 'customers') return renderCustomers(view);
  if (route.name === 'products') return renderProducts(view);
  if (route.name === 'sales') return renderSales(view);
  if (route.name === 'conversations') return renderConversations(view);
  if (route.name === 'settings') return renderSettings(view);
  if (route.name === 'customer-detail') return renderCustomerDetail(view, route.id, route.tab);
  if (route.name === 'product-detail') return renderProductDetail(view, route.id);
  return renderDashboard(view);
}
window.addEventListener('hashchange', router);

/* ========================================================================
   7) داشبرد
   ======================================================================== */
function last7DaysISO() {
  const today = todayISO();
  const out = [];
  for (let i = 6; i >= 0; i -= 1) out.push(isoAddDays(today, -i));
  return out;
}
function weekdayShortFa(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const names = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
  return names[new Date(y, m - 1, d).getDay()];
}
function salesChartSVG() {
  const days = last7DaysISO();
  const counts = days.map((iso) => state.sales.filter((s) => s.date === iso).length);
  const max = Math.max(1, ...counts);
  const w = 300, h = 92, padB = 20, barGap = 8;
  const barW = (w - barGap * (days.length - 1)) / days.length;
  let bars = '';
  days.forEach((iso, i) => {
    const x = i * (barW + barGap);
    const barH = counts[i] === 0 ? 2 : Math.max(4, (counts[i] / max) * (h - padB - 10));
    const y = h - padB - barH;
    const isToday = iso === todayISO();
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${isToday ? 'var(--accent)' : 'var(--primary)'}" opacity="${isToday ? 1 : 0.75}"/>`;
    bars += `<text x="${x + barW / 2}" y="${h - 4}" text-anchor="middle" font-size="9" fill="var(--ink-faint)">${weekdayShortFa(iso)}</text>`;
    if (counts[i] > 0) bars += `<text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--ink-soft)">${faDigits(counts[i])}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:96px;">${bars}</svg>`;
}

function renderDashboard(view) {
  const today = todayISO();
  const week = weekRangeISO(today);
  const month = monthRangeISO(today);

  const followupsToday = state.customers.filter((c) => c.nextFollowUp === today).length;
  const followupsWeek = state.customers.filter((c) => c.nextFollowUp && c.nextFollowUp >= week.start && c.nextFollowUp <= week.end).length;
  const newCustomersMonth = state.customers.filter((c) => c.createdAt && c.createdAt >= month.start && c.createdAt <= month.end).length;
  const convToday = state.conversations.filter((c) => c.date === today).length;
  const salesWeekOk = state.sales.filter((s) => s.date >= week.start && s.date <= week.end).length;

  const salesByProduct = {};
  state.sales.forEach((s) => { salesByProduct[s.productId] = (salesByProduct[s.productId] || 0) + 1; });
  const topProducts = Object.entries(salesByProduct)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([pid, count]) => ({ product: byId(state.products, Number(pid)), count }))
    .filter((x) => x.product);

  view.innerHTML = `
    <div class="section-title">${ic('spark')} نمای کلی</div>
    <div class="dash-grid">
      <div class="dash-card c-amber" data-go="followup-today" role="button" tabindex="0">
        <div class="dash-card__icon">${ic('clock')}</div>
        <div><div class="dash-card__value">${faDigits(followupsToday)}</div><div class="dash-card__label">پیگیری‌های امروز</div></div>
      </div>
      <div class="dash-card c-amber" data-go="followup-week" role="button" tabindex="0">
        <div class="dash-card__icon">${ic('calendar')}</div>
        <div><div class="dash-card__value">${faDigits(followupsWeek)}</div><div class="dash-card__label">پیگیری‌های این هفته</div></div>
      </div>
      <div class="dash-card c-teal" data-go="new-month" role="button" tabindex="0">
        <div class="dash-card__icon">${ic('users')}</div>
        <div><div class="dash-card__value">${faDigits(newCustomersMonth)}</div><div class="dash-card__label">مشتری جدید این ماه</div></div>
      </div>
      <div class="dash-card c-blue" data-go="conv-today" role="button" tabindex="0">
        <div class="dash-card__icon">${ic('chat')}</div>
        <div><div class="dash-card__value">${faDigits(convToday)}</div><div class="dash-card__label">گفتگوهای امروز</div></div>
      </div>
      <div class="dash-card c-green dash-card--wide" data-go="sales-week" role="button" tabindex="0">
        <div class="dash-card__icon">${ic('target')}</div>
        <div><div class="dash-card__value">${faDigits(salesWeekOk)}</div><div class="dash-card__label">فروش موفق این هفته</div></div>
      </div>
    </div>

    <div class="section-title">${ic('spark')} روند فروش ۷ روز اخیر</div>
    <div class="chart-card">${salesChartSVG()}</div>

    <div class="section-title">${ic('star')} محصولات پرفروش</div>
    <div class="top-products">
      ${topProducts.length ? topProducts.map((tp, i) => `
        <button class="top-product-row" data-product="${tp.product.id}">
          <span class="top-product-row__rank">${faDigits(i + 1)}</span>
          <span class="top-product-row__name">${esc(tp.product.name)}</span>
          <span class="top-product-row__count">${faDigits(tp.count)} فروش</span>
          ${ic('chevL')}
        </button>`).join('') : `<div class="empty-state" style="padding:26px;"><div class="empty-state__desc">هنوز فروشی ثبت نشده است</div></div>`}
    </div>
    <div style="height:6px;"></div>
  `;

  view.querySelectorAll('[data-go]').forEach((card) => {
    card.addEventListener('click', () => goDashboardShortcut(card.dataset.go));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') goDashboardShortcut(card.dataset.go); });
  });
  view.querySelectorAll('[data-product]').forEach((row) => {
    row.addEventListener('click', () => { location.hash = `#/product-detail/${row.dataset.product}`; });
  });
}

function goDashboardShortcut(key) {
  if (key === 'followup-today') { Object.assign(state.filters.customers, { status: '', q: '', due: 'today', sort: 'followup' }); location.hash = '#/customers'; }
  if (key === 'followup-week') { Object.assign(state.filters.customers, { status: '', q: '', due: 'week', sort: 'followup' }); location.hash = '#/customers'; }
  if (key === 'new-month') { Object.assign(state.filters.customers, { status: '', q: '', due: '', sort: 'newest' }); location.hash = '#/customers'; }
  if (key === 'conv-today') { Object.assign(state.filters.conversations, { result: '', q: '', when: 'today' }); location.hash = '#/conversations'; }
  if (key === 'sales-week') { Object.assign(state.filters.sales, { type: '', q: '', when: 'week' }); location.hash = '#/sales'; }
}

/* ========================================================================
   8) مشتریان
   ======================================================================== */
function customerFullName(c) { return `${c.firstName || ''} ${c.lastName || ''}`.trim(); }

function renderCustomers(view) {
  const f = state.filters.customers;
  let list = state.customers.slice();
  if (f.status) list = list.filter((c) => c.status === f.status);
  if (f.due === 'today') { const t = todayISO(); list = list.filter((c) => c.nextFollowUp === t); }
  if (f.due === 'week') { const w = weekRangeISO(todayISO()); list = list.filter((c) => c.nextFollowUp && c.nextFollowUp >= w.start && c.nextFollowUp <= w.end); }
  if (f.q) {
    const q = f.q.trim();
    list = list.filter((c) => customerFullName(c).includes(q) || (c.phone || '').includes(q));
  }
  if (f.sort === 'followup') {
    list.sort((a, b) => {
      if (!a.nextFollowUp && !b.nextFollowUp) return 0;
      if (!a.nextFollowUp) return 1;
      if (!b.nextFollowUp) return -1;
      return a.nextFollowUp.localeCompare(b.nextFollowUp);
    });
  } else if (f.sort === 'name') {
    list.sort((a, b) => customerFullName(a).localeCompare(customerFullName(b), 'fa'));
  }
  const activeFilterCount = (f.status ? 1 : 0) + (f.due ? 1 : 0) + (f.sort ? 1 : 0);
  view.innerHTML = `
    <div class="toolbar">
      <div class="search-box">${ic('search')}<input id="custSearch" placeholder="جستجوی نام یا شماره تماس" value="${esc(f.q)}"></div>
      <button class="icon-btn ${activeFilterCount ? 'active' : ''}" id="custFilterBtn">${ic('filter')}${activeFilterCount ? '<span class="icon-btn__dot"></span>' : ''}</button>
      <button class="icon-btn primary-fill" id="custAddBtn">${ic('plus')}</button>
    </div>
    <div class="list" id="custList"></div>
  `;
  renderCustomerList(list);
  document.getElementById('custSearch').addEventListener('input', (e) => { f.q = e.target.value; renderCustomers(view); });
  document.getElementById('custAddBtn').addEventListener('click', () => openCustomerForm());
  document.getElementById('custFilterBtn').addEventListener('click', (e) => openCustomerFilterSheet(view));
}

function renderCustomerList(list) {
  const el = document.getElementById('custList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="empty-state">${ic('users')}<div class="empty-state__title">مشتری‌ای یافت نشد</div><div class="empty-state__desc">با دکمه + یک مشتری جدید اضافه کنید</div></div>`;
    return;
  }
  el.innerHTML = list.map((c) => `
    <div class="rec-card status-${slug(c.status)}" data-id="${c.id}">
      <div class="rec-card__body">
        <div class="rec-card__top">
          <span class="rec-card__title">${esc(customerFullName(c)) || 'بدون‌نام'}</span>
          <span class="badge ${STATUS_BADGE[c.status] || 'st-new'}">${esc(c.status || 'جدید')}</span>
        </div>
        <div class="rec-card__id">${fmtId('C', c.id)}</div>
        <div class="rec-card__meta">
          ${c.phone ? `<a class="tel-link" href="tel:${esc(c.phone)}" onclick="event.stopPropagation()">${ic('phone')}${esc(c.phone)}</a>` : ''}
          ${c.nextFollowUp ? `<span>${ic('calendar')}پیگیری: ${formatJalaliDisplay(c.nextFollowUp)}</span>` : ''}
        </div>
        ${c.description ? `<div class="rec-card__desc">${esc(c.description)}</div>` : ''}
      </div>
      <button class="menu-btn" data-menu="${c.id}">${ic('dots')}</button>
    </div>`).join('');

  el.querySelectorAll('[data-menu]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.menu);
      openMenu(btn, [
        { key: 'edit', label: 'ویرایش', icon: 'edit', onClick: () => openCustomerForm(id) },
        { key: 'conv', label: 'لیست گفتگوها', icon: 'chat', onClick: () => { location.hash = `#/customer-detail/${id}/conversations`; } },
        { key: 'sales', label: 'لیست خریدها', icon: 'cart', onClick: () => { location.hash = `#/customer-detail/${id}/sales`; } },
        { sep: true },
        { key: 'del', label: 'حذف مشتری', icon: 'trash', danger: true, onClick: () => deleteCustomer(id) },
      ]);
    });
  });
}

function openCustomerFilterSheet(view) {
  const f = state.filters.customers;
  const dueOpts = [['', 'همه'], ['today', 'پیگیری امروز'], ['week', 'پیگیری این هفته']];
  const sortOpts = [['', 'جدیدترین'], ['followup', 'نزدیک‌ترین پیگیری'], ['name', 'الفبا']];
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">فیلتر و مرتب‌سازی مشتریان</h3>
    <div class="field"><label>وضعیت</label></div>
    <div class="filter-chips" id="statusChips">
      <button class="chip ${!f.status ? 'active' : ''}" data-v="">همه</button>
      ${STATUS_LIST.map((s) => `<button class="chip ${f.status === s ? 'active' : ''}" data-v="${esc(s)}">${esc(s)}</button>`).join('')}
    </div>
    <div class="field" style="margin-top:14px;"><label>زمان پیگیری</label></div>
    <div class="filter-chips" id="dueChips">
      ${dueOpts.map(([v, l]) => `<button class="chip ${f.due === v ? 'active' : ''}" data-v="${v}">${l}</button>`).join('')}
    </div>
    <div class="field" style="margin-top:14px;"><label>مرتب‌سازی</label></div>
    <div class="filter-chips" id="sortChips2">
      ${sortOpts.map(([v, l]) => `<button class="chip ${f.sort === v ? 'active' : ''}" data-v="${v}">${l}</button>`).join('')}
    </div>
    <div class="modal__actions"><button class="btn primary block" data-close-modal>اعمال</button></div>`;
  const wrap = openModal(html);
  wrap.querySelectorAll('#statusChips .chip').forEach((chip) => chip.addEventListener('click', () => { f.status = chip.dataset.v; renderCustomers(view); openCustomerFilterSheet(view); }));
  wrap.querySelectorAll('#dueChips .chip').forEach((chip) => chip.addEventListener('click', () => { f.due = chip.dataset.v; renderCustomers(view); openCustomerFilterSheet(view); }));
  wrap.querySelectorAll('#sortChips2 .chip').forEach((chip) => chip.addEventListener('click', () => { f.sort = chip.dataset.v; renderCustomers(view); openCustomerFilterSheet(view); }));
}

function openCustomerForm(id) {
  const rec = id ? byId(state.customers, id) : null;
  const formData = rec ? { ...rec } : { firstName: '', lastName: '', phone: '', address: '', lastContact: null, nextFollowUp: null, status: 'جدید', description: '' };
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">${rec ? 'ویرایش مشتری' : 'مشتری جدید'}</h3>
    <form id="custForm">
      <div class="field-row">
        <div class="field"><label>نام *</label><input name="firstName" required value="${esc(formData.firstName)}"></div>
        <div class="field"><label>نام خانوادگی *</label><input name="lastName" required value="${esc(formData.lastName)}"></div>
      </div>
      <div class="field"><label>شماره تماس</label><input name="phone" inputmode="tel" value="${esc(formData.phone)}"></div>
      <div class="field"><label>آدرس</label><textarea name="address">${esc(formData.address)}</textarea></div>
      <div class="field-row">
        ${dateFieldHTML('lastContact', formData.lastContact, 'آخرین تماس')}
        ${dateFieldHTML('nextFollowUp', formData.nextFollowUp, 'پیگیری بعدی')}
      </div>
      <div class="field"><label>وضعیت</label>
        <select name="status">${STATUS_LIST.map((s) => `<option value="${esc(s)}" ${formData.status === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>توضیحات</label><textarea name="description">${esc(formData.description)}</textarea></div>
      <div class="modal__actions">
        <button type="button" class="btn secondary block" data-close-modal>انصراف</button>
        <button type="submit" class="btn primary block">${ic('check')}ذخیره</button>
      </div>
    </form>`;
  const wrap = openModal(html);
  const form = wrap.querySelector('#custForm');
  initDateFields(wrap, formData);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      firstName: fd.get('firstName').trim(), lastName: fd.get('lastName').trim(),
      phone: fd.get('phone').trim(), address: fd.get('address').trim(),
      status: fd.get('status'), description: fd.get('description').trim(),
      lastContact: formData.lastContact || null, nextFollowUp: formData.nextFollowUp || null,
      createdAt: rec ? rec.createdAt : todayISO(),
    };
    const doSave = async () => {
      if (rec) { payload.id = rec.id; await idb.put('customers', payload); toast('مشتری ویرایش شد'); }
      else { await idb.add('customers', payload); toast('مشتری اضافه شد'); }
      await loadAll();
      closeModal();
      router();
    };
    if (payload.phone) {
      const dup = state.customers.find((c) => c.phone === payload.phone && (!rec || c.id !== rec.id));
      if (dup) {
        closeModal();
        confirmDialogGeneric(
          'شماره تماس تکراری است',
          `این شماره قبلاً برای «${customerFullName(dup)}» ثبت شده. آیا مطمئنید می‌خواهید ادامه دهید؟`,
          'ثبت با همین شماره',
          async () => { await doSave(); },
          () => { openCustomerForm(id); },
        );
        return;
      }
    }
    await doSave();
  });
}

function confirmDialogGeneric(title, desc, yesLabel, onYes, onCancel) {
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">${esc(title)}</h3>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.8;margin-bottom:6px;">${esc(desc)}</p>
    <div class="modal__actions">
      <button class="btn secondary block" id="genCancelBtn">بازگشت و اصلاح</button>
      <button class="btn primary block" id="genYesBtn">${ic('check')}${esc(yesLabel)}</button>
    </div>`;
  const wrap = openModal(html);
  wrap.querySelector('#genYesBtn').addEventListener('click', () => { closeModal(); onYes(); });
  wrap.querySelector('#genCancelBtn').addEventListener('click', () => { closeModal(); if (onCancel) onCancel(); });
}

async function deleteCustomer(id) {
  const c = byId(state.customers, id);
  confirmDialog('حذف مشتری', `«${customerFullName(c)}» و تمام گفتگوها/فروش‌های مرتبط حذف خواهد شد.`, async () => {
    const convs = await idb.getByIndex('conversations', 'customerId', id);
    const sales = await idb.getByIndex('sales', 'customerId', id);
    await Promise.all([...convs.map((x) => idb.delete('conversations', x.id)), ...sales.map((x) => idb.delete('sales', x.id))]);
    await idb.delete('customers', id);
    await loadAll();
    toast('مشتری حذف شد');
    router();
  });
}

function renderCustomerDetail(view, id, tab) {
  const c = byId(state.customers, id);
  if (!c) { location.hash = '#/customers'; return; }
  const convs = state.conversations.filter((x) => x.customerId === id);
  const sales = state.sales.filter((x) => x.customerId === id);
  view.innerHTML = `
    <div class="detail-header">
      <button class="back-btn" id="backBtn">${ic('chevR')}</button>
      <div>
        <h3 style="font-size:15.5px;">${esc(customerFullName(c))}</h3>
        <div style="font-size:11.5px;color:var(--ink-soft);">${fmtId('C', c.id)} · ${esc(c.phone || 'بدون شماره')}</div>
      </div>
    </div>
    <div class="tabs">
      <button data-tab="conversations" class="${tab === 'conversations' ? 'active' : ''}">گفتگوها (${faDigits(convs.length)})</button>
      <button data-tab="sales" class="${tab === 'sales' ? 'active' : ''}">خریدها (${faDigits(sales.length)})</button>
    </div>
    <div id="detailList"></div>
  `;
  document.getElementById('backBtn').addEventListener('click', () => { location.hash = '#/customers'; });
  view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { location.hash = `#/customer-detail/${id}/${b.dataset.tab}`; }));

  const listEl = document.createElement('div');
  listEl.className = 'list';
  listEl.id = 'detailListInner';
  document.getElementById('detailList').appendChild(listEl);

  if (tab === 'sales') {
    renderSaleCards(listEl, sales, { hideCustomer: true });
    const fab = addFab(() => openSaleForm(null, { customerId: id }));
    view.appendChild(fab);
  } else {
    renderConversationCards(listEl, convs, { hideCustomer: true });
    const fab = addFab(() => openConversationForm(null, { customerId: id }));
    view.appendChild(fab);
  }
}

function addFab(onClick) {
  const btn = document.createElement('button');
  btn.className = 'fab';
  btn.innerHTML = ic('plus');
  btn.addEventListener('click', onClick);
  return btn;
}

/* ========================================================================
   9) محصولات
   ======================================================================== */
function renderProducts(view) {
  const f = state.filters.products;
  let list = state.products.slice();
  if (f.q) list = list.filter((p) => p.name.includes(f.q));
  if (f.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  if (f.sort === 'price-asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
  if (f.sort === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));

  view.innerHTML = `
    <div class="toolbar">
      <div class="search-box">${ic('search')}<input id="prodSearch" placeholder="جستجوی نام محصول" value="${esc(f.q)}"></div>
      <button class="icon-btn ${f.sort !== 'name' ? 'active' : ''}" id="prodFilterBtn">${ic('filter')}</button>
      <button class="icon-btn primary-fill" id="prodAddBtn">${ic('plus')}</button>
    </div>
    <div class="list" id="prodList"></div>`;
  renderProductList(list);
  document.getElementById('prodSearch').addEventListener('input', (e) => { f.q = e.target.value; renderProducts(view); });
  document.getElementById('prodAddBtn').addEventListener('click', () => openProductForm());
  document.getElementById('prodFilterBtn').addEventListener('click', () => openProductFilterSheet(view));
}

function renderProductList(list) {
  const el = document.getElementById('prodList');
  if (!list.length) { el.innerHTML = `<div class="empty-state">${ic('box')}<div class="empty-state__title">محصولی یافت نشد</div><div class="empty-state__desc">با دکمه + یک محصول جدید اضافه کنید</div></div>`; return; }
  el.innerHTML = list.map((p) => `
    <div class="rec-card" style="border-right-color:var(--primary);" data-id="${p.id}">
      <div class="rec-card__body">
        <div class="rec-card__top"><span class="rec-card__title">${esc(p.name)}</span></div>
        <div class="rec-card__id">${fmtId('P', p.id)}</div>
        <div class="rec-card__meta"><span>${fmtPrice(p.price)}</span></div>
        ${p.specs ? `<div class="rec-card__desc">${esc(p.specs)}</div>` : ''}
      </div>
      <button class="menu-btn" data-menu="${p.id}">${ic('dots')}</button>
    </div>`).join('');
  el.querySelectorAll('[data-menu]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.menu);
      openMenu(btn, [
        { key: 'edit', label: 'ویرایش', icon: 'edit', onClick: () => openProductForm(id) },
        { key: 'sales', label: 'لیست فروش‌ها', icon: 'cart', onClick: () => { location.hash = `#/product-detail/${id}`; } },
        { sep: true },
        { key: 'del', label: 'حذف محصول', icon: 'trash', danger: true, onClick: () => deleteProduct(id) },
      ]);
    });
  });
}

function openProductFilterSheet(view) {
  const f = state.filters.products;
  const opts = [['name', 'نام (الفبا)'], ['price-asc', 'قیمت: کم به زیاد'], ['price-desc', 'قیمت: زیاد به کم']];
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">مرتب‌سازی محصولات</h3>
    <div class="filter-chips" id="sortChips">${opts.map(([v, l]) => `<button class="chip ${f.sort === v ? 'active' : ''}" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="modal__actions"><button class="btn primary block" data-close-modal>اعمال</button></div>`;
  const wrap = openModal(html);
  wrap.querySelectorAll('#sortChips .chip').forEach((chip) => chip.addEventListener('click', () => { f.sort = chip.dataset.v; renderProducts(view); openProductFilterSheet(view); }));
}

function openProductForm(id) {
  const rec = id ? byId(state.products, id) : null;
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">${rec ? 'ویرایش محصول' : 'محصول جدید'}</h3>
    <form id="prodForm">
      <div class="field"><label>نام محصول *</label><input name="name" required value="${esc(rec ? rec.name : '')}"></div>
      <div class="field"><label>مشخصات محصول</label><textarea name="specs">${esc(rec ? rec.specs : '')}</textarea></div>
      <div class="field"><label>قیمت محصول (تومان) *</label><input name="price" type="number" min="0" required value="${rec ? rec.price : ''}"></div>
      <div class="field"><label>توضیحات</label><textarea name="description">${esc(rec ? rec.description : '')}</textarea></div>
      <div class="modal__actions">
        <button type="button" class="btn secondary block" data-close-modal>انصراف</button>
        <button type="submit" class="btn primary block">${ic('check')}ذخیره</button>
      </div>
    </form>`;
  const wrap = openModal(html);
  wrap.querySelector('#prodForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = { name: fd.get('name').trim(), specs: fd.get('specs').trim(), price: Number(fd.get('price')) || 0, description: fd.get('description').trim() };
    if (rec) { payload.id = rec.id; await idb.put('products', payload); toast('محصول ویرایش شد'); }
    else { await idb.add('products', payload); toast('محصول اضافه شد'); }
    await loadAll(); closeModal(); router();
  });
}

async function deleteProduct(id) {
  const p = byId(state.products, id);
  confirmDialog('حذف محصول', `«${p.name}» حذف خواهد شد. فروش‌های ثبت‌شده برای این محصول حذف نمی‌شوند اما دیگر به محصولی متصل نخواهند بود.`, async () => {
    await idb.delete('products', id);
    await loadAll(); toast('محصول حذف شد'); router();
  });
}

function renderProductDetail(view, id) {
  const p = byId(state.products, id);
  if (!p) { location.hash = '#/products'; return; }
  const sales = state.sales.filter((s) => s.productId === id);
  view.innerHTML = `
    <div class="detail-header">
      <button class="back-btn" id="backBtn">${ic('chevR')}</button>
      <div><h3 style="font-size:15.5px;">${esc(p.name)}</h3><div style="font-size:11.5px;color:var(--ink-soft);">${fmtId('P', p.id)} · ${fmtPrice(p.price)}</div></div>
    </div>
    <div class="section-title">${ic('cart')} فروش‌های این محصول (${faDigits(sales.length)})</div>
    <div class="list" id="detailListInner"></div>`;
  document.getElementById('backBtn').addEventListener('click', () => { location.hash = '#/products'; });
  renderSaleCards(document.getElementById('detailListInner'), sales, { hideProduct: true });
  view.appendChild(addFab(() => openSaleForm(null, { productId: id })));
}

/* ========================================================================
   10) فروش‌ها
   ======================================================================== */
function renderSales(view) {
  const f = state.filters.sales;
  let list = state.sales.slice();
  if (f.type) list = list.filter((s) => s.saleType === f.type);
  if (f.when === 'today') { const t = todayISO(); list = list.filter((s) => s.date === t); }
  if (f.when === 'week') { const w = weekRangeISO(todayISO()); list = list.filter((s) => s.date >= w.start && s.date <= w.end); }
  if (f.q) {
    const q = f.q.trim();
    list = list.filter((s) => {
      const c = byId(state.customers, s.customerId); const p = byId(state.products, s.productId);
      return (c && customerFullName(c).includes(q)) || (p && p.name.includes(q));
    });
  }
  const activeCount = (f.type ? 1 : 0) + (f.when ? 1 : 0);
  view.innerHTML = `
    <div class="toolbar">
      <div class="search-box">${ic('search')}<input id="saleSearch" placeholder="جستجوی مشتری یا محصول" value="${esc(f.q)}"></div>
      <button class="icon-btn ${activeCount ? 'active' : ''}" id="saleFilterBtn">${ic('filter')}${activeCount ? '<span class="icon-btn__dot"></span>' : ''}</button>
      <button class="icon-btn primary-fill" id="saleAddBtn">${ic('plus')}</button>
    </div>
    ${f.when ? `<div class="quick-banner"><span>${ic('filter')}${f.when === 'today' ? 'فروش‌های امروز' : 'فروش‌های این هفته'}</span><button id="clearWhenBtn">${ic('x')}پاک کردن</button></div>` : ''}
    <div class="list" id="saleList"></div>`;
  renderSaleCards(document.getElementById('saleList'), list);
  document.getElementById('saleSearch').addEventListener('input', (e) => { f.q = e.target.value; renderSales(view); });
  document.getElementById('saleAddBtn').addEventListener('click', () => openSaleForm());
  document.getElementById('saleFilterBtn').addEventListener('click', () => openSaleFilterSheet(view));
  const clearBtn = document.getElementById('clearWhenBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => { f.when = ''; renderSales(view); });
}

function openSaleFilterSheet(view) {
  const f = state.filters.sales;
  const whenOpts = [['', 'همه'], ['today', 'امروز'], ['week', 'این هفته']];
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">فیلتر فروش‌ها</h3>
    <div class="field"><label>بازه‌ی زمانی</label></div>
    <div class="filter-chips" id="whenChips">${whenOpts.map(([v, l]) => `<button class="chip ${f.when === v ? 'active' : ''}" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="field" style="margin-top:14px;"><label>نوع فروش</label></div>
    <div class="filter-chips" id="typeChips">
      <button class="chip ${!f.type ? 'active' : ''}" data-v="">همه</button>
      ${SALE_TYPE_LIST.map((s) => `<button class="chip ${f.type === s ? 'active' : ''}" data-v="${esc(s)}">${esc(s)}</button>`).join('')}
    </div>
    <div class="modal__actions"><button class="btn primary block" data-close-modal>اعمال</button></div>`;
  const wrap = openModal(html);
  wrap.querySelectorAll('#whenChips .chip').forEach((chip) => chip.addEventListener('click', () => { f.when = chip.dataset.v; renderSales(view); openSaleFilterSheet(view); }));
  wrap.querySelectorAll('#typeChips .chip').forEach((chip) => chip.addEventListener('click', () => { f.type = chip.dataset.v; renderSales(view); openSaleFilterSheet(view); }));
}

function renderSaleCards(el, list, opts = {}) {
  if (!list.length) { el.innerHTML = `<div class="empty-state">${ic('cart')}<div class="empty-state__title">فروشی ثبت نشده</div></div>`; return; }
  el.innerHTML = list.map((s) => {
    const c = byId(state.customers, s.customerId); const p = byId(state.products, s.productId);
    return `
    <div class="rec-card" style="border-right-color:var(--success);" data-id="${s.id}">
      <div class="rec-card__body">
        <div class="rec-card__top">
          <span class="rec-card__title">${!opts.hideProduct && p ? esc(p.name) : (!opts.hideCustomer && c ? esc(customerFullName(c)) : fmtId('S', s.id))}</span>
          <span class="badge st-bought">${esc(s.saleType || 'نقدی')}</span>
        </div>
        <div class="rec-card__id">${fmtId('S', s.id)} · ${formatJalaliDisplay(s.date)}</div>
        <div class="rec-card__meta">
          ${!opts.hideCustomer && c ? `<span>${ic('users')}${esc(customerFullName(c))}</span>` : ''}
          ${!opts.hideProduct && p ? `<span>${ic('box')}${esc(p.name)}</span>` : ''}
          <span>${fmtPrice(s.price)}</span>
        </div>
        ${s.description ? `<div class="rec-card__desc">${esc(s.description)}</div>` : ''}
      </div>
      <button class="menu-btn" data-menu="${s.id}">${ic('dots')}</button>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-menu]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.menu);
      openMenu(btn, [
        { key: 'edit', label: 'ویرایش', icon: 'edit', onClick: () => openSaleForm(id) },
        { sep: true },
        { key: 'del', label: 'حذف فروش', icon: 'trash', danger: true, onClick: () => deleteSale(id) },
      ]);
    });
  });
}

function customerProductSelectOptions(selectedCustomerId, selectedProductId) {
  const custOpts = state.customers.map((c) => `<option value="${c.id}" ${selectedCustomerId === c.id ? 'selected' : ''}>${esc(customerFullName(c))}</option>`).join('');
  const prodOpts = state.products.map((p) => `<option value="${p.id}" ${selectedProductId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  return { custOpts, prodOpts };
}

function openSaleForm(id, presets = {}) {
  const rec = id ? byId(state.sales, id) : null;
  const formData = rec ? { ...rec } : { date: todayISO(), customerId: presets.customerId || null, productId: presets.productId || null, price: '', saleType: 'نقدی', description: '' };
  const { custOpts, prodOpts } = customerProductSelectOptions(formData.customerId, formData.productId);
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">${rec ? 'ویرایش فروش' : 'ثبت فروش جدید'}</h3>
    <form id="saleForm">
      ${dateFieldHTML('date', formData.date, 'تاریخ فروش', true)}
      <div class="field"><label>مشتری *</label><select name="customerId" required>${!formData.customerId ? '<option value="">انتخاب کنید</option>' : ''}${custOpts}</select></div>
      <div class="field"><label>محصول *</label><select name="productId" required>${!formData.productId ? '<option value="">انتخاب کنید</option>' : ''}${prodOpts}</select></div>
      <div class="field-row">
        <div class="field"><label>قیمت فروش (تومان) *</label><input name="price" type="number" min="0" required value="${formData.price}"></div>
        <div class="field"><label>نوع فروش</label><select name="saleType">${SALE_TYPE_LIST.map((s) => `<option ${formData.saleType === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>توضیحات</label><textarea name="description">${esc(formData.description)}</textarea></div>
      <div class="modal__actions">
        <button type="button" class="btn secondary block" data-close-modal>انصراف</button>
        <button type="submit" class="btn primary block">${ic('check')}ذخیره</button>
      </div>
    </form>`;
  const wrap = openModal(html);
  initDateFields(wrap, formData);
  wrap.querySelector('#saleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      date: formData.date || todayISO(), customerId: Number(fd.get('customerId')), productId: Number(fd.get('productId')),
      price: Number(fd.get('price')) || 0, saleType: fd.get('saleType'), description: fd.get('description').trim(),
    };
    if (rec) { payload.id = rec.id; await idb.put('sales', payload); toast('فروش ویرایش شد'); }
    else { await idb.add('sales', payload); toast('فروش ثبت شد'); }
    await loadAll(); closeModal(); router();
  });
}

async function deleteSale(id) {
  confirmDialog('حذف فروش', 'این رکورد فروش برای همیشه حذف خواهد شد.', async () => {
    await idb.delete('sales', id); await loadAll(); toast('فروش حذف شد'); router();
  });
}

/* ========================================================================
   11) گفتگوها
   ======================================================================== */
function renderConversations(view) {
  const f = state.filters.conversations;
  let list = state.conversations.slice();
  if (f.result) list = list.filter((c) => c.result === f.result);
  if (f.when === 'today') { const t = todayISO(); list = list.filter((c) => c.date === t); }
  if (f.when === 'week') { const w = weekRangeISO(todayISO()); list = list.filter((c) => c.date >= w.start && c.date <= w.end); }
  if (f.q) {
    const q = f.q.trim();
    list = list.filter((c) => {
      const cu = byId(state.customers, c.customerId);
      return (cu && customerFullName(cu).includes(q)) || (c.text || '').includes(q);
    });
  }
  const activeCount = (f.result ? 1 : 0) + (f.when ? 1 : 0);
  view.innerHTML = `
    <div class="toolbar">
      <div class="search-box">${ic('search')}<input id="convSearch" placeholder="جستجوی مشتری یا متن گفتگو" value="${esc(f.q)}"></div>
      <button class="icon-btn ${activeCount ? 'active' : ''}" id="convFilterBtn">${ic('filter')}${activeCount ? '<span class="icon-btn__dot"></span>' : ''}</button>
      <button class="icon-btn primary-fill" id="convAddBtn">${ic('plus')}</button>
    </div>
    ${f.when ? `<div class="quick-banner"><span>${ic('filter')}${f.when === 'today' ? 'گفتگوهای امروز' : 'گفتگوهای این هفته'}</span><button id="clearWhenBtn">${ic('x')}پاک کردن</button></div>` : ''}
    <div class="list" id="convList"></div>`;
  renderConversationCards(document.getElementById('convList'), list);
  document.getElementById('convSearch').addEventListener('input', (e) => { f.q = e.target.value; renderConversations(view); });
  document.getElementById('convAddBtn').addEventListener('click', () => openConversationForm());
  document.getElementById('convFilterBtn').addEventListener('click', () => openConvFilterSheet(view));
  const clearBtn = document.getElementById('clearWhenBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => { f.when = ''; renderConversations(view); });
}

function openConvFilterSheet(view) {
  const f = state.filters.conversations;
  const whenOpts = [['', 'همه'], ['today', 'امروز'], ['week', 'این هفته']];
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">فیلتر گفتگوها</h3>
    <div class="field"><label>بازه‌ی زمانی</label></div>
    <div class="filter-chips" id="whenChips">${whenOpts.map(([v, l]) => `<button class="chip ${f.when === v ? 'active' : ''}" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="field" style="margin-top:14px;"><label>نتیجه گفتگو</label></div>
    <div class="filter-chips" id="resChips">
      <button class="chip ${!f.result ? 'active' : ''}" data-v="">همه</button>
      ${RESULT_LIST.map((s) => `<button class="chip ${f.result === s ? 'active' : ''}" data-v="${esc(s)}">${esc(s)}</button>`).join('')}
    </div>
    <div class="modal__actions"><button class="btn primary block" data-close-modal>اعمال</button></div>`;
  const wrap = openModal(html);
  wrap.querySelectorAll('#whenChips .chip').forEach((chip) => chip.addEventListener('click', () => { f.when = chip.dataset.v; renderConversations(view); openConvFilterSheet(view); }));
  wrap.querySelectorAll('#resChips .chip').forEach((chip) => chip.addEventListener('click', () => { f.result = chip.dataset.v; renderConversations(view); openConvFilterSheet(view); }));
}

const RESULT_BADGE = { 'رضایت بخش': 'st-bought', 'ناامید کننده': 'st-lost', 'قابل پیگیری': 'st-followup', 'منجر به خرید': 'st-called' };

function renderConversationCards(el, list, opts = {}) {
  if (!list.length) { el.innerHTML = `<div class="empty-state">${ic('chat')}<div class="empty-state__title">گفتگویی ثبت نشده</div></div>`; return; }
  el.innerHTML = list.map((c) => {
    const cu = byId(state.customers, c.customerId); const p = byId(state.products, c.productId);
    return `
    <div class="rec-card" style="border-right-color:var(--info);" data-id="${c.id}">
      <div class="rec-card__body">
        <div class="rec-card__top">
          <span class="rec-card__title">${!opts.hideCustomer && cu ? esc(customerFullName(cu)) : fmtId('G', c.id)}</span>
          <span class="badge ${RESULT_BADGE[c.result] || 'st-new'}">${esc(c.result || '—')}</span>
        </div>
        <div class="rec-card__id">${fmtId('G', c.id)} · ${formatJalaliDisplay(c.date)}</div>
        <div class="rec-card__meta">${p ? `<span>${ic('box')}${esc(p.name)}</span>` : ''}</div>
        ${c.text ? `<div class="rec-card__desc">${esc(c.text)}</div>` : ''}
      </div>
      <button class="menu-btn" data-menu="${c.id}">${ic('dots')}</button>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-menu]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.menu);
      openMenu(btn, [
        { key: 'edit', label: 'ویرایش', icon: 'edit', onClick: () => openConversationForm(id) },
        { sep: true },
        { key: 'del', label: 'حذف گفتگو', icon: 'trash', danger: true, onClick: () => deleteConversation(id) },
      ]);
    });
  });
}

function openConversationForm(id, presets = {}) {
  const rec = id ? byId(state.conversations, id) : null;
  const formData = rec ? { ...rec } : { date: todayISO(), customerId: presets.customerId || null, productId: presets.productId || null, text: '', result: 'قابل پیگیری', description: '' };
  const { custOpts, prodOpts } = customerProductSelectOptions(formData.customerId, formData.productId);
  const html = `
    <div class="modal__handle"></div>
    <h3 class="modal__title">${rec ? 'ویرایش گفتگو' : 'ثبت گفتگوی جدید'}</h3>
    <form id="convForm">
      ${dateFieldHTML('date', formData.date, 'تاریخ گفتگو', true)}
      <div class="field"><label>مشتری *</label><select name="customerId" required>${!formData.customerId ? '<option value="">انتخاب کنید</option>' : ''}${custOpts}</select></div>
      <div class="field"><label>محصول</label><select name="productId"><option value="">— بدون محصول —</option>${prodOpts}</select></div>
      <div class="field"><label>متن گفتگو</label><textarea name="text">${esc(formData.text)}</textarea></div>
      <div class="field"><label>نتیجه</label><select name="result">${RESULT_LIST.map((s) => `<option ${formData.result === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>توضیحات</label><textarea name="description">${esc(formData.description)}</textarea></div>
      <div class="modal__actions">
        <button type="button" class="btn secondary block" data-close-modal>انصراف</button>
        <button type="submit" class="btn primary block">${ic('check')}ذخیره</button>
      </div>
    </form>`;
  const wrap = openModal(html);
  initDateFields(wrap, formData);
  wrap.querySelector('#convForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const productId = fd.get('productId') ? Number(fd.get('productId')) : null;
    const payload = {
      date: formData.date || todayISO(), customerId: Number(fd.get('customerId')), productId,
      text: fd.get('text').trim(), result: fd.get('result'), description: fd.get('description').trim(),
    };
    if (rec) { payload.id = rec.id; await idb.put('conversations', payload); toast('گفتگو ویرایش شد'); }
    else { await idb.add('conversations', payload); toast('گفتگو ثبت شد'); }
    await loadAll(); closeModal(); router();
  });
}

async function deleteConversation(id) {
  confirmDialog('حذف گفتگو', 'این گفتگو برای همیشه حذف خواهد شد.', async () => {
    await idb.delete('conversations', id); await loadAll(); toast('گفتگو حذف شد'); router();
  });
}

/* ========================================================================
   12) تنظیمات
   ======================================================================== */
function renderSettings(view) {
  const theme = getTheme();
  const notifyOn = isNotifyEnabled();
  view.innerHTML = `
    <div class="settings-group">
      <div class="settings-group__title">ظاهر و اعلان‌ها</div>
      <div class="settings-row" id="themeRow">
        <div class="settings-row__icon">${ic('spark')}</div>
        <div class="settings-row__text"><div class="settings-row__title">حالت تاریک</div><div class="settings-row__desc">مناسب استفاده در شب</div></div>
        <button class="switch ${theme === 'dark' ? 'on' : ''}" id="themeSwitch" role="switch" aria-checked="${theme === 'dark'}"><span></span></button>
      </div>
      <div class="settings-row" id="notifyRow">
        <div class="settings-row__icon">${ic('clock')}</div>
        <div class="settings-row__text"><div class="settings-row__title">یادآوری روزانه‌ی پیگیری</div><div class="settings-row__desc">اعلان برای پیگیری‌های امروز، هنگام باز کردن اپ</div></div>
        <button class="switch ${notifyOn ? 'on' : ''}" id="notifySwitch" role="switch" aria-checked="${notifyOn}"><span></span></button>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group__title">پشتیبان‌گیری</div>
      <div class="settings-row" id="exportRow">
        <div class="settings-row__icon">${ic('download')}</div>
        <div class="settings-row__text"><div class="settings-row__title">خروجی گرفتن از داده‌ها</div><div class="settings-row__desc">دانلود فایل پشتیبان JSON از تمام اطلاعات</div></div>
      </div>
      <div class="settings-row" id="importRow">
        <div class="settings-row__icon">${ic('upload')}</div>
        <div class="settings-row__text"><div class="settings-row__title">بازیابی از فایل پشتیبان</div><div class="settings-row__desc">جایگزینی داده‌های فعلی با فایل JSON</div></div>
        <input type="file" id="importFile" accept="application/json">
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group__title">آمار دیتابیس</div>
      <div class="settings-row"><div class="settings-row__icon">${ic('users')}</div><div class="settings-row__text"><div class="settings-row__title">مشتریان</div></div><div style="font-weight:800;">${faDigits(state.customers.length)}</div></div>
      <div class="settings-row"><div class="settings-row__icon">${ic('box')}</div><div class="settings-row__text"><div class="settings-row__title">محصولات</div></div><div style="font-weight:800;">${faDigits(state.products.length)}</div></div>
      <div class="settings-row"><div class="settings-row__icon">${ic('cart')}</div><div class="settings-row__text"><div class="settings-row__title">فروش‌ها</div></div><div style="font-weight:800;">${faDigits(state.sales.length)}</div></div>
      <div class="settings-row"><div class="settings-row__icon">${ic('chat')}</div><div class="settings-row__text"><div class="settings-row__title">گفتگوها</div></div><div style="font-weight:800;">${faDigits(state.conversations.length)}</div></div>
    </div>

    <div class="settings-group">
      <div class="settings-group__title">داده‌ها</div>
      <div class="settings-row" id="wipeRow">
        <div class="settings-row__icon" style="background:var(--danger-tint);color:var(--danger);">${ic('wipe')}</div>
        <div class="settings-row__text"><div class="settings-row__title" style="color:var(--danger);">پاک‌سازی کامل داده‌ها</div><div class="settings-row__desc">حذف همیشگی تمام مشتریان، فروش‌ها، گفتگوها و محصولات</div></div>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group__title">درباره برنامه</div>
      <div class="settings-row"><div class="settings-row__icon">${ic('info')}</div><div class="settings-row__text"><div class="settings-row__title">مدیریت مشتری</div><div class="settings-row__desc">اپلیکیشن آفلاین (PWA) با تقویم شمسی — تمام داده‌ها فقط روی همین دستگاه ذخیره می‌شود</div></div></div>
    </div>
  `;
  document.getElementById('exportRow').addEventListener('click', exportBackup);
  document.getElementById('importRow').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', importBackup);
  document.getElementById('wipeRow').addEventListener('click', wipeAllData);

  document.getElementById('themeSwitch').addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    renderSettings(view);
  });
  document.getElementById('notifySwitch').addEventListener('click', async () => {
    if (isNotifyEnabled()) {
      safeSet(NOTIFY_KEY, '0');
      renderSettings(view);
      return;
    }
    if (!('Notification' in window)) { toast('مرورگر شما از اعلان پشتیبانی نمی‌کند'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      safeSet(NOTIFY_KEY, '1');
      toast('یادآوری روزانه فعال شد');
      checkFollowupNotification();
    } else {
      toast('اجازه‌ی نمایش اعلان داده نشد');
    }
    renderSettings(view);
  });
}

function checkFollowupNotification() {
  if (!isNotifyEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const today = todayISO();
  if (safeGet(NOTIFY_LAST_KEY) === today) return;
  const count = state.customers.filter((c) => c.nextFollowUp === today).length;
  if (count === 0) return;
  try {
    const n = new Notification('یادآوری پیگیری مشتری', {
      body: `امروز ${count} پیگیری مشتری دارید.`,
      icon: 'icon-192.png',
    });
    n.onclick = () => { window.focus(); };
  } catch (e) { /* برخی مرورگرها بدون تعامل کاربر اجازه نمی‌دهند */ }
  safeSet(NOTIFY_LAST_KEY, today);
}

async function exportBackup() {
  const data = await idb.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crm-backup-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('فایل پشتیبان دانلود شد');
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      confirmDialog('بازیابی داده‌ها', 'داده‌های فعلی با محتوای فایل پشتیبان جایگزین خواهد شد.', async () => {
        await idb.importAll(data, 'replace');
        await loadAll();
        toast('بازیابی با موفقیت انجام شد');
        router();
      });
    } catch (err) {
      toast('فایل پشتیبان نامعتبر است');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

function wipeAllData() {
  confirmDialog('پاک‌سازی کامل', 'تمام مشتریان، فروش‌ها، گفتگوها و محصولات برای همیشه حذف می‌شوند. این عمل غیرقابل‌بازگشت است.', async () => {
    await idb.wipeAll();
    await loadAll();
    toast('تمام داده‌ها پاک شد');
    router();
  });
}

/* ========================================================================
   13) راه‌اندازی
   ======================================================================== */
function renderTopbarDate() {
  const el = document.getElementById('topbarDate');
  if (el) el.textContent = formatJalaliDisplay(todayISO());
}

async function init() {
  applyTheme(getTheme());
  await loadAll();
  renderTopbarDate();
  await router();
  checkFollowupNotification();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
document.addEventListener('DOMContentLoaded', init);
