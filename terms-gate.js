/*
 * terms-gate.js — מסך אישור תנאים בכניסה ראשונה
 *
 * מסך אישור תנאים — מופיע פעם אחת בלבד לכל משתמש, אחרי ההתחברות הראשונה.
 *   <script src="/terms-gate.js" defer></script>
 *
 * איך זה עובד:
 *  - כל עוד המשתמש לא סימן את כל הסעיפים, המסך חוסם את האפליקציה.
 *  - האישור נשמר במכשיר, ובנוסף ב-Supabase (טבלה wwcd_terms_acceptance) ברגע שהמשתמש מחובר.
 *  - משתמש שכבר אישר במכשיר אחר לא יתבקש לאשר שוב.
 *  - שינית את הנוסח? העלה את TERMS_VERSION ב-1 וכולם יתבקשו לאשר מחדש.
 */
(function () {
  'use strict';

  var TERMS_VERSION = 2; // נוסח 2 — כולם מתבקשים לאשר מחדש
  var SUPABASE_URL = 'https://ctrnlkfopahdtoiaakru.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_zpiuN3ZFGPTHr5ySfL-rOw_Ngfzl7hc';
  var SESSION_KEY = 'sb-ctrnlkfopahdtoiaakru-auth-token';
  var LOCAL_KEY = 'wwcd_terms_accepted_v' + TERMS_VERSION;
  var SYNCED_KEY = 'wwcd_terms_synced_v' + TERMS_VERSION + '_';

  var INTRO = 'בלחיצה על "אני מאשר/ת", אני מצהיר/ה כי מלאו לי 18 שנים וכי קראתי והבנתי את התנאים הבאים:';
  var POINTS = [
    'האפליקציה היא כלי לרישום, חישוב והצגת נתונים שהמשתמשים מזינים בלבד; היא אינה מחזיקה, מקבלת, מעבירה או גובה כספים, אינה מנהלת קופה ואינה צד למשחק, להסכמות או להתחשבנות בין משתמשים.',
    'הסכומים, היתרות והחישובים מוצגים לנוחות ולמעקב בלבד ועלולים להיות שגויים או חלקיים, ולכן באחריותי לבדוק אותם בעצמי; הצגתם אינה קביעה משפטית שקיים חוב ואינה התחייבות של מפעילי האפליקציה לשלם או לגבות כסף.',
    'כל משחק, הסכמה, תשלום או התחשבנות נעשים בין המשתמשים בלבד, ואני אחראי/ת לפעולותיי ולבדיקת התאמתן לדין; אין להשתמש באפליקציה לצורך פעילות האסורה לפי דין.',
    'בכפוף לדין, מפעילי האפליקציה אינם אחראים להפסד או למחלוקת הנובעים ממידע שהוזן בידי משתמשים, מהסתמכות על החישובים או מהסכמות ופעולות בין משתמשים; אין בתנאים אלה כדי לגרוע מאחריות שלא ניתן להגביל או לשלול לפי דין.',
    'השימוש באפליקציה כפוף גם למדיניות הפרטיות שלה.'
  ];

  // ---------- אחסון מקומי (מוגן מפני דפדפנים שחוסמים אותו) ----------
  var GUEST_SESSION_KEY = 'wwcd_terms_guest_session_v' + TERMS_VERSION + '_';
  var guestMode = false;
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function getSession() {
    var raw = lsGet(SESSION_KEY);
    if (!raw) return null;
    try {
      var s = JSON.parse(raw);
      if (s && s.currentSession) s = s.currentSession; // פורמט ישן של supabase-js
      if (s && s.access_token && s.user && s.user.id) return s;
    } catch (e) {}
    return null;
  }

  function headers(token) {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    };
  }

  // ---------- סנכרון מול Supabase ----------
  function hasAcceptedInDb(session) {
    var url = SUPABASE_URL + '/rest/v1/wwcd_terms_acceptance?select=user_id' +
      '&user_id=eq.' + encodeURIComponent(session.user.id) +
      '&terms_version=eq.' + TERMS_VERSION + '&limit=1';
    return fetch(url, { headers: headers(session.access_token) })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { return Array.isArray(rows) && rows.length > 0; })
      .catch(function () { return false; });
  }

  var syncing = false;
  function syncToDb() {
    if (syncing) return;
    var session = getSession();
    if (!session) return;
    var uid = session.user.id;
    if (!lsGet(LOCAL_KEY + '_' + uid) || lsGet(SYNCED_KEY + uid)) return;

    syncing = true;
    fetch(SUPABASE_URL + '/rest/v1/wwcd_terms_acceptance?on_conflict=user_id,terms_version', {
      method: 'POST',
      headers: Object.assign(headers(session.access_token), {
        'Prefer': 'resolution=ignore-duplicates,return=minimal'
      }),
      body: JSON.stringify({
        user_id: uid,
        terms_version: TERMS_VERSION,
        user_agent: (navigator.userAgent || '').slice(0, 500)
      })
    }).then(function (r) {
      if (r.ok) lsSet(SYNCED_KEY + uid, '1');
    }).catch(function () {
      // ננסה שוב בבדיקה הבאה
    }).then(function () { syncing = false; });
  }

  // ---------- המסך ----------
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text) n.textContent = text;
    return n;
  }

  function injectStyles() {
    var css =
      '#wwcd-terms{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
      'padding:16px;background:rgba(8,10,14,.82);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);' +
      'font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;direction:rtl}' +
      '#wwcd-terms .wt-card{width:100%;max-width:480px;max-height:calc(100vh - 32px);overflow-y:auto;' +
      'background:#15181f;color:#eef0f4;border:1px solid #2a2f3a;border-radius:16px;padding:24px 20px;' +
      'box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
      '#wwcd-terms h2{margin:0 0 6px;font-size:22px;font-weight:700}' +
      '#wwcd-terms .wt-sub{margin:0 0 18px;color:#a3a9b6;font-size:14px;line-height:1.5}' +
      '#wwcd-terms label{display:flex;gap:12px;align-items:flex-start;padding:12px;margin:0 0 8px;' +
      'border:1px solid #2a2f3a;border-radius:10px;cursor:pointer;font-size:15px;line-height:1.5;' +
      'transition:border-color .15s,background .15s}' +
      '#wwcd-terms label:hover{border-color:#3d4452}' +
      '#wwcd-terms label.wt-on{border-color:#2fbf71;background:rgba(47,191,113,.08)}' +
      '#wwcd-terms input[type=checkbox]{flex:none;width:22px;height:22px;margin:1px 0 0;accent-color:#2fbf71;cursor:pointer}' +
      '#wwcd-terms .wt-intro{margin:0 0 10px;font-size:15px;font-weight:700;line-height:1.55;color:#eef0f4}' +
      '#wwcd-terms .wt-list{margin:0 0 16px;padding:12px 26px 12px 12px;display:grid;gap:10px;font-size:14px;line-height:1.6;color:#d6dae2;max-height:42vh;overflow-y:auto;border:1px solid #2a2f3a;border-radius:12px;background:rgba(255,255,255,.02)}' +
      '#wwcd-terms label{margin-bottom:14px;font-weight:600}' +
      '#wwcd-terms .wt-go{width:100%;padding:14px;border:0;border-radius:10px;font-size:17px;font-weight:700;' +
      'background:#2fbf71;color:#06130b;cursor:pointer;transition:opacity .15s}' +
      '#wwcd-terms .wt-go:disabled{opacity:.35;cursor:not-allowed}' +
      '#wwcd-terms .wt-note{margin:12px 0 0;text-align:center;color:#7d8391;font-size:12px}' +
      'html.wt-lock,html.wt-lock body{overflow:hidden!important}';
    var s = el('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function showGate() {
    if (document.getElementById('wwcd-terms')) return;
    injectStyles();
    document.documentElement.classList.add('wt-lock');

    var overlay = el('div', { id: 'wwcd-terms', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'wt-title' });
    var card = el('div', { 'class': 'wt-card' });
    card.appendChild(el('h2', { id: 'wt-title' }, 'לפני שמתחילים'));
    card.appendChild(el('p', { 'class': 'wt-sub' }, guestMode ? 'כאורח יש לקרוא ולאשר את התנאים בכל כניסה.' : 'יש לקרוא ולאשר פעם אחת בלבד.'));

    var list = el('ul', { 'class': 'wt-list' });
    card.appendChild(el('p', { 'class': 'wt-intro' }, INTRO));
    POINTS.forEach(function (text) { list.appendChild(el('li', null, text)); });
    card.appendChild(list);

    var label = el('label', { 'for': 'wt-c0' });
    var cb = el('input', { type: 'checkbox', id: 'wt-c0' });
    label.appendChild(cb);
    label.appendChild(el('span', null, 'קראתי והבנתי את התנאים'));
    card.appendChild(label);

    var go = el('button', { type: 'button', 'class': 'wt-go' }, 'אני מאשר/ת');
    go.disabled = true;
    card.appendChild(go);
    card.appendChild(el('p', { 'class': 'wt-note' }, 'האישור נשמר יחד עם התאריך והשעה.'));

    cb.addEventListener('change', function () {
      label.classList.toggle('wt-on', cb.checked);
      go.disabled = !cb.checked;
    });

    go.addEventListener('click', function () {
      if (go.disabled) return;
      if (uid) lsSet(LOCAL_KEY + '_' + uid, new Date().toISOString());
      if (uid && guestMode) ssSet(GUEST_SESSION_KEY + uid, '1');
      overlay.remove();
      document.documentElement.classList.remove('wt-lock');
      syncToDb();
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    cb.focus();
  }

  // ---------- הפעלה ----------
  // המסך מופיע רק פעם אחת לכל משתמש: אחרי ההתחברות הראשונה, אם עוד לא אישר אף פעם (בשום מכשיר).
  var uid = null, checking = false;
  function check() {
    if (checking || document.getElementById('wwcd-terms')) return;
    var session = getSession();
    if (!session) {
      // אורח: מאשר פעם אחת במכשיר הזה
      if (document.body.classList.contains('wn-guest') && !lsGet(LOCAL_KEY + '_guest')) { uid = 'guest'; showGate(); }
      return;                             // עוד לא מחובר — מחכים
    }
    uid = session.user.id;
    // אורח (כניסה כאורח): חייב לאשר מחדש בכל כניסה לאפליקציה
    if (session.user.is_anonymous) {
      guestMode = true;
      if (ssGet(GUEST_SESSION_KEY + uid)) { syncToDb(); return; }
      showGate();
      return;
    }
    guestMode = false;
    if (lsGet(LOCAL_KEY + '_' + uid)) { syncToDb(); return; }   // כבר אישר במכשיר הזה
    checking = true;
    hasAcceptedInDb(session).then(function (yes) {
      checking = false;
      if (yes) {
        lsSet(LOCAL_KEY + '_' + uid, new Date().toISOString());
        lsSet(SYNCED_KEY + uid, '1');
      } else {
        showGate();
      }
    });
  }
  function start() {
    check();
    setInterval(function () { check(); syncToDb(); }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
