/* native.js — מחבר את קוד האתר ליכולות של האפליקציה (Capacitor).
   נטען רק בתוך האפליקציה. באתר הקובץ הזה לא קיים ולא משנה כלום. */
(function () {
  'use strict';
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {};
  var SCHEME = 'com.winnerwinnerchickendinner.poker://';
  var pendingAuth = null;
  document.documentElement.classList.add('is-native', 'is-' + (C.getPlatform ? C.getPlatform() : 'native'));

  function haptic(style) {
    try { if (P.Haptics) P.Haptics.impact({ style: style || 'LIGHT' }); } catch (e) {}
  }

  window.wwcdNative = {
    platform: C.getPlatform ? C.getPlatform() : 'native',
    // התחברות עם Google/Facebook נפתחת בדפדפן של המכשיר וחוזרת לאפליקציה
    openAuth: function (url) {
      if (P.Browser) return P.Browser.open({ url: url, presentationStyle: 'popover' });
      location.href = url;
      return Promise.resolve();
    },
    takePendingAuth: function () { var u = pendingAuth; pendingAuth = null; return u; },
    haptic: haptic
  };

  function handleUrl(url) {
    if (!url || url.indexOf(SCHEME) !== 0) return;
    try { if (P.Browser) P.Browser.close(); } catch (e) {}
    if (window.wwcdRoomsReady) window.dispatchEvent(new CustomEvent('wwcd-native-auth', { detail: { url: url } }));
    else pendingAuth = url;
  }

  if (P.App) {
    P.App.addListener('appUrlOpen', function (e) { handleUrl(e && e.url); });
    if (P.App.getLaunchUrl) P.App.getLaunchUrl().then(function (r) { if (r && r.url) handleUrl(r.url); }).catch(function () {});
    // אנדרואיד: כפתור "חזור" סוגר חלונות פתוחים לפני שיוצאים מהאפליקציה
    P.App.addListener('backButton', function () {
      var open = document.querySelector('.sk-overlay.show, .modal.show, .room-panel-overlay.show');
      if (open) {
        var close = open.querySelector('#sk-calc-close, [data-close], #confirmCancel, #profileCloseBtn, #pokerCalcClose, #closeRoomsPanelBtn');
        if (close) close.click(); else open.classList.remove('show');
        return;
      }
      var admin = document.getElementById('adminOverlay');
      if (admin && !admin.hidden) { var x = document.getElementById('adminCloseBtn'); if (x) x.click(); return; }
      var back = document.getElementById('sk-back');
      if (back) { back.click(); return; }
      if (P.App.minimizeApp) P.App.minimizeApp(); else P.App.exitApp();
    });
  }

  // שיתוף: חלון השיתוף של המכשיר
  if (P.Share) {
    navigator.share = function (data) {
      data = data || {};
      return P.Share.share({ title: data.title, text: data.text, url: data.url, dialogTitle: 'שיתוף' });
    };
  }

  // רטט קל בלחיצה על כפתורים
  document.addEventListener('pointerdown', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button, .sk-dc, .sk-slot');
    if (b && !b.disabled) haptic(b.matches('.sk-pm.plus, #sk-add-go, .wt-go, #sk-save') ? 'MEDIUM' : 'LIGHT');
  }, { passive: true });

  // שורת הסטטוס ומסך הפתיחה
  try {
    if (P.StatusBar) {
      P.StatusBar.setStyle({ style: 'DARK' });
      if (window.wwcdNative.platform === 'android') P.StatusBar.setBackgroundColor({ color: '#07140f' });
    }
  } catch (e) {}
  window.addEventListener('load', function () {
    try { if (P.SplashScreen) P.SplashScreen.hide(); } catch (e) {}
  });
})();
