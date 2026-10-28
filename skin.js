/* skin.js — עיצוב חדש: מסך ערב פוקר, סגירת חשבון ומחשבון סיכויים */
(function () {
  'use strict';

  var G = window.wwcdGame;
  if (!G) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
  function money(n) { return '₪' + Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 }); }
  function num(n) { return Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 }); }
  function signed(n) { n = Math.round(Number(n || 0) * 100) / 100; return n > 0.009 ? '+' + money(n) : n < -0.009 ? '−' + money(-n) : money(0); }
  function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
  function uid(p) { return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9); }
  function initials(name) { return String(name).trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0] || ''; }).join('') || '?'; }

  function getState() { return G.get(); }
  function save(next) {
    G.replace(next);
    if (typeof window.persist === 'function') window.persist();
  }
  function perShekel(s) { return Number(s.ratioChips) / Number(s.ratioMoney); }
  function totalIn(s) { return s.players.reduce(function (a, p) { return a + Number(p.buyIn || 0); }, 0); }

  var ICON = {
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
    addUser: '<svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="4"/><path d="M3 21c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5M19 8v6M16 11h6"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    reset: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5"/></svg>'
  };

  /* =========================== CSS =========================== */
  var css = [
    ':root{--sk-bg:#0a1a12;--sk-card:#11291c;--sk-card2:#0d2217;--sk-line:rgba(255,255,255,.08);--sk-green:#2fd47c;--sk-green2:#1fb565;--sk-red:#e5484d;--sk-gold:#f2c94c;--sk-text:#f3f6f2;--sk-muted:#9fb3a6}',
    'body.sk-on .shell>.topbar,body.sk-on .shell>.hero,body.sk-on .shell>.flowbar,body.sk-on .shell>.layout,body.sk-on .shell>.footer{display:none!important}',
    'body.sk-on:not(.room-view-active) .room-account{display:none!important}',
    'body.sk-on:not(.room-view-active) .room-hub{margin:0!important}',
    'body.sk-on:not(.room-view-active) #tableCard{max-width:520px;margin:0 auto 12px}',
    'body.room-view-active #sk-root{display:none}',
    '#sk-root{direction:rtl;color:var(--sk-text);max-width:520px;margin:0 auto;padding:6px 0 0;display:grid;gap:14px}',
    '#sk-root svg,.sk-sheet svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.sk-card{background:linear-gradient(160deg,#143222,#0d2318);border:1px solid var(--sk-line);border-radius:24px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.25)}',
    '.sk-head{display:flex;align-items:center;justify-content:space-between;gap:12px}',
    '.sk-brand{display:flex;align-items:center;gap:12px;min-width:0}',
    '.sk-logo{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-size:26px;color:#fff;background:linear-gradient(145deg,#f04848,#a91e25);box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}',
    '.sk-title{font-weight:800;font-size:16px;line-height:1.2}.sk-sub{color:var(--sk-muted);font-size:12px}',
    '.sk-iconbtn{flex:none;width:42px;height:42px;border-radius:14px;border:1px solid var(--sk-line);background:rgba(255,255,255,.05);color:var(--sk-text);display:grid;place-items:center;padding:0;cursor:pointer}',
    '.sk-row2{display:grid;grid-template-columns:1.3fr 1fr;gap:10px;margin-top:14px}',
    '.sk-pot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-radius:16px;border:1px solid rgba(242,201,76,.28);background:rgba(242,201,76,.07)}',
    '.sk-pot span{color:var(--sk-muted);font-size:13px}.sk-pot strong{color:var(--sk-gold);font-size:24px;font-weight:900;direction:ltr}',
    '.sk-btn{border:0;border-radius:16px;min-height:48px;padding:10px 14px;font:inherit;font-weight:800;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;color:var(--sk-text);background:rgba(255,255,255,.07);border:1px solid var(--sk-line)}',
    '.sk-btn.green{background:linear-gradient(180deg,#36dd85,#1fb565);color:#062012;border-color:transparent;box-shadow:0 6px 18px rgba(47,212,124,.22)}',
    '.sk-btn:active,.sk-iconbtn:active,.sk-pm:active{transform:scale(.96)}',
    '.sk-hero{text-align:center;padding:4px 0 0}',
    '.sk-kicker{color:var(--sk-gold);font-weight:800;font-size:12px;letter-spacing:.14em}',
    '.sk-chips{display:flex;justify-content:center;gap:8px;margin:12px 0 6px}',
    '.sk-chip{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:20px;border:5px dashed rgba(255,255,255,.85);box-shadow:0 6px 14px rgba(0,0,0,.35),inset 0 0 0 3px rgba(0,0,0,.15)}',
    '.sk-chip.r{background:#d93a3f}.sk-chip.g{background:#1f9d62}.sk-chip.y{background:#d9a21f}',
    '.sk-room{color:var(--sk-muted);font-size:13px;font-weight:700;direction:rtl}.sk-room b{color:var(--sk-text);letter-spacing:.08em;direction:ltr;display:inline-block}',
    '.sk-ratio-row{display:grid;grid-template-columns:1fr auto 1.2fr auto;gap:8px;align-items:center}',
    '.sk-rbox{display:flex;align-items:center;gap:6px;height:50px;padding:0 10px;border-radius:14px;border:1px solid rgba(242,201,76,.22);background:rgba(0,0,0,.25);min-width:0}',
    '.sk-rbox input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--sk-text);font:inherit;font-size:20px;font-weight:900;text-align:center;-moz-appearance:textfield}',
    '.sk-rbox input::-webkit-outer-spin-button,.sk-rbox input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}',
    '.sk-rbox span{color:var(--sk-gold);font-weight:800;font-size:13px;white-space:nowrap}',
    '.sk-eq{color:var(--sk-gold);font-size:20px}',
    '.sk-ratio-row .sk-btn{min-height:50px;padding:0 14px}',
    '.sk-sec-title{font-weight:800;font-size:15px;margin:0 0 10px;display:flex;justify-content:space-between;align-items:center}',
    '.sk-sec-title small{color:var(--sk-muted);font-weight:600;font-size:12px}',
    '.sk-list{display:grid;gap:8px}',
    '.sk-player{display:grid;grid-template-columns:auto 1fr auto auto auto;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.05)}',
    '.sk-av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08);color:var(--sk-text);font-weight:800;font-size:14px}',
    '.sk-av.host{background:rgba(242,201,76,.16);color:var(--sk-gold)}',
    '.sk-name{font-weight:800;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sk-tag{display:inline-block;margin-inline-start:6px;padding:1px 8px;border-radius:999px;background:rgba(47,212,124,.15);color:var(--sk-green);font-size:11px;font-weight:800}',
    '.sk-amt{color:var(--sk-gold);font-weight:900;font-size:16px;direction:ltr;min-width:64px;text-align:center}',
    '.sk-pm{width:34px;height:34px;border-radius:50%;border:0;display:grid;place-items:center;font-size:22px;font-weight:900;line-height:1;cursor:pointer;padding:0}',
    '.sk-pm.minus{background:rgba(229,72,77,.18);color:#ff6b70}.sk-pm.plus{background:rgba(47,212,124,.18);color:var(--sk-green)}',
    '.sk-empty{padding:20px;text-align:center;color:var(--sk-muted);border:1px dashed rgba(255,255,255,.12);border-radius:16px}',
    '.sk-actions{display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:10px}',
    '.sk-actions .sk-btn{flex-direction:column;gap:4px;min-height:68px;font-size:13px}',
    '.sk-actions .sk-btn svg{width:22px;height:22px}',
    /* settlement */
    '.sk-topnav{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 2px}',
    '.sk-topnav h2{margin:0;font-size:20px;font-weight:900}',
    '.sk-backlink{display:inline-flex;align-items:center;gap:2px;border:0;background:none;color:var(--sk-green);font:inherit;font-weight:800;font-size:15px;cursor:pointer;padding:6px}',
    '.sk-chiprow{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:8px 0}',
    '.sk-chiprow+.sk-chiprow{border-top:1px solid var(--sk-line)}',
    '.sk-chipname{display:flex;align-items:center;gap:10px;font-weight:800;min-width:0}',
    '.sk-dot{width:28px;height:28px;border-radius:50%;border:4px dashed rgba(255,255,255,.85);flex:none}',
    '.sk-stepper{display:flex;align-items:center;gap:6px;direction:ltr}',
    '.sk-stepper input{width:96px;height:38px;border-radius:12px;border:1px solid var(--sk-line);background:rgba(0,0,0,.25);color:var(--sk-text);text-align:center;font:inherit;font-weight:800;font-size:15px;-moz-appearance:textfield}',
    '.sk-stepper input::-webkit-outer-spin-button,.sk-stepper input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}',
    '.sk-bal{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-weight:800}',
    '.sk-bal+.sk-bal{border-top:1px solid var(--sk-line)}',
    '.sk-bal .v{direction:ltr;font-weight:900}.sk-pos{color:var(--sk-green)}.sk-neg{color:#ff6b70}.sk-zero{color:var(--sk-muted)}',
    '.sk-pay{display:flex;justify-content:space-between;align-items:center;padding:10px 0;font-weight:700}',
    '.sk-pay+.sk-pay{border-top:1px solid var(--sk-line)}.sk-pay .v{color:var(--sk-gold);font-weight:900;direction:ltr}',
    '.sk-warn{padding:10px 12px;border-radius:14px;background:rgba(242,201,76,.1);border:1px solid rgba(242,201,76,.25);color:#f6dc8a;font-size:13px;line-height:1.5}',
    '.sk-ok{padding:10px 12px;border-radius:14px;background:rgba(47,212,124,.1);border:1px solid rgba(47,212,124,.25);color:#9ff0c5;font-size:13px}',
    /* sheets */
    '.sk-overlay{position:fixed;inset:0;z-index:110;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
    '.sk-overlay.show{display:flex}',
    '.sk-sheet{direction:rtl;color:var(--sk-text);width:min(520px,100%);max-height:92dvh;overflow:auto;background:linear-gradient(170deg,#143222,#0b1f15);border:1px solid var(--sk-line);border-radius:26px 26px 0 0;padding:10px 16px calc(18px + env(safe-area-inset-bottom,0px));animation:skUp .22s ease-out}',
    '@keyframes skUp{from{transform:translateY(30px);opacity:.6}to{transform:none;opacity:1}}',
    '.sk-grab{width:44px;height:5px;border-radius:9px;background:rgba(255,255,255,.25);margin:0 auto 10px}',
    '.sk-sheet h3{margin:0;font-size:20px;font-weight:900;text-align:center}',
    '.sk-sheet .sk-note{margin:4px 0 14px;text-align:center;color:var(--sk-muted);font-size:13px}',
    '.sk-field{display:grid;gap:6px;margin-bottom:12px;color:var(--sk-muted);font-size:13px;font-weight:700}',
    '.sk-field input{height:48px;border-radius:14px;border:1px solid var(--sk-line);background:rgba(0,0,0,.25);color:var(--sk-text);padding:0 14px;font:inherit;font-size:16px;font-weight:700}',
    '.sk-quick{display:flex;gap:8px;flex-wrap:wrap;margin:-4px 0 12px}',
    '.sk-quick button{flex:1 1 60px;height:40px;border-radius:12px;border:1px solid rgba(242,201,76,.25);background:rgba(242,201,76,.06);color:#f3dc95;font:inherit;font-weight:800;cursor:pointer}',
    '.sk-sheet-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}',
    '.sk-menu{display:grid;gap:8px}.sk-menu .sk-btn{justify-content:flex-start}',
    /* calculator */
    '.sk-calc-sec{margin:14px 0 8px;color:var(--sk-green);font-weight:800;font-size:14px}',
    '.sk-board{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}',
    '.sk-slot{aspect-ratio:.72;border-radius:12px;border:1.5px dashed rgba(47,212,124,.45);background:rgba(47,212,124,.06);display:grid;place-items:center;cursor:pointer;color:var(--sk-green);font-size:22px;font-weight:900;padding:0;font-family:inherit}',
    '.sk-slot.active{border-style:solid;border-color:var(--sk-gold);box-shadow:0 0 0 3px rgba(242,201,76,.25)}',
    '.sk-slot.filled{border:0;background:none;padding:0}',
    '.sk-pc{width:100%;height:100%;border-radius:10px;background:#fbfaf6;color:#151515;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;padding:5px 6px;font-family:Georgia,serif;font-weight:900;box-shadow:0 4px 10px rgba(0,0,0,.35)}',
    '.sk-pc .r{font-size:17px;line-height:1}.sk-pc .s{align-self:center;font-size:26px;line-height:1;margin-bottom:6px}',
    '.sk-pc.red{color:#d32f2f}',
    '.sk-hand{display:grid;grid-template-columns:1fr 54px 54px auto;align-items:center;gap:8px;padding:8px 10px;border-radius:14px;background:rgba(255,255,255,.035);margin-bottom:8px}',
    '.sk-hand .sk-slot{aspect-ratio:.72}',
    '.sk-hand .nm{font-weight:800}',
    '.sk-x{width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.06);color:var(--sk-muted);cursor:pointer;font-size:16px;padding:0}',
    '.sk-addhand{width:100%;height:40px;border-radius:12px;border:1px dashed rgba(255,255,255,.2);background:none;color:var(--sk-muted);font:inherit;font-weight:800;cursor:pointer}',
    '.sk-deck{display:grid;grid-template-columns:repeat(13,1fr);gap:3px;direction:ltr;background:rgba(0,0,0,.2);padding:6px;border-radius:14px}',
    '.sk-dc{aspect-ratio:.7;border:0;border-radius:5px;background:#fbfaf6;color:#151515;font:900 10px/1.05 Georgia,serif;padding:1px 0;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center}',
    '.sk-dc.red{color:#d32f2f}.sk-dc.used{opacity:.18;cursor:default}',
    '.sk-dc span{font-size:11px}',
    '.sk-res{display:grid;gap:6px}',
    '.sk-resrow{display:grid;grid-template-columns:1fr repeat(3,1fr);gap:6px;align-items:center}',
    '.sk-resrow .nm{font-weight:800;font-size:14px}',
    '.sk-cell{text-align:center;padding:8px 4px;border-radius:12px;background:rgba(255,255,255,.04)}',
    '.sk-cell small{display:block;font-size:11px;font-weight:800}.sk-cell b{font-size:15px;direction:ltr;display:block}',
    '.sk-cell.w small{color:var(--sk-green)}.sk-cell.t small{color:var(--sk-gold)}.sk-cell.l small{color:#ff6b70}',
    '.sk-calc-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}',
    '.sk-hint{color:var(--sk-muted);font-size:12px;text-align:center;margin:8px 0 0}',
    '.sk-close{position:sticky;top:0;float:left;margin-top:-2px}',
    '@media(max-width:380px){.sk-dc{font-size:9px}.sk-dc span{font-size:10px}.sk-actions .sk-btn{font-size:12px}}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* =========================== Sheets =========================== */
  function makeOverlay(id) {
    var o = document.createElement('div');
    o.className = 'sk-overlay';
    o.id = id;
    o.innerHTML = '<div class="sk-sheet" role="dialog" aria-modal="true"></div>';
    o.addEventListener('click', function (e) { if (e.target === o) closeOverlay(o); });
    document.body.appendChild(o);
    return o;
  }
  function openOverlay(o) { o.classList.add('show'); }
  function closeOverlay(o) { o.classList.remove('show'); if (o.onclose) o.onclose(); }

  /* ---------- add player ---------- */
  var addO = makeOverlay('sk-add');
  function openAdd() {
    var s = getState();
    var last = s.players.length ? (s.players[s.players.length - 1].buyHistory[0] || {}).amount : 100;
    var sheet = addO.firstChild;
    sheet.innerHTML =
      '<div class="sk-grab"></div><h3>הוספת שחקן</h3><p class="sk-note">שם השחקן וסכום הכניסה</p>' +
      '<label class="sk-field">שם השחקן<input id="sk-add-name" maxlength="40" autocomplete="off" placeholder="לדוגמה: דנה"></label>' +
      '<label class="sk-field">קנייה ראשונה (₪)<input id="sk-add-amt" type="number" inputmode="decimal" min="1" value="' + (last || 100) + '"></label>' +
      '<div class="sk-quick">' + [50, 100, 200, 300].map(function (v) { return '<button type="button" data-v="' + v + '">₪' + v + '</button>'; }).join('') + '</div>' +
      '<div class="sk-sheet-actions"><button class="sk-btn" type="button" data-close>ביטול</button><button class="sk-btn green" type="button" id="sk-add-go">הוסף</button></div>';
    sheet.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { $('sk-add-amt').value = b.getAttribute('data-v'); }; });
    sheet.querySelector('[data-close]').onclick = function () { closeOverlay(addO); };
    function go() {
      var name = $('sk-add-name').value.trim(), amt = Number($('sk-add-amt').value);
      if (!name) { $('sk-add-name').focus(); return toast('כתוב את שם השחקן'); }
      if (!(amt > 0)) return toast('סכום הכניסה צריך להיות גדול מ-0');
      var s2 = getState();
      if (s2.players.some(function (p) { return p.name === name; })) return toast('כבר יש שחקן בשם הזה');
      s2.players.push({ id: uid('p'), name: name, buyHistory: [{ id: uid('buy'), amount: amt, kind: 'כניסה', at: Date.now() }], buyIn: amt, finalChips: 0 });
      save(s2);
      closeOverlay(addO);
      render();
      toast(name + ' הצטרף/ה לשולחן');
    }
    $('sk-add-go').onclick = go;
    $('sk-add-name').onkeydown = function (e) { if (e.key === 'Enter') $('sk-add-amt').focus(); };
    $('sk-add-amt').onkeydown = function (e) { if (e.key === 'Enter') go(); };
    openOverlay(addO);
    setTimeout(function () { $('sk-add-name').focus(); }, 60);
  }

  /* ---------- settings menu ---------- */
  var menuO = makeOverlay('sk-menu');
  function openMenu() {
    var s = getState();
    var admin = $('adminOpenBtn'), adminVisible = admin && !admin.hidden;
    var sheet = menuO.firstChild;
    sheet.innerHTML =
      '<div class="sk-grab"></div><h3>הגדרות המשחק</h3><p class="sk-note">יחס כסף לג׳טונים ופעולות נוספות</p>' +
      '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:end">' +
      '<label class="sk-field">שקלים<input id="sk-rm" type="number" inputmode="decimal" min="0.01" value="' + s.ratioMoney + '"></label>' +
      '<div style="padding-bottom:24px;color:#f2c94c;font-weight:900;font-size:20px">=</div>' +
      '<label class="sk-field">ג׳טונים<input id="sk-rc" type="number" inputmode="numeric" min="1" value="' + s.ratioChips + '"></label></div>' +
      '<button class="sk-btn green" type="button" id="sk-ratio-save" style="width:100%;margin-bottom:14px">עדכן יחס</button>' +
      '<div class="sk-menu">' +
      (isGuestMode()
        ? '<button class="sk-btn" type="button" data-act="new">' + ICON.reset + 'משחק חדש</button>' +
          '<button class="sk-btn green" type="button" data-act="login">' + ICON.user + 'התחבר עם Google</button>'
        : '<button class="sk-btn" type="button" data-act="rooms">' + ICON.link + 'שולחן משותף</button>' +
          '<button class="sk-btn" type="button" data-act="new">' + ICON.reset + 'משחק חדש</button>' +
          (adminVisible ? '<button class="sk-btn" type="button" data-act="admin">' + ICON.gear + 'ADMIN</button>' : '') +
          '<button class="sk-btn" type="button" data-act="logout" style="color:#ff8a8e">' + ICON.back + 'התנתק</button>') +
      '</div>';
    $('sk-ratio-save').onclick = function () {
      var m = Number($('sk-rm').value), c = Number($('sk-rc').value);
      if (!(m > 0) || !(c > 0)) return toast('שני המספרים צריכים להיות גדולים מ-0');
      var s2 = getState(); s2.ratioMoney = m; s2.ratioChips = c; save(s2); render(); closeOverlay(menuO); toast('היחס עודכן');
    };
    sheet.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-act');
        closeOverlay(menuO);
        if (a === 'login') return exitGuest();
        if (a === 'rooms') { var tc = $('tableCard'); if (tc) { tc.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } }
        var map = { rooms: 'openRoomsPanelBtn', new: 'newGameBtn', admin: 'adminOpenBtn', logout: 'googleSignOutBtn' };
        var t = $(map[a]); if (t) t.click();
      };
    });
    openOverlay(menuO);
  }

  /* =========================== Game & settlement views =========================== */
  var root = document.createElement('div');
  root.id = 'sk-root';
  var view = 'game';

  function roomCode() {
    var act = $('tableActive');
    if (act && act.hidden) return '';
    var el = $('tableCode') || $('activeRoomCode');
    return el && el.textContent ? el.textContent.trim() : '';
  }
  function invite() {
    if (isGuestMode()) return askLogin('כדי להזמין חברים לשולחן משותף צריך להתחבר עם Google.');
    var act = $('tableActive');
    if (act && !act.hidden && $('copyRoomCodeBtn')) return $('copyRoomCodeBtn').click();
    var b = $('openCreateRoomBtn') || $('openRoomsPanelBtn');
    if (b) b.click();
  }

  function renderGame() {
    var s = getState(), pot = totalIn(s), code = roomCode();
    var rows = s.players.map(function (p, i) {
      return '<div class="sk-player" data-id="' + esc(p.id) + '">' +
        '<div class="sk-av' + (i === 0 ? ' host' : '') + '">' + (i === 0 ? ICON.crown : esc(initials(p.name))) + '</div>' +
        '<div class="sk-name">' + esc(p.name) + (i === 0 ? '<span class="sk-tag">מארח</span>' : '') +
        (p.buyHistory.length > 1 ? '<div style="color:#9fb3a6;font-size:11px;font-weight:600">' + p.buyHistory.length + ' קניות</div>' : '') + '</div>' +
        '<div class="sk-amt">' + money(p.buyIn) + '</div>' +
        '<button class="sk-pm plus" type="button" data-plus aria-label="קנייה נוספת ל' + esc(p.name) + '">+</button>' +
        '<button class="sk-pm minus" type="button" data-minus aria-label="בטל קנייה אחרונה של ' + esc(p.name) + '">−</button>' +
        '</div>';
    }).join('');
    root.innerHTML =
      '<div class="sk-guest-banner"><span>אתה משחק כאורח — המשחק נשמר רק במכשיר הזה</span><button type="button" id="sk-guest-login">התחבר</button></div>' +
      '<section class="sk-card">' +
      '<div class="sk-head"><div class="sk-brand"><div class="sk-logo">♠</div><div><div class="sk-title">Winner winner chicken dinner</div><div class="sk-sub">Poker Night</div></div></div>' +
      '<button class="sk-iconbtn" type="button" id="sk-menu-btn" aria-label="הגדרות">' + ICON.gear + '</button></div>' +
      '<div class="sk-row2"><div class="sk-pot"><span>סה״כ בקופה</span><strong>' + money(pot) + '</strong></div>' +
      '<button class="sk-btn green" type="button" id="sk-share">' + ICON.share + 'שתף</button></div>' +
      '</section>' +
      '<div class="sk-hero"><div class="sk-kicker">POKER NIGHT MANAGER</div>' +
      '<div class="sk-chips"><div class="sk-chip r">♦</div><div class="sk-chip g">♣</div><div class="sk-chip y">♠</div></div>' +
      (code ? '<div class="sk-room">חדר <b>' + esc(code) + '</b></div>' : '') + '</div>' +
      '<section class="sk-card sk-ratio"><div class="sk-sec-title">יחס ג׳טונים לשקל<small>' + esc(chipLine(s)) + '</small></div>' +
      '<div class="sk-ratio-row"><label class="sk-rbox"><input id="sk-r-money" type="number" inputmode="decimal" min="0.01" value="' + s.ratioMoney + '" aria-label="שקלים"><span>₪</span></label>' +
      '<b class="sk-eq">=</b>' +
      '<label class="sk-rbox"><input id="sk-r-chips" type="number" inputmode="numeric" min="1" value="' + s.ratioChips + '" aria-label="ג׳טונים"><span>ג׳טונים</span></label>' +
      '<button class="sk-btn green" type="button" id="sk-r-save">עדכן</button></div></section>' +
      '<section class="sk-card"><div class="sk-sec-title">שחקנים (' + s.players.length + ')<small>+ קנייה נוספת · − ביטול קנייה</small></div>' +
      '<div class="sk-list">' + (rows || '<div class="sk-empty">עוד אין שחקנים. לחץ על "הוסף שחקן" כדי להתחיל.</div>') + '</div></section>' +
      '<div class="sk-actions">' +
      '<button class="sk-btn" type="button" id="sk-finish">' + ICON.flag + 'סיים משחק</button>' +
      '<button class="sk-btn" type="button" id="sk-invite">' + ICON.link + 'הזמן</button>' +
      '<button class="sk-btn green" type="button" id="sk-add-btn">' + ICON.addUser + 'הוסף שחקן</button>' +
      '</div>';

    $('sk-menu-btn').onclick = openMenu;
    function saveRatio() {
      var m = Number($('sk-r-money').value), c = Number($('sk-r-chips').value);
      if (!(m > 0) || !(c > 0)) return toast('שני המספרים צריכים להיות גדולים מ-0');
      var s2 = getState(); s2.ratioMoney = m; s2.ratioChips = c; save(s2);
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
      render(); toast('היחס עודכן');
    }
    $('sk-r-save').onclick = saveRatio;
    ['sk-r-money', 'sk-r-chips'].forEach(function (id) { $(id).onkeydown = function (e) { if (e.key === 'Enter') saveRatio(); }; });
    $('sk-guest-login').onclick = exitGuest;
    $('sk-share').onclick = function () { var b = $('shareAppBtn'); if (b) b.click(); };
    $('sk-add-btn').onclick = openAdd;
    $('sk-invite').onclick = invite;
    $('sk-finish').onclick = function () {
      if (getState().players.length < 2) return toast('צריך לפחות שני שחקנים');
      view = 'settle'; render(); window.scrollTo({ top: 0 });
    };
    root.querySelectorAll('.sk-player').forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.querySelector('[data-plus]').onclick = function () {
        var s2 = getState(), p = s2.players.find(function (x) { return x.id === id; });
        if (!p) return;
        var amt = (p.buyHistory[0] && p.buyHistory[0].amount) || 100;
        p.buyHistory.push({ id: uid('buy'), amount: amt, kind: 'Rebuy', at: Date.now() });
        save(s2); render(); toast('קנייה נוספת: ' + p.name + ' ' + money(amt));
      };
      row.querySelector('[data-minus]').onclick = function () {
        var s2 = getState(), p = s2.players.find(function (x) { return x.id === id; });
        if (!p) return;
        if (p.buyHistory.length > 1) {
          var last = p.buyHistory.pop(); save(s2); render(); toast('בוטלה קנייה של ' + money(last.amount));
        } else if (typeof window.openConfirm === 'function') {
          window.openConfirm('להסיר את ' + p.name + '?', 'השחקן וכל הקניות שלו יימחקו מהמשחק.', 'הסר', function () {
            var s3 = getState(); s3.players = s3.players.filter(function (x) { return x.id !== id; }); save(s3); render();
          });
        }
      };
    });
  }

  function chipLine(s) {
    var per = Number(s.ratioMoney) / Number(s.ratioChips);
    var v = per >= 1 ? money(per) : per >= 0.01 ? '₪' + per.toLocaleString('he-IL', { maximumFractionDigits: 2 }) : (per * 100).toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' אגורות';
    return 'ג׳טון אחד = ' + v;
  }

  function computeTransfers(s) {
    var ps = perShekel(s), c = [], d = [];
    s.players.forEach(function (p) {
      var b = Math.round((p.finalChips / ps - p.buyIn) * 100) / 100;
      if (b > 0.009) c.push({ name: p.name, amount: b });
      if (b < -0.009) d.push({ name: p.name, amount: -b });
    });
    c.sort(function (a, b) { return b.amount - a.amount; });
    d.sort(function (a, b) { return b.amount - a.amount; });
    var i = 0, j = 0, out = [];
    while (i < d.length && j < c.length) {
      var m = Math.min(d[i].amount, c[j].amount);
      out.push({ from: d[i].name, to: c[j].name, amount: Math.round(m * 100) / 100 });
      d[i].amount = Math.round((d[i].amount - m) * 100) / 100;
      c[j].amount = Math.round((c[j].amount - m) * 100) / 100;
      if (d[i].amount <= 0.009) i++;
      if (c[j].amount <= 0.009) j++;
    }
    return out;
  }

  var DOTS = ['#d93a3f', '#1f9d62', '#d9a21f', '#3b6fd9', '#8e44ad', '#e67e22', '#16a085', '#7f8c8d'];
  function renderSettle() {
    var s = getState(), ps = perShekel(s);
    var chipsIn = totalIn(s) * ps, chipsOut = s.players.reduce(function (a, p) { return a + Number(p.finalChips || 0); }, 0);
    var diff = Math.round(chipsOut - chipsIn);
    var step = Math.max(1, Math.round(Number(s.ratioChips) / 10));
    var chipRows = s.players.map(function (p, i) {
      return '<div class="sk-chiprow" data-id="' + esc(p.id) + '">' +
        '<div class="sk-chipname"><span class="sk-dot" style="background:' + DOTS[i % DOTS.length] + '"></span>' + esc(p.name) + '</div><div></div>' +
        '<div class="sk-stepper"><button class="sk-pm minus" type="button" data-d="-1" aria-label="פחות">−</button>' +
        '<input type="number" inputmode="numeric" min="0" value="' + Math.round(p.finalChips || 0) + '" aria-label="ג׳טונים של ' + esc(p.name) + '">' +
        '<button class="sk-pm plus" type="button" data-d="1" aria-label="יותר">+</button></div></div>';
    }).join('');
    var bal = s.players.map(function (p) {
      var b = p.finalChips / ps - p.buyIn;
      var cls = b > 0.009 ? 'sk-pos' : b < -0.009 ? 'sk-neg' : 'sk-zero';
      return '<div class="sk-bal"><span>' + esc(p.name) + '</span><span class="v ' + cls + '">' + signed(b) + '</span></div>';
    }).join('');
    var tr = diff === 0 ? computeTransfers(s) : [];
    var pays = tr.length ? tr.map(function (t) {
      return '<div class="sk-pay"><span>' + esc(t.from) + ' משלם/ת ל' + esc(t.to) + '</span><span class="v">' + money(t.amount) + '</span></div>';
    }).join('') : (diff === 0 ? '<div class="sk-zero" style="padding:8px 0">אין חובות — כולם מאוזנים</div>' : '');
    var status = diff === 0
      ? '<div class="sk-ok">✓ הג׳טונים מאוזנים (' + num(chipsOut) + ' מתוך ' + num(chipsIn) + ')</div>'
      : '<div class="sk-warn">' + (diff < 0 ? 'חסרים ' + num(-diff) : 'יש ' + num(diff) + ' יותר מדי') + ' ג׳טונים. סה״כ חולקו ' + num(chipsIn) + ' ג׳טונים, וספרתם ' + num(chipsOut) + '. התשלומים יחושבו כשהסכום יתאזן.</div>';

    root.innerHTML =
      '<div class="sk-topnav"><h2>סגירת חשבון</h2><button class="sk-backlink" type="button" id="sk-back">' + ICON.back + 'ערב פוקר</button></div>' +
      '<section class="sk-card"><div class="sk-sec-title" style="color:var(--sk-green)">ג׳טונים שנשארו<small>' + num(step) + ' בכל לחיצה</small></div>' + chipRows + '</section>' +
      status +
      '<section class="sk-card"><div class="sk-sec-title" style="color:var(--sk-green)">יתרות</div>' + bal + '</section>' +
      '<section class="sk-card"><div class="sk-sec-title" style="color:var(--sk-green)">תשלומים</div>' + (pays || '<div class="sk-zero" style="padding:6px 0">יופיעו כשהג׳טונים יתאזנו</div>') + '</section>' +
      '<button class="sk-btn green" type="button" id="sk-save" style="width:100%;min-height:54px;font-size:17px">שמור תוצאה</button>';

    $('sk-back').onclick = function () { view = 'game'; render(); };
    $('sk-save').onclick = function () {
      if (typeof window.persist === 'function') window.persist();
      toast(diff === 0 ? 'התוצאה נשמרה' : 'נשמר. שים לב: הג׳טונים עדיין לא מאוזנים');
    };
    root.querySelectorAll('.sk-chiprow').forEach(function (row) {
      var id = row.getAttribute('data-id'), input = row.querySelector('input');
      function setVal(v) {
        var s2 = getState(), p = s2.players.find(function (x) { return x.id === id; });
        if (!p) return;
        p.finalChips = Math.max(0, Math.round(Number(v) || 0));
        save(s2); render();
      }
      row.querySelectorAll('[data-d]').forEach(function (b) {
        b.onclick = function () { setVal(Number(input.value || 0) + Number(b.getAttribute('data-d')) * step); };
      });
      input.onchange = function () { setVal(input.value); };
      input.onkeydown = function (e) { if (e.key === 'Enter') input.blur(); };
    });
  }

  function render() {
    if (!root.isConnected) return;
    var focused = document.activeElement && root.contains(document.activeElement);
    if (focused && document.activeElement.tagName === 'INPUT') return; // לא לשבור הקלדה
    if (view === 'settle') renderSettle(); else renderGame();
  }

  /* ---------- guest mode (כניסה כאורח) ---------- */
  var GUEST_KEY = 'wwcd_guest';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function isGuestMode() { return document.body.classList.contains('wn-guest') && !document.body.classList.contains('room-authenticated'); }
  function enterGuest() {
    lsSet(GUEST_KEY, '1');
    document.body.classList.add('wn-guest');
    view = 'game'; render(); window.scrollTo({ top: 0 });
  }
  function exitGuest() {
    lsDel(GUEST_KEY);
    document.body.classList.remove('wn-guest');
    window.scrollTo({ top: 0 });
  }
  function askLogin(text) {
    if (typeof window.openConfirm === 'function') window.openConfirm('צריך להתחבר', text, 'התחבר עם Google', function () { exitGuest(); var g = $('googleSignInBtn'); if (g) g.click(); });
    else exitGuest();
  }
  window.wnGuest = { is: isGuestMode, exit: exitGuest, askLogin: askLogin };

  var guestCss = document.createElement('style');
  guestCss.textContent = [
    'body.wn-guest:not(.room-authenticated){display:block!important;padding:0!important;align-items:initial!important}',
    'body.wn-guest:not(.room-authenticated) .shell{width:min(1120px,calc(100% - 24px))!important;margin:auto!important;padding:12px 0 calc(110px + env(safe-area-inset-bottom,0px))!important;min-height:100vh!important}',
    'body.wn-guest:not(.room-authenticated) .room-hub{display:none!important}',
    'body.wn-guest:not(.room-authenticated) .shell>#sk-root{display:grid!important}',
    'body.wn-guest:not(.room-authenticated) .wn-nav{display:flex!important}',
    'body.wn-guest:not(.room-authenticated) .toast{bottom:calc(96px + env(safe-area-inset-bottom,0px))}',
    '.sk-guest-btn{width:100%;min-height:50px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#f3f6f2;font:inherit;font-weight:750;cursor:pointer}',
    '.sk-guest-btn:hover{background:rgba(255,255,255,.05)}',
    '.sk-guest-note{margin:-6px 0 0!important;color:#9fb3a6;font-size:.78rem!important}',
    '.sk-guest-banner{display:none;padding:10px 12px;border-radius:14px;background:rgba(242,201,76,.08);border:1px solid rgba(242,201,76,.2);color:#f3dc95;font-size:13px;align-items:center;justify-content:space-between;gap:10px}',
    'body.wn-guest:not(.room-authenticated) .sk-guest-banner{display:flex}',
    '.sk-guest-banner button{border:0;background:none;color:#2fd47c;font:inherit;font-weight:800;cursor:pointer;white-space:nowrap}'
  ].join('\n');
  document.head.appendChild(guestCss);

  function addGuestButton() {
    var panel = $('roomAuthPanel'), google = $('googleSignInBtn');
    if (!panel || !google || $('sk-guest-btn')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'sk-guest-btn'; b.className = 'sk-guest-btn';
    b.textContent = 'כניסה כאורח';
    b.onclick = enterGuest;
    var note = document.createElement('p');
    note.className = 'sk-guest-note';
    note.textContent = 'כאורח המשחק נשמר רק במכשיר הזה, בלי שולחנות משותפים.';
    google.after(b);
    b.after(note);
  }

  function mount() {
    var shell = document.querySelector('.shell'), hub = document.querySelector('.room-hub');
    if (!shell || !hub) return;
    hub.after(root);
    document.body.classList.add('sk-on');
    addGuestButton();
    if (lsGet(GUEST_KEY) === '1') document.body.classList.add('wn-guest');
    // כשמתחברים עם Google — יוצאים ממצב אורח
    var ta = $('tableActive');
    if (ta) new MutationObserver(function () { setTimeout(render, 0); }).observe(ta, { attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(function () {
      if (document.body.classList.contains('room-authenticated') && document.body.classList.contains('wn-guest')) {
        lsDel(GUEST_KEY); document.body.classList.remove('wn-guest'); render();
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    render();
  }

  // כשהמשחק נטען מהענן או משתנה מבחוץ — לרענן
  var origReplace = G.replace;
  G.replace = function (next) { origReplace(next); setTimeout(render, 0); };

  window.wnGame = {
    show: function () { view = 'game'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    render: render
  };

  /* =========================== Equity calculator =========================== */
  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var SUITS = ['♠', '♥', '♦', '♣'];
  function cRank(c) { return (c >> 2) + 2; }
  function cSuit(c) { return c & 3; }
  function isRed(c) { var s = cSuit(c); return s === 1 || s === 2; }
  function cardHTML(c) { return '<div class="sk-pc' + (isRed(c) ? ' red' : '') + '"><span class="r">' + RANKS[cRank(c) - 2] + '</span><span class="s">' + SUITS[cSuit(c)] + '</span></div>'; }

  function score(cat, arr) { var v = cat; for (var i = 0; i < 5; i++) v = v * 15 + (arr[i] || 0); return v; }
  function straightHigh(mask) {
    for (var h = 14; h >= 5; h--) {
      var ok = true;
      for (var k = 0; k < 5; k++) { var r = h - k === 1 ? 14 : h - k; if (!((mask >> r) & 1)) { ok = false; break; } }
      if (ok) return h;
    }
    return 0;
  }
  function evalHand(cs) {
    var rc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sc = [0, 0, 0, 0], bs = [[], [], [], []], i, r;
    for (i = 0; i < cs.length; i++) { r = cRank(cs[i]); var s = cSuit(cs[i]); rc[r]++; sc[s]++; bs[s].push(r); }
    var fs = -1; for (i = 0; i < 4; i++) if (sc[i] >= 5) fs = i;
    if (fs >= 0) { var fm = 0; bs[fs].forEach(function (x) { fm |= 1 << x; }); var sfh = straightHigh(fm); if (sfh) return score(8, [sfh]); }
    var q = [], t = [], p = [], sg = [];
    for (r = 14; r >= 2; r--) { if (rc[r] === 4) q.push(r); else if (rc[r] === 3) t.push(r); else if (rc[r] === 2) p.push(r); else if (rc[r] === 1) sg.push(r); }
    if (q.length) { var rest = t.concat(p, sg).sort(function (a, b) { return b - a; }); return score(7, [q[0], rest[0] || 0]); }
    if (t.length && (t.length > 1 || p.length)) return score(6, [t[0], Math.max(t[1] || 0, p[0] || 0)]);
    if (fs >= 0) return score(5, bs[fs].sort(function (a, b) { return b - a; }).slice(0, 5));
    var m = 0; for (r = 2; r <= 14; r++) if (rc[r]) m |= 1 << r;
    var sh = straightHigh(m); if (sh) return score(4, [sh]);
    if (t.length) return score(3, [t[0]].concat(sg.slice(0, 2)));
    if (p.length >= 2) { var kk = p.slice(2).concat(sg).sort(function (a, b) { return b - a; }); return score(2, [p[0], p[1], kk[0] || 0]); }
    if (p.length === 1) return score(1, [p[0]].concat(sg.slice(0, 3)));
    return score(0, sg.slice(0, 5));
  }

  // hands: [[c|null, c|null], ...], board: [c|null x5]
  function equity(hands, board) {
    var used = {}, i, j;
    hands.forEach(function (h) { h.forEach(function (c) { if (c != null) used[c] = 1; }); });
    board.forEach(function (c) { if (c != null) used[c] = 1; });
    var deck = []; for (i = 0; i < 52; i++) if (!used[i]) deck.push(i);
    var unknown = 0; hands.forEach(function (h) { h.forEach(function (c) { if (c == null) unknown++; }); });
    var bMissing = board.filter(function (c) { return c == null; }).length;
    var n = hands.length, win = new Array(n).fill(0), tie = new Array(n).fill(0), total = 0;
    var kb = board.filter(function (c) { return c != null; });

    function evalRound(fill) { // fill: cards for unknown slots, hands first then board
      var i, j, k = 0, hs = [], b = kb.slice();
      for (i = 0; i < n; i++) { var hh = []; for (j = 0; j < 2; j++) hh.push(hands[i][j] != null ? hands[i][j] : fill[k++]); hs.push(hh); }
      for (i = 0; i < bMissing; i++) b.push(fill[k++]);
      var best = -1, scores = [];
      for (i = 0; i < n; i++) { var sc = evalHand(hs[i].concat(b)); scores.push(sc); if (sc > best) best = sc; }
      var winners = []; for (i = 0; i < n; i++) if (scores[i] === best) winners.push(i);
      if (winners.length === 1) win[winners[0]]++; else winners.forEach(function (w) { tie[w]++; });
      total++;
    }

    var need = unknown + bMissing;
    if (unknown === 0 && bMissing <= 2) {
      if (bMissing === 0) evalRound([]);
      else if (bMissing === 1) for (i = 0; i < deck.length; i++) evalRound([deck[i]]);
      else for (i = 0; i < deck.length; i++) for (j = i + 1; j < deck.length; j++) evalRound([deck[i], deck[j]]);
    } else {
      var iters = n > 4 ? 6000 : 10000, d = deck.slice();
      for (var it = 0; it < iters; it++) {
        for (i = 0; i < need; i++) { var r = i + Math.floor(Math.random() * (d.length - i)); var tmp = d[i]; d[i] = d[r]; d[r] = tmp; }
        evalRound(d.slice(0, need));
      }
    }
    return hands.map(function (_, idx) {
      var w = win[idx] / total * 100, t = tie[idx] / total * 100;
      return { win: w, tie: t, lose: Math.max(0, 100 - w - t) };
    });
  }

  var calcO = makeOverlay('sk-calc');
  var calc = null; // {board:[5], hands:[{name, cards:[2]}], active:{t:'b',i}|{t:'h',i,j}}
  function defaultCalc() {
    var names = getState().players.map(function (p) { return p.name; });
    var hs = [];
    for (var i = 0; i < 2; i++) hs.push({ name: names[i] || ('שחקן ' + (i + 1)), cards: [null, null] });
    return { board: [null, null, null, null, null], hands: hs, active: { t: 'h', i: 0, j: 0 } };
  }
  function usedSet() {
    var u = {};
    calc.board.forEach(function (c) { if (c != null) u[c] = 1; });
    calc.hands.forEach(function (h) { h.cards.forEach(function (c) { if (c != null) u[c] = 1; }); });
    return u;
  }
  function nextEmpty() {
    var i, j;
    for (i = 0; i < calc.hands.length; i++) for (j = 0; j < 2; j++) if (calc.hands[i].cards[j] == null) return { t: 'h', i: i, j: j };
    for (i = 0; i < 5; i++) if (calc.board[i] == null) return { t: 'b', i: i };
    return null;
  }
  function slotHTML(c, isActive, attrs) {
    return '<button type="button" class="sk-slot' + (c != null ? ' filled' : '') + (isActive ? ' active' : '') + '" ' + attrs + '>' + (c != null ? cardHTML(c) : '—') + '</button>';
  }
  var calcTimer = null;
  function renderCalc() {
    var a = calc.active, u = usedSet();
    var board = calc.board.map(function (c, i) { return slotHTML(c, a && a.t === 'b' && a.i === i, 'data-b="' + i + '" aria-label="קלף שולחן ' + (i + 1) + '"'); }).join('');
    var hands = calc.hands.map(function (h, i) {
      return '<div class="sk-hand"><span class="nm">' + esc(h.name) + '</span>' +
        slotHTML(h.cards[0], a && a.t === 'h' && a.i === i && a.j === 0, 'data-h="' + i + '" data-j="0" aria-label="קלף ראשון של ' + esc(h.name) + '"') +
        slotHTML(h.cards[1], a && a.t === 'h' && a.i === i && a.j === 1, 'data-h="' + i + '" data-j="1" aria-label="קלף שני של ' + esc(h.name) + '"') +
        (calc.hands.length > 2 ? '<button type="button" class="sk-x" data-rm="' + i + '" aria-label="הסר יד">✕</button>' : '<span></span>') + '</div>';
    }).join('');
    var deck = '';
    for (var s = 0; s < 4; s++) for (var r = 12; r >= 0; r--) {
      var c = r * 4 + s;
      deck += '<button type="button" class="sk-dc' + ((s === 1 || s === 2) ? ' red' : '') + (u[c] ? ' used' : '') + '" data-c="' + c + '"' + (u[c] ? ' disabled' : '') + ' aria-label="' + RANKS[r] + SUITS[s] + '">' + RANKS[r] + '<span>' + SUITS[s] + '</span></button>';
    }
    var sheet = calcO.firstChild;
    sheet.innerHTML =
      '<button type="button" class="sk-iconbtn sk-close" id="sk-calc-close" aria-label="סגור">✕</button>' +
      '<div class="sk-grab"></div><h3>מחשבון פוקר</h3><p class="sk-note" style="margin-bottom:4px">חשב סיכויים בזמן אמת</p>' +
      '<div class="sk-calc-sec">קלפי קהילה</div><div class="sk-board">' + board + '</div>' +
      '<div class="sk-calc-sec">ידיים של שחקנים</div>' + hands +
      (calc.hands.length < 6 ? '<button type="button" class="sk-addhand" id="sk-addhand">+ הוסף יד</button>' : '') +
      '<div class="sk-calc-sec">חפיסה</div><div class="sk-deck">' + deck + '</div>' +
      '<div class="sk-calc-sec">תוצאות</div><div class="sk-res" id="sk-res"><div class="sk-hint">מחשב…</div></div>' +
      '<div class="sk-calc-actions"><button type="button" class="sk-btn" id="sk-calc-reset">' + ICON.reset + 'אפס</button><button type="button" class="sk-btn green" id="sk-calc-clear">' + ICON.trash + 'נקה</button></div>' +
      '<p class="sk-hint">לחץ על משבצת ואז על קלף מהחפיסה. לחיצה על קלף שנבחר מסירה אותו.</p>';

    $('sk-calc-close').onclick = function () { closeOverlay(calcO); };
    sheet.querySelectorAll('[data-b]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-b');
        if (calc.board[i] != null) { calc.board[i] = null; }
        calc.active = { t: 'b', i: i }; renderCalc();
      };
    });
    sheet.querySelectorAll('[data-h]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-h'), j = +b.getAttribute('data-j');
        if (calc.hands[i].cards[j] != null) { calc.hands[i].cards[j] = null; }
        calc.active = { t: 'h', i: i, j: j }; renderCalc();
      };
    });
    sheet.querySelectorAll('[data-rm]').forEach(function (b) {
      b.onclick = function () { calc.hands.splice(+b.getAttribute('data-rm'), 1); calc.active = nextEmpty(); renderCalc(); };
    });
    sheet.querySelectorAll('[data-c]').forEach(function (b) {
      b.onclick = function () {
        var c = +b.getAttribute('data-c'), a2 = calc.active || nextEmpty();
        if (!a2) return toast('כל המשבצות מלאות — לחץ על קלף כדי להחליף');
        if (a2.t === 'b') calc.board[a2.i] = c; else calc.hands[a2.i].cards[a2.j] = c;
        calc.active = nextEmpty(); renderCalc();
      };
    });
    var add = $('sk-addhand');
    if (add) add.onclick = function () {
      var names = getState().players.map(function (p) { return p.name; });
      var n = calc.hands.length;
      calc.hands.push({ name: names[n] || ('שחקן ' + (n + 1)), cards: [null, null] });
      calc.active = { t: 'h', i: n, j: 0 }; renderCalc();
    };
    $('sk-calc-clear').onclick = function () {
      calc.board = [null, null, null, null, null];
      calc.hands.forEach(function (h) { h.cards = [null, null]; });
      calc.active = nextEmpty(); renderCalc();
    };
    $('sk-calc-reset').onclick = function () { calc = defaultCalc(); renderCalc(); };

    clearTimeout(calcTimer);
    calcTimer = setTimeout(function () {
      var box = $('sk-res'); if (!box) return;
      var anyHand = calc.hands.some(function (h) { return h.cards[0] != null || h.cards[1] != null; });
      if (!anyHand) { box.innerHTML = '<div class="sk-hint">בחר לפחות קלף אחד לאחד השחקנים</div>'; return; }
      var res = equity(calc.hands.map(function (h) { return h.cards; }), calc.board);
      function f(x) { return x.toFixed(1) + '%'; }
      box.innerHTML = res.map(function (r, i) {
        return '<div class="sk-resrow"><span class="nm">' + esc(calc.hands[i].name) + '</span>' +
          '<div class="sk-cell w"><small>ניצחון</small><b>' + f(r.win) + '</b></div>' +
          '<div class="sk-cell t"><small>תיקו</small><b>' + f(r.tie) + '</b></div>' +
          '<div class="sk-cell l"><small>הפסד</small><b>' + f(r.lose) + '</b></div></div>';
      }).join('');
    }, 30);
  }
  window.wnCalc = {
    open: function () { if (!calc) calc = defaultCalc(); renderCalc(); openOverlay(calcO); },
    close: function () { closeOverlay(calcO); },
    isOpen: function () { return calcO.classList.contains('show'); },
    _equity: equity, _eval: evalHand
  };
  calcO.onclose = function () { if (window.wnNavSetActive) window.wnNavSetActive('game'); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

/* עדכון אוטומטי: כשחוזרים לאפליקציה ויש גרסה חדשה באתר — היא נטענת לבד */
(function () {
  'use strict';
  var base = null, busy = false;
  function sig(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h + ':' + t.length; }
  function clean(t) { return t.replace(/<script async src="\/\.netlify[\s\S]*$/, '').replace(/<!-- This site is hosted on Netlify[\s\S]*?-->/, ''); }
  function check() {
    if (busy) return; busy = true;
    fetch('/index.html', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : null; }).then(function (t) {
      busy = false; if (!t) return;
      var s = sig(clean(t));
      if (base === null) { base = s; return; }
      if (s !== base) {
        var typing = document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
        if (!typing) location.reload();
      }
    }).catch(function () { busy = false; });
  }
  check();
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
  setInterval(check, 5 * 60 * 1000);
})();
