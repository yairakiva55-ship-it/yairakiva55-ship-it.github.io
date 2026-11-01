/* live.js — "שתף משחק": המארח מנהל את המשחק, החברים צופים בזמן אמת בקישור ומאשרים את התוצאה שלהם.
 * כל החוקים (מי יכול לעדכן, איזון, נקודות) נאכפים בשרת — הקובץ הזה רק מציג ושולח.
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://ctrnlkfopahdtoiaakru.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_zpiuN3ZFGPTHr5ySfL-rOw_Ngfzl7hc'; // מפתח ציבורי, בטוח לדפדפן
  var SITES = ['https://yairakiva55-ship-it.github.io', 'https://winner-poker-yair.netlify.app', 'https://winner-poker-yair.brightflute34.chatgpt.site'];
  var PENDING_KEY = 'wwcd_live_pending';
  var CODE_RE = /^[A-Z2-9]{8}$/;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
  function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function auth() { return window.wwcdAuth || null; }
  function signedIn() { var a = auth(); return !!(a && a.client() && a.user()); }
  function isPointsHere() { return !!(window.wnSkin && window.wnSkin.isPoints && window.wnSkin.isPoints()); }
  function baseUrl() { return SITES.indexOf(location.origin) >= 0 ? location.origin : SITES[0]; }
  function linkFor(code) { return baseUrl() + '/?g=' + code; }
  function errText(error) {
    var t = String((error && (error.message || error.msg || error.hint)) || '');
    if (/Sign-in is required|JWT|not authenticated/i.test(t)) return 'צריך להתחבר כדי לעשות את זה.';
    if (/live_not_open/.test(t)) return 'השיתוף של המשחק הזה כבר נסגר.';
    if (/bad_amount/.test(t)) return 'יש קנייה בסכום לא תקין (עד 10,000 לקנייה).';
    if (/too_many_players/.test(t)) return 'אפשר לשתף עד 30 שחקנים.';
    if (/bad_|too_many/.test(t)) return 'יש נתון לא תקין במשחק. בדוק את הקניות והג׳טונים.';
    if (/Failed to fetch|NetworkError|network/i.test(t)) return 'אין חיבור לאינטרנט. נסה שוב.';
    return t || 'הפעולה נכשלה. נסה שוב.';
  }

  /* ---------- שרת ---------- */
  function rpc(name, args) {
    var a = auth(), c = a && a.client();
    if (c && a.user()) {
      return c.rpc(name, args).then(function (r) { return { data: r.data, error: r.error }; }, function (e) { return { data: null, error: e }; });
    }
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (body) {
        return res.ok ? { data: body, error: null } : { data: null, error: body || { message: 'HTTP ' + res.status } };
      });
    }, function (e) { return { data: null, error: e }; });
  }

  /* ---------- צד המארח ---------- */
  function G() { return window.wwcdGame; }
  function getState() { return G() ? G().get() : null; }
  function setLive(live) {
    var s = getState(); if (!s) return;
    if (live) s.live = live; else delete s.live;
    G().replace(s);
    if (typeof window.persist === 'function') window.persist();
    if (window.wnSkin) window.wnSkin.render();
  }
  function snapshot(s) {
    s = s || getState();
    return {
      ratioMoney: s.ratioMoney, ratioChips: s.ratioChips, unit: isPointsHere() ? 'points' : 'nis',
      players: s.players.map(function (p) {
        return { id: p.id, name: p.name, finalChips: p.finalChips || 0, buyHistory: (p.buyHistory || []).map(function (b) { return { amount: b.amount }; }) };
      })
    };
  }

  function askLogin() {
    var text = 'כדי לשתף את המשחק עם החברים צריך להתחבר (Google או אורח).';
    if (window.wnGuest && window.wnGuest.is()) return window.wnGuest.askLogin(text);
    toast(text);
  }

  function shareLink(code, opts) {
    opts = opts || {};
    var url = linkFor(code);
    var text = opts.finished
      ? 'ערב הפוקר נסגר! היכנסו לקישור, לחצו "זה אני" ואשרו את התוצאה שלכם 🃏'
      : 'בואו לראות את ערב הפוקר בזמן אמת — קופה, קניות ומי מוביל 🃏';
    function fallback() {
      if (typeof window.copyOrShow === 'function') window.copyOrShow(text + '\n' + url, 'הקישור הועתק — שלח אותו לחברים');
      else { try { navigator.clipboard.writeText(url); toast('הקישור הועתק'); } catch (e) { toast(url); } }
    }
    if (navigator.share) {
      navigator.share({ title: 'Winner Poker', text: text, url: url }).catch(function (e) { if (!e || e.name !== 'AbortError') fallback(); });
    } else fallback();
  }

  var creating = false;
  function share() {
    var s = getState(); if (!s) return;
    if (s.live) return shareLink(s.live.code, { finished: s.live.finished });
    if (!signedIn()) return askLogin();
    if (creating) return;
    creating = true;
    toast('יוצר קישור למשחק...');
    rpc('wwcd_live_create', { p_state: snapshot(s), p_name: auth().name() || '' }).then(function (r) {
      creating = false;
      if (r.error || !r.data || !CODE_RE.test(String(r.data))) return toast('השיתוף נכשל: ' + errText(r.error));
      setLive({ code: String(r.data), finished: false });
      shareLink(String(r.data));
    });
  }

  var pushTimer = null, pushing = false, dirty = false;
  function queue() {
    var s = getState();
    if (!s || !s.live || s.live.finished) return;
    dirty = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 1200);
  }
  function push() {
    var s = getState();
    if (!s || !s.live || s.live.finished || !signedIn()) return;
    if (pushing) { pushTimer = setTimeout(push, 800); return; }
    pushing = true; dirty = false;
    rpc('wwcd_live_update', { p_code: s.live.code, p_state: snapshot(s) }).then(function (r) {
      pushing = false;
      if (r.error) {
        if (/live_not_open/.test(String(r.error.message || ''))) { setLive(null); toast('השיתוף של המשחק נסגר.'); return; }
        dirty = true; // ננסה שוב בשינוי הבא או כשהרשת חוזרת
        if (/bad_|too_many/.test(String(r.error.message || ''))) toast('לא הצלחתי לעדכן את החברים: ' + errText(r.error));
      }
    });
  }
  window.addEventListener('online', function () { if (dirty) push(); });
  window.addEventListener('wwcd-auth', function () { if (dirty) push(); });

  function end(live) {
    if (!live || live.finished || !signedIn()) return;
    rpc('wwcd_live_cancel', { p_code: live.code });
  }

  function finish() {
    var s = getState(); if (!s || !s.live || s.live.finished) return;
    if (!signedIn()) return askLogin();
    pickPlayer(s.players, function (playerId) {
      toast('סוגר את המשחק...');
      rpc('wwcd_live_finish', { p_code: s.live.code, p_state: snapshot(getState()), p_host_player: playerId }).then(function (r) {
        if (r.error) return toast('הסגירה נכשלה: ' + errText(r.error));
        var code = s.live.code;
        setLive({ code: code, finished: true });
        var a = auth(); if (a && a.refreshStats) a.refreshStats();
        shareLink(code, { finished: true });
      });
    });
  }

  /* ---------- עיצוב משותף ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.wl-ov{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(ellipse at 50% -10%,rgba(212,175,55,.16),transparent 50%),linear-gradient(160deg,#0d2a1e,#06140e);color:#f3f6f2;overflow-y:auto;-webkit-overflow-scrolling:touch;direction:rtl;font-family:inherit}',
    '.wl-wrap{width:min(560px,100%);margin:0 auto;padding:calc(18px + env(safe-area-inset-top,0px)) 16px calc(40px + env(safe-area-inset-bottom,0px));display:grid;gap:14px}',
    '.wl-card{background:rgba(255,255,255,.04);border:1px solid rgba(240,213,108,.18);border-radius:22px;padding:16px}',
    '.wl-top{display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '.wl-title{font-size:20px;font-weight:850;margin:0}',
    '.wl-status{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:750;color:#9fe0bb}',
    '.wl-status.done{color:#f2c94c}',
    '.wl-dot,.sk-live-dot{width:9px;height:9px;border-radius:50%;background:#2fd47c;box-shadow:0 0 0 0 rgba(47,212,124,.6);animation:wlPulse 1.6s infinite;display:inline-block}',
    '@keyframes wlPulse{0%{box-shadow:0 0 0 0 rgba(47,212,124,.55)}70%{box-shadow:0 0 0 9px rgba(47,212,124,0)}100%{box-shadow:0 0 0 0 rgba(47,212,124,0)}}',
    '@media (prefers-reduced-motion:reduce){.wl-dot,.sk-live-dot{animation:none}}',
    '.wl-close{border:1px solid rgba(255,255,255,.16);background:transparent;color:#f3f6f2;border-radius:12px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer}',
    '.wl-pot{display:flex;justify-content:space-between;align-items:baseline}.wl-pot strong{font-size:30px;color:#f2c94c}',
    '.wl-muted{color:#9fb3a6;font-size:13px;line-height:1.5}',
    '.wl-row{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center;padding:11px 0;border-top:1px solid rgba(255,255,255,.07)}',
    '.wl-row:first-of-type{border-top:0}',
    '.wl-name{font-weight:800}.wl-sub{grid-column:1;color:#9fb3a6;font-size:12px}',
    '.wl-amt{font-weight:850;text-align:left;direction:ltr}',
    '.wl-pos{color:#2fd47c}.wl-neg{color:#ff7b7b}',
    '.wl-me{grid-column:1/-1;display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
    '.wl-btn{min-height:44px;border-radius:13px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#f3f6f2;font:inherit;font-weight:800;padding:0 14px;cursor:pointer}',
    '.wl-btn.green{background:linear-gradient(180deg,#34e08b,#1fb866);color:#05210f;border:0}',
    '.wl-btn.gold{background:#f2c94c;color:#1c1500;border:0}',
    '.wl-btn[disabled]{opacity:.5;cursor:default}',
    '.wl-tag{font-size:12px;font-weight:800;border-radius:999px;padding:4px 10px;background:rgba(47,212,124,.14);color:#7ff0b4}',
    '.wl-tag.taken{background:rgba(255,255,255,.07);color:#9fb3a6}',
    '.wl-pay{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.07)}.wl-pay:first-of-type{border-top:0}',
    '.wl-msg{padding:12px 14px;border-radius:14px;font-weight:700;line-height:1.5}',
    '.wl-msg.ok{background:rgba(47,212,124,.12);color:#9ff0c4}.wl-msg.err{background:rgba(255,107,107,.12);color:#ffb3b3}.wl-msg.info{background:rgba(242,201,76,.1);color:#f3dc95}',
    '.wl-sheet{display:grid;gap:10px}',
    '.wl-pick{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;direction:rtl}',
    '.wl-pick .wl-card{width:min(520px,100%);border-radius:24px 24px 0 0;background:#0f2a1f;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px));display:grid;gap:10px;max-height:85vh;overflow:auto}',
    '#tableCard{display:none!important}',
    '.sk-btn.sk-wa{width:100%;min-height:54px;font-size:16px;background:#25d366;color:#04230f;border:0;font-weight:850}',
    '.sk-live-pill{border:1px solid rgba(47,212,124,.35);background:rgba(47,212,124,.1);color:#9ff0c4;border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;font-weight:800;display:inline-flex;align-items:center;gap:8px;cursor:pointer;margin-top:8px}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- בחירת "מי אתה" למארח ---------- */
  function pickPlayer(players, done) {
    var ov = document.createElement('div');
    ov.className = 'wl-pick';
    ov.innerHTML = '<div class="wl-card" role="dialog" aria-modal="true" aria-labelledby="wl-pick-t"><h3 id="wl-pick-t" class="wl-title" style="font-size:18px">מי אתה במשחק?</h3>' +
      '<div class="wl-muted">התוצאה של השחקן שתבחר תיכנס לפרופיל שלך. שאר השחקנים יאשרו את שלהם בקישור.</div>' +
      players.map(function (p, i) { return '<button type="button" class="wl-btn' + (i === 0 ? ' green' : '') + '" data-id="' + esc(p.id) + '">' + esc(p.name) + '</button>'; }).join('') +
      '<button type="button" class="wl-btn" data-cancel>ביטול</button></div>';
    ov.onclick = function (e) {
      var b = e.target.closest('button');
      if (e.target === ov || (b && b.hasAttribute('data-cancel'))) { ov.remove(); return; }
      if (b && b.getAttribute('data-id')) { ov.remove(); done(b.getAttribute('data-id')); }
    };
    document.body.appendChild(ov);
    var first = ov.querySelector('button'); if (first) first.focus();
  }

  /* ---------- צד הצופה: /?g=CODE ---------- */
  var V = { code: null, data: null, ov: null, timer: null, msg: null, busy: false, authAsk: false };
  function readPending() {
    try { var p = JSON.parse(lsGet(PENDING_KEY) || 'null'); if (p && CODE_RE.test(p.code) && Date.now() - Number(p.at || 0) < 3600000) return p; } catch (e) {}
    lsDel(PENDING_KEY); return null;
  }
  function savePending(code, player) { lsSet(PENDING_KEY, JSON.stringify({ code: code, player: player || null, at: Date.now() })); }

  function fmt(n, unit) {
    var v = Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 });
    return unit === 'points' ? v + ' נק׳' : '₪' + v;
  }
  function signedFmt(n, unit) { n = Math.round(Number(n || 0) * 100) / 100; return n > 0.009 ? '+' + fmt(n, unit) : n < -0.009 ? '−' + fmt(-n, unit) : fmt(0, unit); }
  function transfers(players, ps) {
    var c = [], d = [];
    players.forEach(function (p) {
      var b = Math.round((p.finalChips / ps - p.buyIn) * 100) / 100;
      if (b > 0.009) c.push({ name: p.name, amount: b });
      if (b < -0.009) d.push({ name: p.name, amount: -b });
    });
    c.sort(function (a, b) { return b.amount - a.amount; }); d.sort(function (a, b) { return b.amount - a.amount; });
    var i = 0, j = 0, out = [];
    while (i < d.length && j < c.length) {
      var m = Math.min(d[i].amount, c[j].amount);
      out.push({ from: d[i].name, to: c[j].name, amount: Math.round(m * 100) / 100 });
      d[i].amount = Math.round((d[i].amount - m) * 100) / 100; c[j].amount = Math.round((c[j].amount - m) * 100) / 100;
      if (d[i].amount <= 0.009) i++; if (c[j].amount <= 0.009) j++;
    }
    return out;
  }

  function openViewer(code) {
    V.code = code;
    if (!V.ov) {
      V.ov = document.createElement('div');
      V.ov.className = 'wl-ov';
      V.ov.setAttribute('role', 'dialog');
      V.ov.setAttribute('aria-modal', 'true');
      V.ov.setAttribute('aria-label', 'משחק משותף');
      V.ov.addEventListener('click', onViewerClick);
      document.body.appendChild(V.ov);
      document.documentElement.style.overflow = 'hidden';
    }
    V.ov.innerHTML = '<div class="wl-wrap"><div class="wl-card wl-muted">טוען את המשחק...</div></div>';
    load();
  }
  function closeViewer() {
    clearTimeout(V.timer);
    if (V.ov) V.ov.remove();
    V.ov = null; V.code = null; V.data = null; V.msg = null; V.authAsk = false;
    document.documentElement.style.overflow = '';
    lsDel(PENDING_KEY);
    if (/[?&]g=/.test(location.search)) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  }
  function schedule() {
    clearTimeout(V.timer);
    if (!V.ov) return;
    var finished = V.data && V.data.status === 'finished';
    V.timer = setTimeout(load, document.hidden ? 15000 : finished ? 20000 : 4000);
  }
  function load() {
    if (!V.code) return;
    rpc('wwcd_live_get', { p_code: V.code }).then(function (r) {
      if (!V.ov) return;
      if (r.error && !V.data) { renderViewer(null, errText(r.error)); schedule(); return; }
      if (!r.error) V.data = r.data;
      renderViewer(V.data);
      schedule();
      tryPendingConfirm();
    });
  }
  document.addEventListener('visibilitychange', function () { if (V.ov && !document.hidden) load(); });

  function renderViewer(d, error) {
    if (!V.ov) return;
    var keepScroll = V.ov.scrollTop;
    if (!d) {
      V.ov.innerHTML = '<div class="wl-wrap"><div class="wl-card"><div class="wl-top"><h2 class="wl-title">המשחק לא נמצא</h2><button type="button" class="wl-close" data-act="close">לאפליקציה</button></div>' +
        '<p class="wl-muted">' + esc(error || 'ייתכן שהקישור שגוי או שהמארח ביטל את השיתוף.') + '</p></div></div>';
      return;
    }
    var st = d.state || { players: [], ratioMoney: 50, ratioChips: 500 }, unit = st.unit;
    var ps = Number(st.ratioChips) / Number(st.ratioMoney);
    var finished = d.status === 'finished';
    var seats = {}, mySeat = null;
    (d.seats || []).forEach(function (s) { seats[s.player_id] = s; if (s.mine) mySeat = s.player_id; });
    var pot = st.players.reduce(function (a, p) { return a + Number(p.buyIn || 0); }, 0);
    var rows = st.players.map(function (p) {
      var bal = p.finalChips / ps - p.buyIn;
      var right = finished
        ? '<span class="wl-amt ' + (bal > 0.009 ? 'wl-pos' : bal < -0.009 ? 'wl-neg' : '') + '">' + signedFmt(bal, unit) + '</span>'
        : '<span class="wl-amt">' + fmt(p.buyIn, unit) + '</span>';
      var me = '';
      if (finished) {
        if (mySeat === p.id) me = '<span class="wl-tag">✓ זה אתה — התוצאה אושרה</span>';
        else if (seats[p.id]) me = '<span class="wl-tag taken">אושר</span>';
        else if (!mySeat && !d.is_host) me = '<button type="button" class="wl-btn gold" data-act="me" data-id="' + esc(p.id) + '"' + (V.busy ? ' disabled' : '') + '>זה אני — אשר תוצאה</button>';
      }
      return '<div class="wl-row"><span class="wl-name">' + esc(p.name) + '</span>' + right +
        '<span class="wl-sub">' + (p.buys || 0) + ' קניות · ' + fmt(p.buyIn, unit) + (finished ? ' · ' + Math.round(p.finalChips).toLocaleString('he-IL') + ' ג׳טונים' : '') + '</span>' +
        (me ? '<div class="wl-me">' + me + '</div>' : '') + '</div>';
    }).join('');
    var pays = finished ? transfers(st.players, ps) : [];
    var html = '<div class="wl-wrap">' +
      '<div class="wl-card"><div class="wl-top"><div><h2 class="wl-title">' + esc(d.name || 'ערב פוקר') + '</h2>' +
      (finished ? '<span class="wl-status done">✓ המשחק הסתיים</span>' : '<span class="wl-status"><i class="wl-dot"></i>בשידור חי · מתעדכן לבד</span>') + '</div>' +
      '<button type="button" class="wl-close" data-act="close">' + (d.is_host ? 'חזרה למשחק' : 'לאפליקציה') + '</button></div></div>' +
      (d.is_host ? '<div class="wl-msg info">זה המשחק שלך. החברים רואים בדיוק את המסך הזה.</div>' : '') +
      (V.msg ? '<div class="wl-msg ' + V.msg.type + '">' + esc(V.msg.text) + '</div>' : '') +
      (V.authAsk ? authSheet() : '') +
      (finished && !mySeat && !d.is_host && !V.authAsk && !(V.msg && V.msg.type === 'ok') ? '<div class="wl-msg info">מצא את השם שלך ולחץ "זה אני" כדי לאשר את התוצאה ולקבל נקודות בפרופיל.</div>' : '') +
      '<div class="wl-card wl-pot"><span class="wl-muted">סה״כ בקופה</span><strong>' + fmt(pot, unit) + '</strong></div>' +
      '<div class="wl-card"><div class="wl-muted" style="margin-bottom:4px">' + (finished ? 'תוצאות' : 'שחקנים (' + st.players.length + ')') + '</div>' + (rows || '<div class="wl-muted">עוד אין שחקנים.</div>') + '</div>' +
      (finished ? '<div class="wl-card"><div class="wl-muted" style="margin-bottom:4px">מי מעביר למי</div>' +
        (pays.length ? pays.map(function (t) { return '<div class="wl-pay"><span>' + esc(t.from) + ' ← ' + esc(t.to) + '</span><b>' + fmt(t.amount, unit) + '</b></div>'; }).join('') : '<div class="wl-muted">אין העברות — כולם מאוזנים.</div>') + '</div>' : '') +
      '<p class="wl-muted" style="text-align:center">Winner Poker · המארח מנהל את המשחק, וכל שחקן מאשר רק את התוצאה שלו.</p>' +
      '</div>';
    V.ov.innerHTML = html;
    V.ov.scrollTop = keepScroll;
  }
  function authSheet() {
    return '<div class="wl-card wl-sheet"><b>כדי לאשר צריך להתחבר</b>' +
      '<span class="wl-muted">עם Google התוצאה נכנסת לפרופיל ולנקודות שלך. כאורח היא נשמרת, והנקודות ייכנסו אם תחבר Google אחר כך.</span>' +
      '<button type="button" class="wl-btn green" data-act="google">המשך עם Google</button>' +
      '<button type="button" class="wl-btn" data-act="guest">המשך כאורח</button>' +
      '<button type="button" class="wl-btn" data-act="cancel-auth" style="min-height:38px">ביטול</button></div>';
  }

  function onViewerClick(e) {
    var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    var act = b.getAttribute('data-act');
    if (act === 'close') return closeViewer();
    if (act === 'me') return chooseMe(b.getAttribute('data-id'));
    if (act === 'cancel-auth') { V.authAsk = false; lsDel(PENDING_KEY); return renderViewer(V.data); }
    var a = auth();
    if (act === 'google') {
      if (!a) return;
      b.disabled = true;
      a.signInGoogle(); // בדפדפן: מעבר לגוגל וחזרה; הבחירה שמורה ותאושר כשחוזרים
    }
    if (act === 'guest') {
      if (!a) return;
      b.disabled = true;
      V.msg = { type: 'info', text: 'נכנס כאורח...' }; renderViewer(V.data);
      Promise.resolve(a.signInGuest()).then(function () { setTimeout(tryPendingConfirm, 300); });
    }
  }

  function chooseMe(playerId) {
    var p = (V.data && V.data.state.players || []).find(function (x) { return x.id === playerId; });
    if (!p) return;
    savePending(V.code, playerId);
    if (!signedIn()) { V.authAsk = true; V.msg = { type: 'info', text: 'בחרת: ' + p.name + '. התחבר כדי לסיים את האישור.' }; renderViewer(V.data); return; }
    doConfirm(playerId);
  }
  function tryPendingConfirm() {
    var p = readPending();
    if (!p || !p.player || !V.data || p.code !== V.code || V.busy) return;
    if (V.data.status !== 'finished') return;
    if (!signedIn()) return;
    doConfirm(p.player);
  }
  function doConfirm(playerId) {
    V.busy = true; V.authAsk = false;
    V.msg = { type: 'info', text: 'מאשר...' }; renderViewer(V.data);
    rpc('wwcd_live_confirm', { p_code: V.code, p_player: playerId }).then(function (r) {
      V.busy = false;
      lsDel(PENDING_KEY);
      var a = auth();
      if (r.error) { V.msg = { type: 'err', text: errText(r.error) }; }
      else if (a && a.guest()) V.msg = { type: 'ok', text: 'אושר! כאורח התוצאה נשמרה. התחבר עם Google בפרופיל כדי שהנקודות ייכנסו.' };
      else if (r.data && r.data.counted) V.msg = { type: 'ok', text: 'אושר! התוצאה נוספה לפרופיל שלך.' };
      else V.msg = { type: 'ok', text: 'אושר! הנקודות ייכנסו לפרופיל ברגע שעוד שחקן עם Google יאשר.' };
      if (a && a.refreshStats) a.refreshStats();
      load();
    });
  }
  window.addEventListener('wwcd-auth', function () {
    if (V.ov) { V.msg = V.msg && V.msg.text === 'נכנס כאורח...' ? null : V.msg; load(); }
  });

  function boot() {
    var m = /[?&]g=([A-Za-z0-9]{8})(?:&|$)/.exec(location.search);
    var code = m ? m[1].toUpperCase() : null;
    if (code && !CODE_RE.test(code)) code = null;
    if (!code) { var p = readPending(); if (p) code = p.code; }
    if (code) openViewer(code);
  }

  window.wwcdLive = { share: share, queue: queue, end: end, finish: finish, open: openViewer, link: linkFor };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
