/* skin.js — עיצוב חדש: מסך ערב פוקר, סגירת חשבון ומחשבון סיכויים */
(function () {
  'use strict';

  var G = window.wwcdGame;
  if (!G) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
  /* מצב נקודות: האפליקציה סופרת נקודות במקום שקלים. ברירת מחדל: נקודות באפליקציה המותקנת, שקלים באתר. */
  var UNIT_KEY = 'wwcd_unit';
  function isPoints() {
    var v = null; try { v = localStorage.getItem(UNIT_KEY); } catch (e) {}
    if (v === 'points') return true;
    if (v === 'nis') return false;
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }
  function setUnit(u) { try { localStorage.setItem(UNIT_KEY, u); } catch (e) {} }
  function CUR() { return isPoints() ? 'נק׳' : '₪'; }
  function money(n) {
    var v = Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 });
    return isPoints() ? v + ' נק׳' : '₪' + v;
  }
  function num(n) { return Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 }); }
  function signed(n) { n = Math.round(Number(n || 0) * 100) / 100; return n > 0.009 ? '+' + money(n) : n < -0.009 ? '−' + money(-n) : money(0); }
  function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
  function uid(p) { return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9); }

  /* ---------- אנימציות ג׳טונים וקלפים ---------- */
  function motionOK() { return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function sound() { try { if (typeof window.playActionSound === 'function') window.playActionSound(); } catch (e) {} }
  function burst(target) {
    if (!motionOK() || !target) return;
    try { if (typeof window.chipBurst === 'function') return window.chipBurst(target); } catch (e) {}
  }
  function pulsePot() {
    var e = document.querySelector('#sk-root .sk-pot');
    if (!e || !motionOK()) return;
    e.classList.remove('pot-pulse'); void e.offsetWidth; e.classList.add('pot-pulse');
  }
  function dealCards(target, n) {
    var layer = document.getElementById('fxLayer');
    if (!motionOK() || !layer || !target) return;
    var r = target.getBoundingClientRect(), suits = ['♠', '♥', '♦', '♣'];
    for (var i = 0; i < (n || 5); i++) {
      var c = document.createElement('div');
      c.className = 'fx-card';
      var su = suits[i % 4];
      c.textContent = su;
      if (su === '♥' || su === '♦') c.style.color = '#d32f2f';
      c.style.left = Math.min(window.innerWidth - 40, Math.max(10, r.left + r.width / 2 - 25)) + 'px';
      c.style.top = Math.min(window.innerHeight - 90, Math.max(60, r.top + Math.min(r.height / 2, 60) - 34)) + 'px';
      c.style.setProperty('--fan', ((i - 2) * 46) + 'px');
      c.style.setProperty('--angle', ((i - 2) * 9) + 'deg');
      c.style.animationDelay = (i * 70) + 'ms';
      layer.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 1500); })(c);
    }
  }
  function fx(target, opts) {
    opts = opts || {};
    sound();
    if (opts.cards) dealCards(target, opts.cards); else burst(target);
    if (opts.pot) setTimeout(pulsePot, 60);
  }
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
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    logout: '<svg viewBox="0 0 24 24"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/></svg>',
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
    '.sk-logo{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-size:26px;color:#fff;background:linear-gradient(145deg,#2a2a2a,#050505);border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 6px 14px rgba(0,0,0,.35)}',
    '.sk-title{font-weight:800;font-size:16px;line-height:1.2}.sk-sub{color:var(--sk-muted);font-size:12px}',
    '.sk-iconbtn{flex:none;width:42px;height:42px;border-radius:14px;border:1px solid var(--sk-line);background:rgba(255,255,255,.05);color:var(--sk-text);display:grid;place-items:center;padding:0;cursor:pointer}',
    /* מיקרו-אנימציות */
    '.sk-btn,.sk-iconbtn,.sk-pm,.wn-item,.sk-quick button,.sk-addhand,.sk-profile-logout{position:relative;overflow:hidden;transition:transform .16s cubic-bezier(.2,.8,.2,1),box-shadow .2s,background-color .2s,filter .2s,border-color .2s}',
    '.sk-ripple{position:absolute;border-radius:50%;background:currentColor;opacity:.18;transform:scale(0);pointer-events:none;animation:skRipple .55s ease-out forwards}',
    '@keyframes skRipple{to{transform:scale(1);opacity:0}}',
    '.sk-btn:focus-visible,.sk-iconbtn:focus-visible,.sk-pm:focus-visible,.sk-slot:focus-visible,.sk-dc:focus-visible{outline:2px solid var(--sk-gold);outline-offset:3px}',
    '.sk-player{transition:background-color .2s,border-color .2s,transform .2s}',
    '.sk-chip{cursor:pointer}.sk-chip.sk-spin{animation:skSpin .7s cubic-bezier(.2,.8,.2,1)!important}@keyframes skSpin{0%{transform:rotate(0) scale(1)}50%{transform:rotate(200deg) scale(1.15)}100%{transform:rotate(360deg) scale(1)}}',
    '.sk-slot,.sk-dc{transition:transform .15s,box-shadow .15s,opacity .2s}',
    '.sk-slot.filled .sk-pc{animation:skCardIn .28s cubic-bezier(.2,.8,.2,1)}@keyframes skCardIn{from{transform:translateY(-10px) rotate(-6deg) scale(.9);opacity:.3}to{transform:none;opacity:1}}',
    '.sk-cell b{transition:color .2s}',
    '.sk-ok,.sk-warn{animation:skFade .3s ease}',
    '.sk-overlay.show{animation:skFade .2s ease}@keyframes skFade{from{opacity:0}to{opacity:1}}',
    '@keyframes skIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '.sk-enter .sk-col>*,.sk-enter>.sk-topnav,.sk-enter>.sk-guest-banner{animation:skIn .45s cubic-bezier(.2,.8,.2,1) both}',
    '.sk-enter .sk-col>*:nth-child(2){animation-delay:.06s}.sk-enter .sk-col>*:nth-child(3){animation-delay:.12s}.sk-enter .sk-col>*:nth-child(4){animation-delay:.18s}.sk-enter .sk-col>*:nth-child(5){animation-delay:.24s}',
    '.sk-enter .sk-col-b>*{animation-delay:.1s}.sk-enter .sk-col-b>*:nth-child(2){animation-delay:.16s}.sk-enter .sk-col-b>*:nth-child(3){animation-delay:.22s}.sk-enter .sk-col-b>*:nth-child(4){animation-delay:.28s}',
    '.sk-enter .sk-player{animation:skIn .4s cubic-bezier(.2,.8,.2,1) both}.sk-enter .sk-player:nth-child(2){animation-delay:.05s}.sk-enter .sk-player:nth-child(3){animation-delay:.1s}.sk-enter .sk-player:nth-child(4){animation-delay:.15s}.sk-enter .sk-player:nth-child(n+5){animation-delay:.2s}',
    '@media(hover:hover){.sk-btn:hover{transform:translateY(-1px);filter:brightness(1.07)}.sk-btn.green:hover{box-shadow:0 10px 24px rgba(47,212,124,.3)}.sk-iconbtn:hover{background:rgba(255,255,255,.1)}.sk-pm:hover{transform:scale(1.1)}.sk-player:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1)}.sk-dc:not(.used):hover{transform:translateY(-3px);box-shadow:0 6px 12px rgba(0,0,0,.35)}.sk-slot:hover{transform:translateY(-2px)}.sk-chip:hover{animation-duration:1.4s}}',
    '.sk-btn:active,.sk-iconbtn:active{transform:scale(.96)}.sk-pm:active{transform:scale(.88)}',
    '@media(prefers-reduced-motion:reduce){.sk-ripple,.sk-enter *{animation:none!important}.sk-btn,.sk-pm,.sk-player{transition:none!important}}',
    /* פריסה: טלפון — עמודה אחת; מחשב — שתי עמודות */
    '.sk-col{display:contents}',
    '.sk-pot span{white-space:nowrap}',
    '@media(max-width:420px){.sk-title{font-size:14px}.sk-iconbtn.sk-out span,.sk-iconbtn.sk-adm span{display:none}.sk-iconbtn.sk-adm{width:42px;padding:0;justify-content:center}.sk-iconbtn.sk-out{width:42px;padding:0;justify-content:center}.sk-name .sk-tag{display:table;margin:2px 0 0}.sk-pot{padding:10px 12px}.sk-pot span{font-size:12px}}',
    '@media(max-width:380px){#sk-root{gap:12px}.sk-card{padding:13px;border-radius:20px}.sk-player{gap:7px;padding:9px 10px}.sk-amt{min-width:52px;font-size:15px}.sk-pm{width:32px;height:32px}.sk-av{width:34px;height:34px}.sk-pot strong{font-size:21px}.sk-ratio-row{grid-template-columns:1fr auto 1.2fr;}.sk-ratio-row .sk-btn{grid-column:1/-1}.sk-stepper input{width:80px}}',
    '@media(min-width:900px){',
    '  body.sk-on:not(.room-view-active) #tableCard{max-width:1080px}',
    '  #sk-root{max-width:1080px;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:22px;align-items:start;padding-top:10px}',
    '  .sk-col{display:grid;gap:18px;align-content:start}',
    '  .sk-col-a{position:sticky;top:16px}',
    '  #sk-root>.sk-guest-banner,#sk-root>.sk-topnav{grid-column:1/-1}',
    '  .sk-card{padding:20px;border-radius:26px}',
    '  .sk-actions .sk-btn{flex-direction:row;min-height:56px;font-size:15px;gap:8px}',
    '  .sk-player{padding:12px 16px}.sk-amt{font-size:18px;min-width:80px}',
    '  .sk-pm{width:38px;height:38px}',
    '  .sk-overlay{align-items:center;padding:24px}',
    '  .sk-sheet{border-radius:26px;max-height:88vh;padding:16px 24px 22px;box-shadow:0 30px 90px rgba(0,0,0,.55)}',
    '  #sk-calc .sk-sheet{width:min(780px,100%)}',
    '  #sk-calc .sk-dc{font-size:13px;aspect-ratio:auto;height:48px}#sk-calc .sk-dc span{font-size:15px}',
    '  #sk-calc .sk-board{max-width:420px}',
    '  .sk-board{max-width:520px;margin:0 auto}',
    '  .sk-grab{display:none}',
    '}',
    '.sk-btn.sk-reset{width:100%;min-height:50px;color:#ff8a8e;border-color:rgba(229,72,77,.35);background:rgba(229,72,77,.08)}',
    '.sk-iconbtn.sk-adm{width:auto;padding:0 12px;gap:6px;display:inline-flex;align-items:center;color:var(--sk-gold);border-color:rgba(242,201,76,.35);background:rgba(242,201,76,.08);font:inherit;font-weight:900;font-size:12px;letter-spacing:.04em}',
    '.admin-terms{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;margin-inline-end:8px;vertical-align:middle;font-size:13px;font-weight:900}',
    '.admin-terms.ok{background:rgba(47,212,124,.18);color:#2fd47c;box-shadow:0 0 0 1px rgba(47,212,124,.4)}',
    '.admin-terms.no{background:rgba(255,255,255,.06);color:#9fb3a6}',
    'body.room-authenticated #sk-legal{display:none}',
    '.sk-delete-link{display:block;margin:12px auto 0;border:0;background:none;color:#c98b8e;font:inherit;font-size:.8rem;text-decoration:underline;cursor:pointer}',
    '.sk-field{min-width:0}.sk-field input{min-width:0;width:100%;box-sizing:border-box}',
    /* מצב ריק מזמין */
    '.sk-empty-rich{display:grid;justify-items:center;gap:6px;padding:22px 16px;border-style:dashed}',
    '.sk-empty-rich b{font-size:17px;color:var(--sk-text)}.sk-empty-rich>span{font-size:13px}',
    '.sk-empty-rich .sk-btn{margin-top:8px}',
    '.sk-empty-cards{position:relative;width:86px;height:64px;margin-bottom:4px}',
    '.sk-empty-cards span{position:absolute;top:0;width:44px;height:60px;border-radius:8px;background:#fbfaf6;color:#151515;font:900 15px/1 Georgia,serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 6px 14px rgba(0,0,0,.35);animation:skDeal 3.6s ease-in-out infinite}',
    '.sk-empty-cards span i{font-style:normal;font-size:20px}.sk-empty-cards span:first-child{left:6px;transform:rotate(-12deg)}.sk-empty-cards span.red{right:6px;color:#d32f2f;transform:rotate(12deg);animation-delay:-1.8s}',
    '@keyframes skDeal{0%,100%{translate:0 0}50%{translate:0 -5px}}',
    /* שולחן משותף בעיצוב החדש */
    '#sk-table-slot:empty{display:none}',
    '#sk-root .table-card{margin:0;border:1px solid rgba(242,201,76,.22);border-radius:24px;padding:14px 16px;background:linear-gradient(150deg,rgba(242,201,76,.10),rgba(13,35,24,.9));box-shadow:0 10px 30px rgba(0,0,0,.22)}',
    '#sk-root .table-empty-text strong{display:flex;align-items:center;gap:8px;font-size:16px}',
    '#sk-root .table-empty-text strong::before{content:"♣";display:grid;place-items:center;width:28px;height:28px;border-radius:9px;background:rgba(242,201,76,.16);color:#f2c94c;font-size:15px}',
    '#sk-root .table-empty-actions .btn,#sk-root .table-active-actions .btn{min-height:44px;border-radius:14px;font-weight:800}',
    '#sk-root #openCreateRoomBtn{background:linear-gradient(180deg,#36dd85,#1fb565);color:#062012;border:0;box-shadow:0 6px 16px rgba(47,212,124,.22)}',
    '#sk-root .table-link{color:#f2c94c}',
    '@media(max-width:520px){#sk-root .table-empty{grid-template-columns:1fr}#sk-root .table-empty-actions{display:grid;grid-template-columns:1fr 1fr}}',
    /* עמוד פתיחה */
    '#sk-landing{display:none}',
    'body.sk-on:not(.room-authenticated):not(.wn-guest) .shell{display:flex!important;flex-direction:column}',
    'body.sk-on:not(.room-authenticated):not(.wn-guest) .shell>#sk-landing{order:2}',
    'body.sk-on:not(.room-authenticated):not(.wn-guest) .shell>#sk-landing{display:grid!important;gap:14px;margin-top:18px;animation:sklIn .6s ease both}',
    '@keyframes sklIn{from{opacity:0;transform:translateY(14px)}}',
    '.skl-hero{position:relative;overflow:hidden;padding:22px 20px;border-radius:26px;border:1px solid rgba(242,201,76,.22);background:radial-gradient(ellipse at 80% 0%,rgba(242,201,76,.16),transparent 55%),linear-gradient(160deg,#103222,#071710);text-align:center}',
    '.skl-kicker{display:inline-block;padding:5px 12px;border-radius:99px;background:rgba(47,212,124,.12);color:#5fe39b;font-size:12px;font-weight:800}',
    '.skl-hero h1{margin:12px 0 8px;font:900 30px/1.12 Georgia,"Times New Roman",serif;color:#fff;direction:ltr}',
    '.skl-hero h1 em{color:#f2c94c;font-style:italic}',
    '.skl-hero p{margin:0 auto;max-width:420px;color:#b9c7bd;font-size:14.5px;line-height:1.65}',
    '.skl-chips i{position:absolute;width:34px;height:34px;border-radius:50%;opacity:.55;border:4px dashed rgba(255,255,255,.75);animation:sklFloat 6s ease-in-out infinite}',
    '.skl-chips .c1{background:#d63c3c;top:14px;left:14px}.skl-chips .c2{background:#2a6fd6;bottom:16px;right:16px;animation-delay:-2s}.skl-chips .c3{background:#1f9e5a;top:46%;left:-8px;animation-delay:-4s;width:26px;height:26px}.skl-chips .c4{background:#222;top:12px;right:22%;animation-delay:-3s;width:22px;height:22px;border-width:3px}',
    '@keyframes sklFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-8px) rotate(25deg)}}',
    '.skl-feats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
    '.skl-f{display:grid;gap:4px;justify-items:center;text-align:center;padding:14px 8px;border-radius:20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);transition:transform .2s,border-color .2s}',
    '.skl-f:hover{transform:translateY(-3px);border-color:rgba(242,201,76,.35)}',
    '.skl-f span{font-size:24px}.skl-f b{color:#fff;font-size:14px}.skl-f small{color:#9fb3a6;font-size:11.5px;line-height:1.45}',
    '.skl-steps{list-style:none;margin:0;padding:12px;display:grid;gap:8px;border-radius:20px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.06)}',
    '.skl-steps li{display:flex;align-items:center;gap:10px;color:#d9e3dc;font-size:14px}',
    '.skl-steps b{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#f2c94c;color:#1b1503;font-size:13px}',
    '.skl-foot{text-align:center;color:#7f978a;font-size:12px}.skl-foot a{color:#f2c94c}',
    '@media(max-width:420px){.skl-feats{grid-template-columns:1fr}.skl-f{grid-template-columns:auto 1fr;justify-items:start;text-align:start;column-gap:12px;padding:12px 14px}.skl-f span{grid-row:span 2;font-size:26px}.skl-hero h1{font-size:27px}}',
    '@media(min-width:900px){',
    '  body.sk-on:not(.room-authenticated):not(.wn-guest) .shell{width:min(1080px,100%)!important;display:grid!important;grid-template-columns:minmax(0,1.1fr) minmax(0,520px);gap:28px;align-items:center}',
    '  body.sk-on:not(.room-authenticated):not(.wn-guest) .shell>#sk-landing{margin:0;order:0}',
    '  body.sk-on:not(.room-authenticated):not(.wn-guest) .shell>.room-hub{order:1}',
    '  .skl-hero{padding:34px 30px}.skl-hero h1{font-size:42px}',
    '}',
    '@media(prefers-reduced-motion:reduce){.skl-chips i,#sk-landing,.sk-empty-cards span{animation:none!important}}',
    '.sk-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:14px;background:rgba(0,0,0,.25);border:1px solid var(--sk-line)}',
    '.sk-seg button{height:40px;border:0;border-radius:10px;background:transparent;color:var(--sk-muted);font:inherit;font-weight:800;cursor:pointer;transition:background .2s,color .2s}',
    '.sk-seg button[aria-checked="true"]{background:var(--sk-green);color:#062012}',
    '.member-more{border:0;background:rgba(255,255,255,.08);color:var(--sk-text,#f3f6f2);border-radius:8px;padding:0 8px;margin-inline-start:6px;font:inherit;font-weight:900;cursor:pointer;line-height:1.6}',
    '.sk-reasons{display:grid;gap:8px;margin-bottom:12px}.sk-reasons label{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);cursor:pointer}',
    '.sk-reasons input{accent-color:#2fd47c;width:18px;height:18px}',
    '.sk-headbtns{display:flex;gap:8px;flex:none}',
    '.sk-iconbtn.sk-out{width:auto;padding:0 12px;gap:6px;display:inline-flex;align-items:center;color:#ff8a8e;border-color:rgba(229,72,77,.3);background:rgba(229,72,77,.08);font:inherit;font-weight:800;font-size:13px}',
    '.sk-profile-logout{width:100%;margin-top:10px;min-height:46px;border-radius:14px;border:1px solid rgba(229,72,77,.35);background:rgba(229,72,77,.1);color:#ff8a8e;font:inherit;font-weight:800;cursor:pointer}',
    '.sk-row2{display:grid;grid-template-columns:1.3fr 1fr;gap:10px;margin-top:14px}',
    '.sk-pot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-radius:16px;border:1px solid rgba(242,201,76,.28);background:rgba(242,201,76,.07)}',
    '.sk-pot span{color:var(--sk-muted);font-size:13px}.sk-pot strong{color:var(--sk-gold);font-size:24px;font-weight:900;direction:ltr}',
    '.sk-btn{border:0;border-radius:16px;min-height:48px;padding:10px 14px;font:inherit;font-weight:800;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;color:var(--sk-text);background:rgba(255,255,255,.07);border:1px solid var(--sk-line)}',
    '.sk-btn.green{background:linear-gradient(180deg,#36dd85,#1fb565);color:#062012;border-color:transparent;box-shadow:0 6px 18px rgba(47,212,124,.22)}',
    '.sk-btn:active,.sk-iconbtn:active,.sk-pm:active{transform:scale(.96)}',
    '.sk-hero{text-align:center;padding:4px 0 0}',
    '.sk-kicker{color:var(--sk-gold);font-weight:900;font-size:clamp(15px,4.4vw,18px);letter-spacing:.03em;direction:ltr}',
    '.sk-chips{display:flex;justify-content:center;gap:8px;margin:12px 0 6px}',
    '.sk-chip{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:20px;border:5px dashed rgba(255,255,255,.85);box-shadow:0 6px 14px rgba(0,0,0,.35),inset 0 0 0 3px rgba(0,0,0,.15)}',
    '.sk-chip{animation:skFloat 4.5s ease-in-out infinite}.sk-chip:nth-child(2){animation-delay:-1.5s}.sk-chip:nth-child(3){animation-delay:-3s}',
    '@keyframes skFloat{0%,100%{transform:translateY(0) rotate(-10deg)}50%{transform:translateY(-7px) rotate(14deg)}}',
    '.sk-chips:hover .sk-chip,.sk-chip:active{animation-duration:1.2s}',
    '.sk-logo{animation:skLogo 6s ease-in-out infinite}@keyframes skLogo{0%,90%,100%{transform:rotate(0)}94%{transform:rotate(-8deg)}97%{transform:rotate(6deg)}}',
    '.sk-pot.pot-pulse{animation:potPulse .65s ease}',
    '.sk-pot{position:relative;overflow:hidden}',
    '.sk-pot::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,236,160,.22) 50%,transparent 65%);transform:translateX(-120%);animation:skShine 7s ease-in-out 2s infinite;pointer-events:none}',
    '.sk-pot.sk-shine::after{animation:skShineFast .9s ease-out}',
    '@keyframes skShine{0%,80%{transform:translateX(-120%)}100%{transform:translateX(120%)}}@keyframes skShineFast{from{transform:translateX(-120%)}to{transform:translateX(120%)}}',
    '.sk-pot-lbl{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}',
    '.sk-pot strong{white-space:nowrap;font-size:clamp(19px,5.6vw,24px)}',
    '.sk-pot{flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;min-width:0}',
    '.sk-pot strong{line-height:1.1;align-self:flex-end}',
    '@media(max-width:420px){.sk-row2{grid-template-columns:1.5fr 1fr}.sk-pot{padding:8px 12px}.sk-pot-lbl{gap:6px;font-size:12px}.sk-row2 .sk-btn{padding:10px 8px}}',
    '.sk-stack{position:relative;display:inline-block;width:18px;height:18px;flex:none}',
    '.sk-stack b{position:absolute;left:0;width:18px;height:6px;border-radius:50%;border:1.5px dashed rgba(255,255,255,.7);box-sizing:border-box}',
    '.sk-stack b:nth-child(1){bottom:0;background:#d93a3f}.sk-stack b:nth-child(2){bottom:5px;background:#1f9d62}.sk-stack b:nth-child(3){bottom:10px;background:#d9a21f;animation:skTop 3.2s ease-in-out infinite}',
    '@keyframes skTop{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}',
    '.sk-stack.bump{animation:skStack .55s cubic-bezier(.2,.8,.2,1)}@keyframes skStack{30%{transform:translateY(-5px) scale(1.15)}60%{transform:translateY(1px) scale(.95)}}',
    '.sk-delta{position:absolute;left:14px;top:6px;font-weight:900;font-size:15px;pointer-events:none;animation:skDelta 1.2s ease-out forwards;direction:ltr}',
    '.sk-delta.up{color:#7dffb5}.sk-delta.down{color:#ff8a8e}',
    '@keyframes skDelta{0%{opacity:0;transform:translateY(10px) scale(.8)}20%{opacity:1;transform:translateY(0) scale(1.1)}100%{opacity:0;transform:translateY(-22px) scale(1)}}',
    '.sk-fly{position:fixed;width:26px;height:26px;border-radius:50%;border:4px dashed rgba(255,255,255,.85);box-shadow:0 6px 14px rgba(0,0,0,.4);z-index:300;pointer-events:none;animation:skFly .8s cubic-bezier(.5,0,.2,1) both}',
    '@keyframes skFly{0%{opacity:0;transform:translate(0,0) scale(.6)}15%{opacity:1}70%{opacity:1;transform:translate(calc(var(--tx)*.7),calc(var(--ty)*.7 - 40px)) scale(1) rotate(200deg)}100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(.5) rotate(360deg)}}',
    '@media(prefers-reduced-motion:reduce){.sk-pot::after,.sk-stack b,.sk-stack,.sk-fly,.sk-delta{animation:none!important}}',
    '.sk-player.sk-pop{animation:skPop .5s cubic-bezier(.2,.8,.2,1)}@keyframes skPop{0%{transform:scale(.96);background:rgba(47,212,124,.18)}100%{transform:none}}',
    '.sk-player.sk-drop{animation:skDrop .45s ease}@keyframes skDrop{0%{background:rgba(229,72,77,.18)}100%{background:rgba(255,255,255,.035)}}',
    '.sk-amt.sk-bump{animation:skBump .5s ease}@keyframes skBump{40%{transform:scale(1.25);color:#fff}}',
    '@media(prefers-reduced-motion:reduce){.sk-chip,.sk-logo{animation:none!important}}',
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
      '<label class="sk-field">קנייה ראשונה (' + CUR() + ')<input id="sk-add-amt" type="number" inputmode="decimal" min="1" value="' + (last || 100) + '"></label>' +
      '<div class="sk-quick">' + [50, 100, 200, 300].map(function (v) { return '<button type="button" data-v="' + v + '">' + money(v) + '</button>'; }).join('') + '</div>' +
      '<div class="sk-sheet-actions"><button class="sk-btn" type="button" data-close>ביטול</button><button class="sk-btn green" type="button" id="sk-add-go">הוסף</button></div>';
    sheet.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { $('sk-add-amt').value = b.getAttribute('data-v'); }; });
    sheet.querySelector('[data-close]').onclick = function () { closeOverlay(addO); };
    function go() {
      var name = $('sk-add-name').value.trim(), amt = Number($('sk-add-amt').value);
      if (!name) { $('sk-add-name').focus(); return toast('כתוב את שם השחקן'); }
      if (!(amt > 0)) return toast('סכום הכניסה צריך להיות גדול מ-0');
      var s2 = getState();
      if (s2.players.some(function (p) { return p.name === name; })) return toast('כבר יש שחקן בשם הזה');
      var newId = uid('p');
      s2.players.push({ id: newId, name: name, buyHistory: [{ id: uid('buy'), amount: amt, kind: 'כניסה', at: Date.now() }], buyIn: amt, finalChips: 0 });
      save(s2);
      closeOverlay(addO);
      render();
      rowFx(newId, 'sk-pop', true);
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
      '<div class="sk-grab"></div><h3>הגדרות המשחק</h3><p class="sk-note">יחס לג׳טונים ופעולות נוספות</p>' +
      '<div class="sk-field">סופרים ב־<div class="sk-seg" role="radiogroup" aria-label="יחידת ספירה">' +
      '<button type="button" role="radio" data-unit="points" aria-checked="' + isPoints() + '">נקודות</button>' +
      '<button type="button" role="radio" data-unit="nis" aria-checked="' + !isPoints() + '">שקלים ₪</button></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:end">' +
      '<label class="sk-field">' + (isPoints() ? 'נקודות' : 'שקלים') + '<input id="sk-rm" type="number" inputmode="decimal" min="0.01" value="' + s.ratioMoney + '"></label>' +
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
      '</div>' +
      '<p style="text-align:center;margin:14px 0 0;font-size:13px"><a href="/privacy.html" target="_blank" rel="noopener" style="color:#f2c94c">מדיניות פרטיות</a> · <a href="/data-deletion.html" target="_blank" rel="noopener" style="color:#f2c94c">מחיקת חשבון</a></p>';
    sheet.querySelectorAll('[data-unit]').forEach(function (b) {
      b.onclick = function () { setUnit(b.getAttribute('data-unit')); lastPot = null; render(); openMenu(); toast(isPoints() ? 'מעכשיו סופרים בנקודות' : 'מעכשיו סופרים בשקלים'); };
    });
    $('sk-ratio-save').onclick = function () {
      var m = Number($('sk-rm').value), c = Number($('sk-rc').value);
      if (!(m > 0) || !(c > 0)) return toast('שני המספרים צריכים להיות גדולים מ-0');
      var s2 = getState(); s2.ratioMoney = m; s2.ratioChips = c; save(s2); render(); closeOverlay(menuO); fx($('sk-r-save'), { pot: true }); toast('היחס עודכן');
    };
    sheet.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-act');
        closeOverlay(menuO);
        if (a === 'login') return exitGuest();
        if (a === 'logout') return confirmLogout();
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

  function isAdmin() { var b = $('adminOpenBtn'); return !!(b && !b.hidden); }
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
      '<div class="sk-col sk-col-a">' +
      '<section class="sk-card">' +
      '<div class="sk-head"><div class="sk-brand"><div class="sk-logo">♠</div><div><div class="sk-title">Winner winner chicken dinner</div><div class="sk-sub">Poker Night</div></div></div>' +
      '<div class="sk-headbtns">' + (isAdmin() ? '<button class="sk-iconbtn sk-adm" type="button" id="sk-admin-btn" aria-label="ניהול" title="ניהול">' + ICON.shield + '<span>ADMIN</span></button>' : '') + (isGuestMode() ? '' : '<button class="sk-iconbtn sk-out" type="button" id="sk-logout-btn" aria-label="התנתק" title="התנתק">' + ICON.logout + '<span>יציאה</span></button>') +
      '<button class="sk-iconbtn" type="button" id="sk-menu-btn" aria-label="הגדרות">' + ICON.gear + '</button></div></div>' +
      '<div class="sk-row2"><div class="sk-pot"><span class="sk-pot-lbl"><i class="sk-stack" aria-hidden="true"><b></b><b></b><b></b></i>סה״כ בקופה</span><strong>' + money(pot) + '</strong></div>' +
      '<button class="sk-btn green" type="button" id="sk-share">' + ICON.share + 'שתף</button></div>' +
      '</section>' +
      '<div class="sk-hero"><div class="sk-kicker">Winner winner chicken dinner</div>' +
      '<div class="sk-chips"><div class="sk-chip r">♦</div><div class="sk-chip g">♣</div><div class="sk-chip y">♠</div></div>' +
      (code ? '<div class="sk-room">חדר <b>' + esc(code) + '</b></div>' : '') + '</div>' +
      '<div id="sk-table-slot"></div>' +
      '<section class="sk-card sk-ratio"><div class="sk-sec-title">' + (isPoints() ? 'יחס ג׳טונים לנקודות' : 'יחס ג׳טונים לשקל') + '<small>' + esc(chipLine(s)) + '</small></div>' +
      '<div class="sk-ratio-row"><label class="sk-rbox"><input id="sk-r-money" type="number" inputmode="decimal" min="0.01" value="' + s.ratioMoney + '" aria-label="' + (isPoints() ? 'נקודות' : 'שקלים') + '"><span>' + CUR() + '</span></label>' +
      '<b class="sk-eq">=</b>' +
      '<label class="sk-rbox"><input id="sk-r-chips" type="number" inputmode="numeric" min="1" value="' + s.ratioChips + '" aria-label="ג׳טונים"><span>ג׳טונים</span></label>' +
      '<button class="sk-btn green" type="button" id="sk-r-save">עדכן</button></div></section>' +
      '</div><div class="sk-col sk-col-b">' +
      '<section class="sk-card"><div class="sk-sec-title">שחקנים (' + s.players.length + ')<small>+ קנייה נוספת · − ביטול קנייה</small></div>' +
      '<div class="sk-list">' + (rows || '<div class="sk-empty sk-empty-rich"><div class="sk-empty-cards" aria-hidden="true"><span>A<i>♠</i></span><span class="red">K<i>♥</i></span></div><b>השולחן עוד ריק</b><span>מוסיפים שחקנים, והאפליקציה סופרת הכל לבד.</span><button class="sk-btn green" type="button" id="sk-add-first">' + ICON.addUser + 'הוסף את השחקן הראשון</button></div>') + '</div></section>' +
      '<div class="sk-actions">' +
      '<button class="sk-btn" type="button" id="sk-finish">' + ICON.flag + 'סיים משחק</button>' +
      '<button class="sk-btn" type="button" id="sk-invite">' + ICON.link + 'הזמן</button>' +
      '<button class="sk-btn green" type="button" id="sk-add-btn">' + ICON.addUser + 'הוסף שחקן</button>' +
      '</div></div>';
    countPot(pot);
    root.querySelectorAll('.sk-chip').forEach(function (c) {
      c.onclick = function () { if (!motionOK()) return; c.classList.remove('sk-spin'); void c.offsetWidth; c.classList.add('sk-spin'); sound(); };
    });

    $('sk-menu-btn').onclick = openMenu;
    if ($('sk-logout-btn')) $('sk-logout-btn').onclick = confirmLogout;
    if ($('sk-admin-btn')) $('sk-admin-btn').onclick = function () { var b = $('adminOpenBtn'); if (b) b.click(); };
    function saveRatio() {
      var m = Number($('sk-r-money').value), c = Number($('sk-r-chips').value);
      if (!(m > 0) || !(c > 0)) return toast('שני המספרים צריכים להיות גדולים מ-0');
      var s2 = getState(); s2.ratioMoney = m; s2.ratioChips = c; save(s2);
      document.activeElement && document.activeElement.blur && document.activeElement.blur();
      render(); fx($('sk-r-save'), { pot: true }); toast('היחס עודכן');
    }
    $('sk-r-save').onclick = saveRatio;
    ['sk-r-money', 'sk-r-chips'].forEach(function (id) { $(id).onkeydown = function (e) { if (e.key === 'Enter') saveRatio(); }; });
    $('sk-guest-login').onclick = exitGuest;
    $('sk-share').onclick = function () { var b = $('shareAppBtn'); if (b) b.click(); };
    $('sk-add-btn').onclick = openAdd;
    if ($('sk-add-first')) $('sk-add-first').onclick = openAdd;
    $('sk-invite').onclick = invite;
    $('sk-finish').onclick = function () {
      if (getState().players.length < 2) return toast('צריך לפחות שני שחקנים');
      view = 'settle'; render(); window.scrollTo({ top: 0 }); fx($('sk-root'), { cards: 5 });
    };
    root.querySelectorAll('.sk-player').forEach(function (row) {
      var id = row.getAttribute('data-id');
      row.querySelector('[data-plus]').onclick = function () {
        var s2 = getState(), p = s2.players.find(function (x) { return x.id === id; });
        if (!p) return;
        var amt = (p.buyHistory[0] && p.buyHistory[0].amount) || 100;
        p.buyHistory.push({ id: uid('buy'), amount: amt, kind: 'Rebuy', at: Date.now() });
        save(s2); render(); rowFx(id, 'sk-pop', true); toast('קנייה נוספת: ' + p.name + ' ' + money(amt));
      };
      row.querySelector('[data-minus]').onclick = function () {
        var s2 = getState(), p = s2.players.find(function (x) { return x.id === id; });
        if (!p) return;
        if (p.buyHistory.length > 1) {
          var last = p.buyHistory.pop(); save(s2); render(); rowFx(id, 'sk-drop', false); toast('בוטלה קנייה של ' + money(last.amount));
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
    var v = isPoints() ? per.toLocaleString('he-IL', { maximumFractionDigits: 3 }) + ' נק׳' : per >= 1 ? money(per) : per >= 0.01 ? '₪' + per.toLocaleString('he-IL', { maximumFractionDigits: 2 }) : (per * 100).toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' אגורות';
    return 'ג׳טון אחד = ' + v;
  }

  function rowFx(id, cls, chips) { setTimeout(function () { rowFx2(id, cls, chips); }, 20); }
  function rowFx2(id, cls, chips) {
    var row = root.querySelector('.sk-player[data-id="' + id + '"]');
    if (!row) return;
    if (motionOK()) { row.classList.add(cls); var a = row.querySelector('.sk-amt'); if (a && chips) a.classList.add('sk-bump'); }
    if (chips) { fx(row, { pot: true }); flyToPot(row); } else { sound(); pulsePot(); }
  }

  function flyToPot(from) {
    var pot = root.querySelector('.sk-pot'), layer = document.getElementById('fxLayer');
    if (!pot || !from || !layer || !motionOK()) return;
    var a = from.getBoundingClientRect(), b = pot.getBoundingClientRect();
    var colors = ['#d93a3f', '#1f9d62', '#d9a21f'];
    for (var i = 0; i < 4; i++) {
      var c = document.createElement('span');
      c.className = 'sk-fly';
      c.style.background = colors[i % 3];
      c.style.left = (a.left + a.width / 2 - 13 + (i - 1.5) * 10) + 'px';
      c.style.top = (a.top + a.height / 2 - 13) + 'px';
      c.style.setProperty('--tx', (b.left + b.width / 2 - (a.left + a.width / 2) - (i - 1.5) * 10) + 'px');
      c.style.setProperty('--ty', (b.top + b.height / 2 - (a.top + a.height / 2)) + 'px');
      c.style.animationDelay = (i * 70) + 'ms';
      layer.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 1200); })(c);
    }
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

  var lastDiff = null;
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
    var justBalanced = diff === 0 && lastDiff !== null && lastDiff !== 0;
    lastDiff = diff;
    if (justBalanced) setTimeout(function () { var ok = root.querySelector('.sk-ok'); if (ok) fx(ok); }, 30);
    var pays = tr.length ? tr.map(function (t) {
      return '<div class="sk-pay"><span>' + esc(t.from) + (isPoints() ? ' מעביר/ה ל' : ' משלם/ת ל') + esc(t.to) + '</span><span class="v">' + money(t.amount) + '</span></div>';
    }).join('') : (diff === 0 ? '<div class="sk-zero" style="padding:8px 0">אין חובות — כולם מאוזנים</div>' : '');
    var status = diff === 0
      ? '<div class="sk-ok">✓ הג׳טונים מאוזנים (' + num(chipsOut) + ' מתוך ' + num(chipsIn) + ')</div>'
      : '<div class="sk-warn">' + (diff < 0 ? 'חסרים ' + num(-diff) : 'יש ' + num(diff) + ' יותר מדי') + ' ג׳טונים. סה״כ חולקו ' + num(chipsIn) + ' ג׳טונים, וספרתם ' + num(chipsOut) + '. התשלומים יחושבו כשהסכום יתאזן.</div>';

    root.innerHTML =
      '<div class="sk-topnav"><h2>סגירת חשבון</h2><button class="sk-backlink" type="button" id="sk-back">' + ICON.back + 'ערב פוקר</button></div>' +
      '<div class="sk-col sk-col-a">' +
      '<section class="sk-card"><div class="sk-sec-title" style="color:var(--sk-green)">ג׳טונים שנשארו<small>' + num(step) + ' בכל לחיצה</small></div>' + chipRows + '</section>' +
      status +
      '</div><div class="sk-col sk-col-b">' +
      '<section class="sk-card"><div class="sk-sec-title" style="color:var(--sk-green)">יתרות</div>' + bal + '</section>' +
      '<section class="sk-card"><div class="sk-sec-title" style="color:var(--sk-green)">תשלומים</div>' + (pays || '<div class="sk-zero" style="padding:6px 0">יופיעו כשהג׳טונים יתאזנו</div>') + '</section>' +
      '<button class="sk-btn green" type="button" id="sk-save" style="width:100%;min-height:54px;font-size:17px">שמור תוצאה</button>' +
      '<button class="sk-btn sk-reset" type="button" id="sk-reset">' + ICON.reset + 'איפוס שולחן</button></div>';

    $('sk-back').onclick = function () { view = 'game'; render(); };
    $('sk-reset').onclick = function () {
      function doReset() {
        var s2 = getState();
        s2.players = [];
        save(s2);
        if (typeof window.clearTransfers === 'function') { try { window.clearTransfers(); } catch (e) {} }
        lastDiff = null;
        view = 'game'; render(); window.scrollTo({ top: 0 });
        fx($('sk-root'), { cards: 5 });
        toast('השולחן אופס — אפשר להתחיל משחק חדש');
      }
      if (typeof window.openConfirm === 'function') window.openConfirm('לאפס את השולחן?', 'כל השחקנים, הקניות והג׳טונים של המשחק הזה יימחקו. היחס יישאר כמו שהוא. כדאי ללחוץ קודם "שמור תוצאה" או לשתף סיכום.', 'אפס שולחן', doReset);
      else doReset();
    };
    $('sk-save').onclick = function () {
      if (typeof window.persist === 'function') window.persist();
      fx($('sk-save'));
      if (diff === 0) setTimeout(function () { dealCards($('sk-save'), 5); }, 250);
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
        b.onclick = function () { sound(); setVal(Number(input.value || 0) + Number(b.getAttribute('data-d')) * step); };
      });
      input.onchange = function () { setVal(input.value); };
      input.onkeydown = function (e) { if (e.key === 'Enter') input.blur(); };
    });
  }

  var renderedView = null, enterTimer = null, lastPot = null, lastRenderAt = 0;
  function render() {
    if (!root.isConnected) return;
    var focused = document.activeElement && root.contains(document.activeElement);
    if (focused && document.activeElement.tagName === 'INPUT') return; // לא לשבור הקלדה
    lastRenderAt = performance.now();
    var entering = renderedView !== view;
    renderedView = view;
    parkTableCard();
    if (view === 'settle') renderSettle(); else renderGame();
    placeTableCard();
    if (entering && motionOK()) {
      root.classList.remove('sk-enter'); void root.offsetWidth; root.classList.add('sk-enter');
      clearTimeout(enterTimer); enterTimer = setTimeout(function () { root.classList.remove('sk-enter'); }, 1100);
    }
  }
  // כרטיס "שולחן משותף" של האפליקציה עובר למקום שלו בעיצוב (מתחת לכותרת), ובכל רינדור חוזר לבית שלו כדי לא להימחק
  function parkTableCard() {
    var tc = $('tableCard'), hub = document.querySelector('#roomDashboard');
    if (tc && hub && root.contains(tc)) { var notice = $('appNotice'); if (notice) notice.after(tc); else hub.appendChild(tc); }
  }
  function placeTableCard() {
    var tc = $('tableCard'), slot = $('sk-table-slot');
    if (tc && slot) slot.appendChild(tc);
  }
  // הקופה "סופרת" עד הסכום החדש
  function countPot(pot) {
    var el = root.querySelector('.sk-pot strong');
    var from = lastPot; lastPot = pot;
    if (!el || from === null || from === pot || !motionOK()) return;
    var box = el.closest('.sk-pot');
    if (box) {
      var d = document.createElement('span');
      d.className = 'sk-delta ' + (pot > from ? 'up' : 'down');
      d.textContent = (pot > from ? '+' : '−') + money(Math.abs(pot - from));
      box.appendChild(d);
      setTimeout(function () { d.remove(); }, 1300);
      var st = box.querySelector('.sk-stack');
      if (st) { st.classList.remove('bump'); void st.offsetWidth; st.classList.add('bump'); }
      box.classList.remove('sk-shine'); void box.offsetWidth; box.classList.add('sk-shine');
    }
    el.textContent = money(from);
    var t0 = performance.now(), dur = 550;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = money(Math.round(from + (pot - from) * e));
      if (k < 1 && el.isConnected) requestAnimationFrame(step); else el.textContent = money(pot);
    })(t0);
  }
  // גל לחיצה עדין על כפתורים
  document.addEventListener('pointerdown', function (e) {
    if (!motionOK()) return;
    var b = e.target.closest && e.target.closest('.sk-btn,.sk-iconbtn,.sk-pm,.wn-item,.sk-quick button,.sk-addhand,.sk-guest-btn,.sk-profile-logout');
    if (!b || b.disabled) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.6, sp = document.createElement('span');
    sp.className = 'sk-ripple';
    sp.style.width = sp.style.height = d + 'px';
    sp.style.left = (e.clientX - r.left - d / 2) + 'px';
    sp.style.top = (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(sp);
    setTimeout(function () { sp.remove(); }, 600);
  }, { passive: true });

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

  function addLegalLinks() {
    var foot = document.querySelector('.login-footer');
    if (!foot || $('sk-legal')) return;
    var p = document.createElement('p');
    p.id = 'sk-legal';
    p.style.cssText = 'text-align:center;margin:10px 0 0;font-size:.76rem';
    p.innerHTML = '<a href="/privacy.html" target="_blank" rel="noopener" style="color:#f2c94c">מדיניות פרטיות</a> · <a href="/data-deletion.html" target="_blank" rel="noopener" style="color:#f2c94c">מחיקת חשבון</a>';
    foot.after(p);
  }
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

  function doLogout() { var b = $('googleSignOutBtn'); if (b) b.click(); }
  function confirmLogout() {
    if (typeof window.openConfirm === 'function') window.openConfirm('להתנתק?', 'המשחק נשמר בחשבון שלך ויחזור כשתתחבר שוב.', 'התנתק', doLogout);
    else doLogout();
  }
  window.wnLogout = confirmLogout;
  function addProfileLogout() {
    var sheet = document.querySelector('#profileModal .profile-sheet');
    if (!sheet || $('sk-profile-logout')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'sk-profile-logout'; b.className = 'sk-profile-logout';
    b.textContent = 'התנתק מהחשבון';
    b.onclick = function () { var c = $('profileCloseBtn'); if (c) c.click(); confirmLogout(); };
    sheet.appendChild(b);
    var d = document.createElement('button');
    d.type = 'button'; d.id = 'sk-delete-account'; d.className = 'sk-delete-link';
    d.textContent = 'מחיקת החשבון שלי';
    d.onclick = function () { var c = $('profileCloseBtn'); if (c) c.click(); askDelete(); };
    sheet.appendChild(d);
  }
  function session() {
    try { var x = JSON.parse(localStorage.getItem('sb-ctrnlkfopahdtoiaakru-auth-token') || 'null'); if (x && x.currentSession) x = x.currentSession; return x && x.access_token ? x : null; } catch (e) { return null; }
  }
  function askDelete() {
    var se = session();
    if (!se) return toast('צריך להיות מחובר כדי למחוק את החשבון');
    if ((se.user && se.user.email || '').toLowerCase() === 'yairakiva55@gmail.com') return toast('אי אפשר למחוק את חשבון המנהל מתוך האפליקציה');
    if (typeof window.openConfirm !== 'function') return;
    window.openConfirm('למחוק את החשבון לצמיתות?', 'החשבון, הפרופיל, המשחקים השמורים, הנקודות והשולחנות שפתחת יימחקו ולא יהיה אפשר לשחזר אותם.', 'המשך למחיקה', function () {
      setTimeout(function () {
        window.openConfirm('בטוח לגמרי?', 'זה השלב האחרון. אחרי הלחיצה החשבון נמחק מיד.', 'מחק את החשבון', doDelete);
      }, 250);
    });
  }
  function doDelete() {
    var se = session();
    if (!se) return;
    toast('מוחק את החשבון...');
    fetch('https://ctrnlkfopahdtoiaakru.supabase.co/functions/v1/wwcd-delete-account', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + se.access_token, 'apikey': 'sb_publishable_zpiuN3ZFGPTHr5ySfL-rOw_Ngfzl7hc', 'Content-Type': 'application/json' },
      body: '{}'
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) return toast((res.j && res.j.error) || 'מחיקת החשבון נכשלה. נסה שוב.');
        try { Object.keys(localStorage).forEach(function (k) { if (/^sb-|^wwcd_/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        toast('החשבון נמחק');
        setTimeout(function () { location.replace('/'); }, 900);
      })
      .catch(function () { toast('אין חיבור לשרת. נסה שוב.'); });
  }

  /* ---------- דיווח וחסימה (הנחיות Apple 1.2) ---------- */
  var REST = 'https://ctrnlkfopahdtoiaakru.supabase.co/rest/v1/';
  var ANON = 'sb_publishable_zpiuN3ZFGPTHr5ySfL-rOw_Ngfzl7hc';
  var blocks = new Set();
  try { JSON.parse(localStorage.getItem('wwcd_blocks') || '[]').forEach(function (id) { blocks.add(id); }); } catch (e) {}
  window.wnBlocks = blocks;
  function api(path, opts) {
    var se = session(); if (!se) return Promise.reject(new Error('signed-out'));
    opts = opts || {};
    var h = { apikey: ANON, Authorization: 'Bearer ' + se.access_token, 'Content-Type': 'application/json' };
    if (opts.prefer) h.Prefer = opts.prefer;
    return fetch(REST + path, { method: opts.method || 'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.status === 204 || opts.method === 'DELETE' || opts.prefer ? null : r.json(); });
  }
  function saveBlocks() {
    try { localStorage.setItem('wwcd_blocks', JSON.stringify(Array.from(blocks))); } catch (e) {}
    window.dispatchEvent(new Event('wn-blocks-changed'));
  }
  function loadBlocks() {
    if (!session()) return;
    api('wwcd_blocks?select=blocked_id').then(function (rows) {
      blocks.clear(); (rows || []).forEach(function (r) { blocks.add(r.blocked_id); }); saveBlocks();
    }).catch(function () {});
  }
  var memberO = makeOverlay('sk-member');
  window.wnMemberActions = function (userId, name, roomId) {
    var blocked = blocks.has(userId), sheet = memberO.firstChild;
    var shown = blocked ? 'משתמש חסום' : name;
    sheet.innerHTML = '<div class="sk-grab"></div><h3>' + esc(shown) + '</h3><p class="sk-note">אפשר לדווח על התנהגות או שם פוגעני, או לחסום את המשתמש.</p>' +
      '<div class="sk-menu">' +
      '<button class="sk-btn" type="button" data-m="report">⚑ דווח על המשתמש</button>' +
      (blocked ? '<button class="sk-btn" type="button" data-m="unblock">בטל חסימה</button>' : '<button class="sk-btn" type="button" data-m="block" style="color:#ff8a8e">⛔ חסום את המשתמש</button>') +
      '<button class="sk-btn" type="button" data-m="close">סגור</button></div>';
    sheet.querySelector('[data-m="close"]').onclick = function () { closeOverlay(memberO); };
    sheet.querySelector('[data-m="report"]').onclick = function () { openReport(userId, shown, roomId); };
    var bb = sheet.querySelector('[data-m="block"]');
    if (bb) bb.onclick = function () {
      blocks.add(userId); saveBlocks(); closeOverlay(memberO);
      api('wwcd_blocks', { method: 'POST', body: { blocked_id: userId }, prefer: 'resolution=ignore-duplicates,return=minimal' }).catch(function () {});
      toast('המשתמש נחסם — השם שלו מוסתר אצלך');
    };
    var ub = sheet.querySelector('[data-m="unblock"]');
    if (ub) ub.onclick = function () {
      blocks.delete(userId); saveBlocks(); closeOverlay(memberO);
      api('wwcd_blocks?blocked_id=eq.' + encodeURIComponent(userId), { method: 'DELETE' }).catch(function () {});
      toast('החסימה בוטלה');
    };
    openOverlay(memberO);
  };
  function openReport(userId, shown, roomId) {
    var reasons = ['שם פוגעני או לא ראוי', 'התנהגות פוגענית או הטרדה', 'רמאות ברישום הסכומים', 'ספאם', 'אחר'];
    var sheet = memberO.firstChild;
    sheet.innerHTML = '<div class="sk-grab"></div><h3>דיווח על ' + esc(shown) + '</h3><p class="sk-note">הדיווח נשלח למנהל האפליקציה ומטופל תוך 24 שעות.</p>' +
      '<div class="sk-reasons">' + reasons.map(function (r, i) { return '<label><input type="radio" name="sk-reason" value="' + esc(r) + '"' + (i === 0 ? ' checked' : '') + '>' + esc(r) + '</label>'; }).join('') + '</div>' +
      '<label class="sk-field">פרטים (לא חובה)<input id="sk-report-text" maxlength="200" autocomplete="off"></label>' +
      '<div class="sk-sheet-actions"><button class="sk-btn" type="button" data-m="cancel">ביטול</button><button class="sk-btn green" type="button" data-m="send">שלח דיווח</button></div>';
    sheet.querySelector('[data-m="cancel"]').onclick = function () { closeOverlay(memberO); };
    sheet.querySelector('[data-m="send"]').onclick = function () {
      var r = sheet.querySelector('input[name="sk-reason"]:checked'), extra = $('sk-report-text').value.trim();
      var reason = (r ? r.value : 'אחר') + (extra ? ' — ' + extra : '');
      api('wwcd_reports', { method: 'POST', body: { reported_user_id: userId, room_id: roomId || null, reason: reason.slice(0, 300) }, prefer: 'return=minimal' })
        .then(function () { closeOverlay(memberO); toast('הדיווח נשלח. תודה!'); })
        .catch(function () { toast('שליחת הדיווח נכשלה. נסה שוב.'); });
    };
  }

  // עמוד פתיחה מזמין לפני ההתחברות
  function addLanding(shell, hub) {
    if ($('sk-landing')) return;
    var L = document.createElement('section');
    L.id = 'sk-landing';
    L.innerHTML =
      '<div class="skl-hero">' +
        '<div class="skl-chips" aria-hidden="true"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i></div>' +
        '<span class="skl-kicker">ערב פוקר עם החבר׳ה</span>' +
        '<h1>Winner winner<br><em>chicken dinner</em></h1>' +
        '<p>בלי דפים, בלי מחשבון ובלי ויכוחים בסוף הערב. האפליקציה סופרת קניות, מחשבת מי חייב למי ושומרת את ההיסטוריה.</p>' +
      '</div>' +
      '<div class="skl-feats">' +
        '<div class="skl-f"><span>🪙</span><b>קניות וג׳טונים</b><small>לחיצה אחת לכל קנייה, הקופה מתעדכנת מיד</small></div>' +
        '<div class="skl-f"><span>🤝</span><b>סגירת חשבון</b><small>מינימום העברות, מחושב אוטומטית</small></div>' +
        '<div class="skl-f"><span>🎯</span><b>מחשבון סיכויים</b><small>כמה אחוזים יש לך מול היד שלו</small></div>' +
      '</div>' +
      '<ol class="skl-steps"><li><b>1</b>נכנסים עם Google או כאורח</li><li><b>2</b>מוסיפים שחקנים וקניות</li><li><b>3</b>בסוף לוחצים "סיים משחק"</li></ol>' +
      '<div class="skl-foot">חינם · בלי הימורים בכסף אמיתי · <a href="privacy.html">פרטיות</a></div>';
    shell.insertBefore(L, hub);
  }

  function mount() {
    loadBlocks();
    addProfileLogout();
    addLegalLinks();
    var shell = document.querySelector('.shell'), hub = document.querySelector('.room-hub');
    if (!shell || !hub) return;
    hub.after(root);
    addLanding(shell, hub);
    document.body.classList.add('sk-on');
    // לאפליקציה יש כבר כניסת אורח משלה (googleSignInBtn/guestSignInBtn) — לא מוסיפים כפתור שני
    if ($('guestSignInBtn')) { lsDel(GUEST_KEY); document.body.classList.remove('wn-guest'); }
    else { addGuestButton(); if (lsGet(GUEST_KEY) === '1') document.body.classList.add('wn-guest'); }
    // כשמתחברים עם Google — יוצאים ממצב אורח
    var ab = $('adminOpenBtn');
    if (ab) new MutationObserver(function () { setTimeout(render, 0); }).observe(ab, { attributes: true, attributeFilter: ['hidden'] });
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
  // שינוי מבחוץ (ענן/רענון) — לרנדר רק אם לא רונדר הרגע, כדי לא למחוק אנימציות שרצות
  G.replace = function (next) { origReplace(next); setTimeout(function () { if (performance.now() - lastRenderAt > 150) render(); }, 0); };

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
        sound();
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
