/* bottom-nav.js — סרגל ניווט תחתון: פרופיל · מחשבון · משחק */
(function () {
  'use strict';

  var ICONS = {
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    store: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    game: '<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M4 7.5v10M20 7.5v10"/><circle cx="12" cy="12.5" r="2.5"/>'
  };
  // הסדר ב-DOM מימין לשמאל (dir=rtl): פרופיל, חנות, מחשבון, משחק
  var TABS = [
    ['profile', 'פרופיל'],
    ['calculator', 'מחשבון'],
    ['game', 'משחק']
  ];

  function $(id) { return document.getElementById(id); }

  function injectStyles() {
    var css =
      '.wn-nav{position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);' +
      'width:calc(100% - 24px);max-width:460px;z-index:90;display:none;gap:4px;padding:6px;direction:rtl;border-radius:999px;' +
      'background:rgba(16,32,24,.78);border:1px solid rgba(255,255,255,.10);' +
      'box-shadow:0 10px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06);' +
      'backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%)}' +
      'body.room-authenticated:not(.room-panel-open) .wn-nav{display:flex}' +
      '.wn-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:58px;' +
      'padding:6px 4px;border:0;border-radius:999px;background:transparent;color:#e8ece9;font:inherit;font-size:13px;font-weight:700;' +
      'cursor:pointer;-webkit-tap-highlight-color:transparent;transition:background .2s,color .2s,transform .1s;box-shadow:none}' +
      '.wn-item:hover{filter:none;transform:none;box-shadow:none}' +
      '.wn-item:active{transform:scale(.95)}' +
      '.wn-item svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.wn-item[aria-current="page"]{color:#4fe08a;background:rgba(79,224,138,.15);' +
      'box-shadow:inset 0 0 0 1px rgba(79,224,138,.24),0 0 18px rgba(79,224,138,.16)}' +
      '.wn-item.wn-bump svg{animation:wnBump .4s cubic-bezier(.2,.8,.2,1)}@keyframes wnBump{0%{transform:scale(1)}40%{transform:scale(1.25) translateY(-2px)}100%{transform:scale(1)}}' +
      '.wn-item{transition:background .25s,color .25s,transform .12s,box-shadow .25s}' +
      '@media(hover:hover){.wn-item:not([aria-current="page"]):hover{background:rgba(255,255,255,.06)}}' +
      '@media(min-width:900px){.wn-nav{max-width:420px}.wn-item{min-height:54px}}' +
      '@media(prefers-reduced-motion:reduce){.wn-item.wn-bump svg{animation:none}}' +
      'body.room-authenticated .shell{padding-bottom:calc(110px + env(safe-area-inset-bottom,0px))}' +
      'body.room-authenticated .toast{bottom:calc(96px + env(safe-area-inset-bottom,0px))}' +
      '.wn-store-sheet{text-align:center}.wn-store-icon{font-size:44px;line-height:1;margin:4px 0 10px}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  var nav, current = 'game';

  function setActive(tab) {
    current = tab;
    if (!nav) return;
    nav.querySelectorAll('.wn-item').forEach(function (b) {
      if (b.getAttribute('data-tab') === tab) {
        if (b.getAttribute('aria-current') !== 'page') { b.classList.remove('wn-bump'); void b.offsetWidth; b.classList.add('wn-bump'); }
        b.setAttribute('aria-current', 'page');
      }
      else b.removeAttribute('aria-current');
    });
  }

  function isOpen(id) {
    var el = $(id);
    return !!(el && el.classList.contains('show'));
  }

  function closeAll() {
    if (isOpen('pokerCalcModal') && typeof window.closePokerCalc === 'function') window.closePokerCalc();
    if (window.wnCalc && window.wnCalc.isOpen()) window.wnCalc.close();
    if (isOpen('profileModal')) {
      var c = $('profileCloseBtn');
      if (c) c.click();
    }
    closeStore();
  }

  // ----- חנות (עדיין אין חנות באפליקציה — מסך "בקרוב") -----
  var storeModal;
  function openStore() {
    if (!storeModal) {
      storeModal = document.createElement('div');
      storeModal.className = 'modal';
      storeModal.setAttribute('role', 'dialog');
      storeModal.setAttribute('aria-modal', 'true');
      storeModal.innerHTML =
        '<div class="sheet wn-store-sheet">' +
        '<div class="wn-store-icon" aria-hidden="true">🛍️</div>' +
        '<h3>החנות בדרך</h3>' +
        '<p>אנחנו עובדים על זה. בקרוב יהיו כאן דברים חדשים.</p>' +
        '<button type="button" class="btn primary full" data-wn-close>הבנתי</button>' +
        '</div>';
      storeModal.addEventListener('click', function (e) {
        if (e.target === storeModal || e.target.hasAttribute('data-wn-close')) {
          closeStore();
          setActive('game');
        }
      });
      document.body.appendChild(storeModal);
    }
    storeModal.classList.add('show');
  }
  function closeStore() {
    if (storeModal) storeModal.classList.remove('show');
  }

  function go(tab) {
    if (tab === current && tab !== 'game') return;
    closeAll();
    setActive(tab);

    if (tab === 'game') {
      var back = $('roomViewBackBtn');
      if (document.body.classList.contains('room-view-active') && back) back.click();
      if (window.wnGame) window.wnGame.show(); else window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'calculator') {
      if (window.wnCalc) window.wnCalc.open();
      else if (typeof window.openPokerCalc === 'function') window.openPokerCalc();
      else { var c = $('pokerCalcBtn'); if (c) c.click(); }
    } else if (tab === 'profile') {
      if (window.wnGuest && window.wnGuest.is()) { setActive('game'); return window.wnGuest.askLogin('כדי שיהיה לך פרופיל ושהמשחקים יישמרו בכל מכשיר, צריך להתחבר עם Google.'); }
      var p = $('profileOpenBtn');
      if (p) p.click();
    } else if (tab === 'store') {
      openStore();
    }
  }

  // כשהמשתמש סוגר חלון (מחשבון/פרופיל) בדרך אחרת — הסימון חוזר ל"משחק"
  function watchClose(id, tab) {
    var el = $(id);
    if (!el || !window.MutationObserver) return;
    new MutationObserver(function () {
      if (current === tab && !el.classList.contains('show')) setActive('game');
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  }

  function build() {
    injectStyles();
    nav = document.createElement('nav');
    nav.className = 'wn-nav';
    nav.setAttribute('aria-label', 'ניווט ראשי');
    TABS.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wn-item';
      b.setAttribute('data-tab', t[0]);
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[t[0]] + '</svg><span>' + t[1] + '</span>';
      b.addEventListener('click', function () { go(t[0]); });
      nav.appendChild(b);
    });
    document.body.appendChild(nav);
    setActive('game');
    window.wnNavSetActive = setActive;
    watchClose('pokerCalcModal', 'calculator');
    watchClose('profileModal', 'profile');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
