/* chip-scan.js — ספירת ג'טונים מתמונה, ישירות בטלפון (בלי שרת ובלי עלות).
   איך זה עובד: מזהים את צבע השולחן לפי שולי התמונה, כל מה ששונה ממנו הוא ג'טון,
   מחלקים לכתמים, ומחשבים כמה ג'טונים יש בכל כתם לפי הגודל של ג'טון בודד.
   עובד הכי טוב כשהג'טונים מפוזרים על השולחן (לא בערימות) ומצולמים מלמעלה. */
(function () {
  'use strict';
  var VAL_KEY = 'wwcd_chip_value';
  var MAXD = 640;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }

  /* ---------------- ניתוח התמונה ---------------- */
  function otsu(hist, total) {
    var sum = 0, i; for (i = 0; i < hist.length; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, best = 0, thr = 0;
    for (i = 0; i < hist.length; i++) {
      wB += hist[i]; if (!wB) continue;
      var wF = total - wB; if (!wF) break;
      sumB += i * hist[i];
      var mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; thr = i; }
    }
    return thr;
  }
  function median(a) { if (!a.length) return 0; var b = a.slice().sort(function (x, y) { return x - y; }); return b[b.length >> 1]; }

  function morph(mask, w, h, r, dilate) {
    // ארוזיה/דילציה בריבוע, בשני מעברים (אופקי ואנכי) כדי שיהיה מהיר
    var tmp = new Uint8Array(w * h), out = new Uint8Array(w * h), x, y, k, v;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      v = dilate ? 0 : 1;
      for (k = -r; k <= r; k++) { var xx = x + k; var m = (xx < 0 || xx >= w) ? (dilate ? 0 : 1) : mask[y * w + xx]; if (dilate ? m : !m) { v = dilate ? 1 : 0; break; } }
      tmp[y * w + x] = v;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      v = dilate ? 0 : 1;
      for (k = -r; k <= r; k++) { var yy = y + k; var m2 = (yy < 0 || yy >= h) ? (dilate ? 0 : 1) : tmp[yy * w + x]; if (dilate ? m2 : !m2) { v = dilate ? 1 : 0; break; } }
      out[y * w + x] = v;
    }
    return out;
  }

  function analyze(canvas) {
    var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
    var d = ctx.getImageData(0, 0, w, h).data, n = w * h, i, x, y;
    // 1) צבע השולחן = חציון של פיקסלים בשולי התמונה
    var bw = Math.max(3, Math.round(Math.min(w, h) * 0.04)), R = [], G = [], B = [];
    for (y = 0; y < h; y += 2) for (x = 0; x < w; x += 2) {
      if (x < bw || y < bw || x >= w - bw || y >= h - bw) { i = (y * w + x) * 4; R.push(d[i]); G.push(d[i + 1]); B.push(d[i + 2]); }
    }
    var br = median(R), bg = median(G), bb = median(B);
    // 2) כמה כל פיקסל שונה מהשולחן (צבע + בהירות), וסף אוטומטי
    var dist = new Uint8Array(n), hist = new Array(256).fill(0);
    for (i = 0; i < n; i++) {
      var dr = d[i * 4] - br, dg = d[i * 4 + 1] - bg, db = d[i * 4 + 2] - bb;
      var v = Math.min(255, Math.round(Math.sqrt(dr * dr + dg * dg + db * db) / 1.2));
      dist[i] = v; hist[v]++;
    }
    // סף: לפי Otsu, אבל לא גבוה מדי ביחס לרעש של השולחן עצמו (כדי לא לפספס ג'טונים בצבע קרוב לשולחן)
    var bd = [];
    for (y = 0; y < h; y += 2) for (x = 0; x < w; x += 2) if (x < bw || y < bw || x >= w - bw || y >= h - bw) bd.push(dist[y * w + x]);
    bd.sort(function (a, b) { return a - b; });
    var noise = bd.length ? bd[Math.floor(bd.length * 0.95)] : 20;
    var thr = Math.max(16, Math.min(otsu(hist, n), Math.round(noise * 1.6 + 12)));
    var mask = new Uint8Array(n);
    for (i = 0; i < n; i++) mask[i] = dist[i] > thr ? 1 : 0;
    // 3) ניקוי רעשים וסגירת חורים קטנים
    var r = Math.max(1, Math.round(Math.min(w, h) / 220));
    mask = morph(morph(mask, w, h, r, false), w, h, r, true);   // open
    mask = morph(morph(mask, w, h, r, true), w, h, r, false);   // close
    // מילוי חורים: כל רקע שלא מחובר לשולי התמונה (למשל מרכז לבן של ג'טון) שייך לג'טון
    var reach = new Uint8Array(n), stack = [];
    for (x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
    for (y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
    while (stack.length) {
      var p = stack.pop(); if (reach[p] || mask[p]) continue; reach[p] = 1;
      var px = p % w;
      if (px > 0) stack.push(p - 1); if (px < w - 1) stack.push(p + 1);
      if (p >= w) stack.push(p - w); if (p < n - w) stack.push(p + w);
    }
    for (i = 0; i < n; i++) if (!reach[i]) mask[i] = 1;
    // 4) כתמים מחוברים
    var lab = new Int32Array(n), comps = [], minA = n * 0.0004;
    for (i = 0; i < n; i++) {
      if (!mask[i] || lab[i]) continue;
      var id = comps.length + 1, q = [i], A = 0, sx = 0, sy = 0, x0 = w, x1 = 0, y0 = h, y1 = 0, touches = false;
      lab[i] = id;
      while (q.length) {
        var c = q.pop(), cx = c % w, cy = (c - cx) / w;
        A++; sx += cx; sy += cy;
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
        if (cx === 0 || cy === 0 || cx === w - 1 || cy === h - 1) touches = true;
        var nb = [cx > 0 ? c - 1 : -1, cx < w - 1 ? c + 1 : -1, c >= w ? c - w : -1, c < n - w ? c + w : -1];
        for (var k = 0; k < 4; k++) { var t = nb[k]; if (t >= 0 && mask[t] && !lab[t]) { lab[t] = id; q.push(t); } }
      }
      var bwid = x1 - x0 + 1, bhei = y1 - y0 + 1;
      comps.push({ id: id, A: A, cx: sx / A, cy: sy / A, w: bwid, h: bhei, fill: A / (bwid * bhei), aspect: bwid / bhei, edge: touches });
    }
    comps = comps.filter(function (c) { return c.A >= minA && c.A < n * 0.6; });
    // 5) גודל של ג'טון בודד = חציון הכתמים העגולים
    var round = comps.filter(function (c) { return c.aspect > 0.72 && c.aspect < 1.38 && c.fill > 0.62 && c.fill < 0.9; });
    var unit = median((round.length ? round : comps).map(function (c) { return c.A; }));
    var total = 0;
    comps.forEach(function (c) {
      c.count = unit ? Math.round(c.A / unit) : 1;
      if (c.count < 1) c.count = c.A >= unit * 0.4 ? 1 : 0;
      total += c.count;
    });
    comps = comps.filter(function (c) { return c.count > 0; });
    return { comps: comps, total: total, unit: unit, lab: lab, w: w, h: h };
  }

  function drawResult(canvas, img, res) {
    var ctx = canvas.getContext('2d'), w = res.w, h = res.h;
    ctx.drawImage(img, 0, 0, w, h);
    var over = ctx.getImageData(0, 0, w, h), od = over.data, keep = {};
    res.comps.forEach(function (c) { keep[c.id] = 1; });
    for (var i = 0; i < w * h; i++) {
      var l = res.lab[i];
      if (l && keep[l]) {
        var edge = (i % w > 0 && res.lab[i - 1] !== l) || (i % w < w - 1 && res.lab[i + 1] !== l) || (i >= w && res.lab[i - w] !== l) || (i < w * h - w && res.lab[i + w] !== l);
        if (edge) { od[i * 4] = 54; od[i * 4 + 1] = 221; od[i * 4 + 2] = 133; }
      }
    }
    ctx.putImageData(over, 0, 0);
    var rr = Math.max(10, Math.round(Math.sqrt(res.unit || 400) * 0.28));
    ctx.font = '900 ' + Math.round(rr * 1.15) + 'px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    res.comps.forEach(function (c) {
      ctx.beginPath(); ctx.arc(c.cx, c.cy, rr, 0, Math.PI * 2);
      ctx.fillStyle = c.count > 1 ? '#f2c94c' : '#36dd85'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#062012'; ctx.stroke();
      ctx.fillStyle = '#062012'; ctx.fillText(String(c.count), c.cx, c.cy + 1);
    });
  }

  /* ---------------- המסך ---------------- */
  var css = document.createElement('style');
  css.textContent = [
    '#cs-ov{position:fixed;inset:0;z-index:2147483000;display:none;align-items:flex-end;justify-content:center;background:rgba(3,12,8,.78);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);direction:rtl;font-family:inherit}',
    '#cs-ov.show{display:flex}',
    '#cs-ov .cs-sheet{width:min(560px,100%);max-height:94vh;overflow:auto;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));border-radius:26px 26px 0 0;border:1px solid rgba(242,201,76,.25);background:radial-gradient(ellipse at 50% -20%,rgba(242,201,76,.14),transparent 50%),linear-gradient(160deg,#12301f,#06150e);color:#f3efe2;box-shadow:0 -20px 60px rgba(0,0,0,.5);animation:csUp .35s cubic-bezier(.2,.9,.3,1.1)}',
    '@keyframes csUp{from{transform:translateY(40px);opacity:0}}',
    '@media(min-width:700px){#cs-ov{align-items:center}#cs-ov .cs-sheet{border-radius:26px}}',
    '#cs-ov h3{margin:0 0 4px;font-size:20px;font-weight:900;text-align:center}',
    '#cs-ov .cs-sub{margin:0 0 14px;text-align:center;color:#b9c7bd;font-size:13.5px;line-height:1.55}',
    '#cs-ov .cs-tips{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 14px}',
    '#cs-ov .cs-tip{padding:10px 6px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);text-align:center;font-size:12px;color:#d9e3dc;line-height:1.4}',
    '#cs-ov .cs-tip b{display:block;font-size:20px;margin-bottom:2px}',
    '#cs-ov .cs-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;border:0;border-radius:16px;font:inherit;font-size:16px;font-weight:900;cursor:pointer;transition:transform .12s}',
    '#cs-ov .cs-btn:active{transform:scale(.97)}',
    '#cs-ov .cs-go{background:linear-gradient(180deg,#36dd85,#1fb565);color:#062012;box-shadow:0 8px 22px rgba(47,212,124,.25)}',
    '#cs-ov .cs-ghost{margin-top:8px;background:rgba(255,255,255,.06);color:#f3efe2;border:1px solid rgba(255,255,255,.12)}',
    '#cs-ov canvas{display:block;width:100%;height:auto;border-radius:16px;margin:0 0 12px;background:#000}',
    '#cs-ov .cs-res{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}',
    '#cs-ov .cs-res .lbl{color:#b9c7bd;font-size:13px}',
    '#cs-ov .cs-step{display:flex;align-items:center;gap:8px}',
    '#cs-ov .cs-step button{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-size:22px;font-weight:900;cursor:pointer}',
    '#cs-ov .cs-count{min-width:64px;text-align:center;font-size:34px;font-weight:900;color:#f2c94c}',
    '#cs-ov .cs-val{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;margin:0 0 12px;border-radius:14px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);font-size:14px}',
    '#cs-ov .cs-val input{width:90px;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-weight:800;text-align:center}',
    '#cs-ov .cs-total{text-align:center;margin:0 0 12px;color:#d9e3dc;font-size:14px}#cs-ov .cs-total b{color:#36dd85;font-size:18px}',
    '#cs-ov .cs-note{margin:0 0 12px;text-align:center;color:#8fa596;font-size:12px;line-height:1.5}',
    '#cs-ov .cs-busy{padding:40px 0;text-align:center;color:#b9c7bd}',
    '#cs-ov .cs-spin{width:44px;height:44px;margin:0 auto 12px;border-radius:50%;border:5px dashed #f2c94c;animation:csSpin 1s linear infinite}',
    '@keyframes csSpin{to{transform:rotate(360deg)}}',
    '.sk-scan{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;border:1px solid rgba(242,201,76,.35);background:rgba(242,201,76,.08);color:#f2c94c;cursor:pointer;justify-self:end;transition:transform .12s}',
    '.sk-scan:active{transform:scale(.92)}.sk-scan svg{width:20px;height:20px}'
  ].join('\n');
  document.head.appendChild(css);

  var ov, file, state = {};
  function build() {
    if (ov) return;
    ov = document.createElement('div'); ov.id = 'cs-ov'; ov.className = 'sk-overlay';
    ov.innerHTML = '<div class="cs-sheet" role="dialog" aria-modal="true" aria-labelledby="cs-title"><div id="cs-body"></div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov);
    file = document.createElement('input');
    file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    file.onchange = function () { var f = file.files && file.files[0]; file.value = ''; if (f) run(f); };
    document.body.appendChild(file);
  }
  function close() { ov.classList.remove('show'); }
  function body(html) { ov.querySelector('#cs-body').innerHTML = html; }

  function intro() {
    body('<h3 id="cs-title">📸 ספירת ג׳טונים — ' + esc(state.name) + '</h3>' +
      '<p class="cs-sub">מצלמים את הג׳טונים של השחקן, והאפליקציה סופרת אותם.</p>' +
      '<div class="cs-tips"><div class="cs-tip"><b>🫳</b>לפזר על השולחן, בלי ערימות</div><div class="cs-tip"><b>⬇️</b>לצלם ישר מלמעלה</div><div class="cs-tip"><b>💡</b>תאורה טובה, רקע אחיד</div></div>' +
      '<button class="cs-btn cs-go" type="button" id="cs-pick">צלם / בחר תמונה</button>' +
      '<button class="cs-btn cs-ghost" type="button" id="cs-cancel">ביטול</button>');
    ov.querySelector('#cs-pick').onclick = function () { file.click(); };
    ov.querySelector('#cs-cancel').onclick = close;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function run(f) {
    body('<div class="cs-busy"><div class="cs-spin"></div>סופר ג׳טונים…</div>');
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      setTimeout(function () {
        var s = Math.min(1, MAXD / Math.max(img.naturalWidth, img.naturalHeight));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.naturalWidth * s)); cv.height = Math.max(1, Math.round(img.naturalHeight * s));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var res;
        try { res = analyze(cv); } catch (e) { res = { total: 0, comps: [], unit: 0, w: cv.width, h: cv.height, lab: new Int32Array(cv.width * cv.height) }; }
        drawResult(cv, img, res);
        URL.revokeObjectURL(url);
        result(cv, res.total);
      }, 30);
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('לא הצלחתי לפתוח את התמונה'); intro(); };
    img.src = url;
  }

  function result(cv, count) {
    var val = Math.max(1, Number(lsGet(VAL_KEY)) || 1);
    body('<h3 id="cs-title">' + esc(state.name) + '</h3><div id="cs-img"></div>' +
      '<div class="cs-res"><span class="lbl">ג׳טונים שזוהו<br><small>אפשר לתקן עם + / −</small></span>' +
      '<div class="cs-step"><button type="button" data-d="-1" aria-label="פחות">−</button><span class="cs-count" id="cs-n">' + count + '</span><button type="button" data-d="1" aria-label="יותר">+</button></div></div>' +
      '<label class="cs-val"><span>כמה שווה כל ג׳טון?</span><input id="cs-v" type="number" inputmode="numeric" min="1" value="' + val + '"></label>' +
      '<div class="cs-total" id="cs-t"></div>' +
      (count === 0 ? '<p class="cs-note">לא זיהיתי ג׳טונים. נסו לפזר אותם על משטח בצבע אחיד ולצלם מלמעלה.</p>' : '<p class="cs-note">ירוק = ג׳טון אחד, צהוב = כמה ג׳טונים צמודים. שווה לבדוק במבט.</p>') +
      '<button class="cs-btn cs-go" type="button" id="cs-apply">עדכן ל' + esc(state.name) + '</button>' +
      '<button class="cs-btn cs-ghost" type="button" id="cs-again">צלם שוב</button>');
    ov.querySelector('#cs-img').appendChild(cv);
    var n = count, nEl = ov.querySelector('#cs-n'), vEl = ov.querySelector('#cs-v'), tEl = ov.querySelector('#cs-t');
    function upd() { var v = Math.max(1, Number(vEl.value) || 1); tEl.innerHTML = n + ' × ' + v + ' = <b>' + (n * v).toLocaleString('he-IL') + '</b> ג׳טונים'; nEl.textContent = n; }
    ov.querySelectorAll('.cs-step [data-d]').forEach(function (b) { b.onclick = function () { n = Math.max(0, n + Number(b.getAttribute('data-d'))); upd(); }; });
    vEl.oninput = upd; upd();
    ov.querySelector('#cs-again').onclick = function () { file.click(); };
    ov.querySelector('#cs-apply').onclick = function () {
      var v = Math.max(1, Number(vEl.value) || 1); lsSet(VAL_KEY, String(v));
      close(); if (state.cb) state.cb(n * v);
    };
  }

  window.wnChipScan = {
    open: function (name, cb) { build(); state = { name: name, cb: cb }; intro(); ov.classList.add('show'); },
    analyze: analyze
  };
})();
