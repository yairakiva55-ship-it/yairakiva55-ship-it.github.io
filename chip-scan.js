/* chip-scan.js — ספירת ג'טונים מתמונה: ספירה מהירה בטלפון + בדיקת AI שמסמנת כל ג'טון.
   אפשר "ללמד" את הג'טונים של הקבוצה (תמונה של כל סוג + שווי) — הטלפון וה-AI משווים אליהם.
   איך זה עובד: מזהים את צבע השולחן לפי שולי התמונה, כל מה ששונה ממנו הוא ג'טון,
   מחלקים לכתמים, ומחשבים כמה ג'טונים יש בכל כתם לפי הגודל של ג'טון בודד.
   עובד הכי טוב כשהג'טונים מפוזרים על השולחן (לא בערימות) ומצולמים מלמעלה. */
(function () {
  'use strict';
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

  function analyze(canvas, side) {
    var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
    var d = ctx.getImageData(0, 0, w, h).data, n = w * h, i, x, y;
    // 1) צבע השולחן נלמד בנפרד לכל אזור בתמונה (כדי להתמודד עם תאורה לא אחידה וצללים)
    function bgModel(excl) {
      var cs = Math.max(8, Math.round(Math.min(w, h) / 10)), gw = Math.ceil(w / cs), gh = Math.ceil(h / cs);
      var grid = new Array(gw * gh), gx, gy, xx, yy, j;
      for (gy = 0; gy < gh; gy++) for (gx = 0; gx < gw; gx++) {
        var R = [], G = [], B = [], tot = 0;
        for (yy = gy * cs; yy < Math.min(h, gy * cs + cs); yy += 2) for (xx = gx * cs; xx < Math.min(w, gx * cs + cs); xx += 2) {
          tot++; j = yy * w + xx; if (excl && excl[j]) continue;
          R.push(d[j * 4]); G.push(d[j * 4 + 1]); B.push(d[j * 4 + 2]);
        }
        grid[gy * gw + gx] = R.length >= Math.max(4, tot * 0.15) ? [median(R), median(G), median(B)] : null;
      }
      // אזורים שכולם ג'טונים — משלימים מהשכנים
      for (var pass = 0; pass < gw + gh; pass++) {
        var missing = 0, next = grid.slice();
        for (gy = 0; gy < gh; gy++) for (gx = 0; gx < gw; gx++) {
          if (grid[gy * gw + gx]) continue; missing++;
          var acc = [0, 0, 0], cnt = 0;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) {
            var ax = gx + o[0], ay = gy + o[1]; if (ax < 0 || ay < 0 || ax >= gw || ay >= gh) return;
            var c = grid[ay * gw + ax]; if (c) { acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; cnt++; }
          });
          if (cnt) next[gy * gw + gx] = [acc[0] / cnt, acc[1] / cnt, acc[2] / cnt];
        }
        grid = next; if (!missing) break;
      }
      for (j = 0; j < grid.length; j++) if (!grid[j]) grid[j] = [128, 128, 128];
      // מעבר חלק בין האזורים
      var out = new Float32Array(n * 3);
      for (yy = 0; yy < h; yy++) {
        var fy = Math.min(gh - 1, Math.max(0, (yy + 0.5) / cs - 0.5)), y0 = Math.floor(fy), y1 = Math.min(gh - 1, y0 + 1), ty = fy - y0;
        for (xx = 0; xx < w; xx++) {
          var fx = Math.min(gw - 1, Math.max(0, (xx + 0.5) / cs - 0.5)), x0 = Math.floor(fx), x1 = Math.min(gw - 1, x0 + 1), tx = fx - x0;
          var a = grid[y0 * gw + x0], b = grid[y0 * gw + x1], c2 = grid[y1 * gw + x0], e = grid[y1 * gw + x1];
          for (var ch = 0; ch < 3; ch++) out[(yy * w + xx) * 3 + ch] = (a[ch] * (1 - tx) + b[ch] * tx) * (1 - ty) + (c2[ch] * (1 - tx) + e[ch] * tx) * ty;
        }
      }
      return out;
    }
    // 2) כמה כל פיקסל שונה מהשולחן שמתחתיו, וסף אוטומטי
    var dist = new Uint8Array(n), mask = new Uint8Array(n);
    function score(bgm, excl) {
      var hist = new Array(256).fill(0), bd = [];
      for (i = 0; i < n; i++) {
        var dr = d[i * 4] - bgm[i * 3], dg = d[i * 4 + 1] - bgm[i * 3 + 1], db = d[i * 4 + 2] - bgm[i * 3 + 2];
        var v = Math.min(255, Math.round(Math.sqrt(dr * dr + dg * dg + db * db) / 1.2));
        dist[i] = v; hist[v]++;
        if ((!excl || !excl[i]) && (i & 3) === 0) bd.push(v);
      }
      bd.sort(function (a, b) { return a - b; });
      var noise = bd.length ? bd[Math.floor(bd.length * 0.95)] : 20;
      var thr = Math.max(14, Math.min(otsu(hist, n), Math.round(noise * 1.6 + 12)));
      // סף כפול: פיקסל "חלש" נחשב ג'טון אם הוא מחובר לפיקסל "חזק" (תופס שוליים כהים של ג'טונים)
      var weak = Math.max(10, Math.round(thr * 0.55)), st = [];
      for (i = 0; i < n; i++) { mask[i] = dist[i] > thr ? 1 : 0; if (mask[i]) st.push(i); }
      while (st.length) {
        var q0 = st.pop(), qx = q0 % w;
        var nbs = [qx > 0 ? q0 - 1 : -1, qx < w - 1 ? q0 + 1 : -1, q0 >= w ? q0 - w : -1, q0 < n - w ? q0 + w : -1];
        for (var t0 = 0; t0 < 4; t0++) { var u = nbs[t0]; if (u >= 0 && !mask[u] && dist[u] > weak) { mask[u] = 1; st.push(u); } }
      }
    }
    score(bgModel(null), null);
    var excl = morph(mask, w, h, Math.max(2, Math.round(Math.min(w, h) / 80)), true);
    score(bgModel(excl), excl);
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
      var id = comps.length + 1, q = [i], pix = [], A = 0, sx = 0, sy = 0, x0 = w, x1 = 0, y0 = h, y1 = 0, touches = false;
      lab[i] = id;
      while (q.length) {
        var c = q.pop(), cx = c % w, cy = (c - cx) / w;
        A++; sx += cx; sy += cy; pix.push(c);
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
        if (cx === 0 || cy === 0 || cx === w - 1 || cy === h - 1) touches = true;
        var nb = [cx > 0 ? c - 1 : -1, cx < w - 1 ? c + 1 : -1, c >= w ? c - w : -1, c < n - w ? c + w : -1];
        for (var k = 0; k < 4; k++) { var t = nb[k]; if (t >= 0 && mask[t] && !lab[t]) { lab[t] = id; q.push(t); } }
      }
      var bwid = x1 - x0 + 1, bhei = y1 - y0 + 1;
      comps.push({ id: id, pix: pix, x0: x0, x1: x1, y0: y0, y1: y1, A: A, cx: sx / A, cy: sy / A, w: bwid, h: bhei, fill: A / (bwid * bhei), aspect: bwid / bhei, edge: touches });
    }
    comps = comps.filter(function (c) { return c.A >= minA && c.A < n * 0.6; });
    if (side) return stacks(d, lab, comps, w, h);
    // דברים שנחתכים בשולי התמונה ולא נראים כמו ג'טון (קצה שולחן, יד, חפץ) — לא נספרים
    function roundish(c) { return c.aspect > 0.72 && c.aspect < 1.38 && c.fill > 0.62 && c.fill < 0.9; }
    // 5) גודל של ג'טון בודד = חציון הכתמים העגולים (בלי אלה שבשוליים)
    var round = comps.filter(function (c) { return roundish(c) && !c.edge; });
    if (!round.length) round = comps.filter(roundish);
    var unit = median((round.length ? round : comps).map(function (c) { return c.A; }));
    // בשוליים: ג'טון חתוך או כמה צמודים נספרים; דבר גדול/מוזר (קצה שולחן, יד) — לא
    comps = comps.filter(function (c) { return !c.edge || roundish(c) || (c.A < unit * 3.5 && c.fill > 0.45); });
    var total = 0;
    comps.forEach(function (c) {
      c.count = unit ? Math.round(c.A / unit) : 1;
      if (c.count < 1) c.count = c.A >= unit * 0.4 ? 1 : 0;
      total += c.count;
    });
    comps = comps.filter(function (c) { return c.count > 0; });
    // 6) כל ג'טון בנפרד: מפרידים כתמים של כמה ג'טונים צמודים, ומזהים את הצבע של כל אחד
    var ur = Math.sqrt((unit || 400) / Math.PI), chips = [];
    comps.forEach(function (c) {
      var centers = c.count === 1 ? [[c.cx, c.cy]] : kmeans(c.pix, c.count, w);
      centers.forEach(function (ct) { chips.push({ x: ct[0], y: ct[1], color: classify(d, lab, w, h, ct, centers, c.id, ur) }); });
      c.pix = null;
    });
    return { comps: comps, chips: chips, total: chips.length, unit: unit, lab: lab, w: w, h: h };
  }

  /* ---------- ערימות מצולמות מהצד: כל ג'טון הוא פס, סופרים את הפסים ---------- */
  function stacks(d, lab, comps, w, h) {
    var out = [], chips = [];
    comps.forEach(function (c) {
      var D = c.x1 - c.x0 + 1, Hh = c.y1 - c.y0 + 1;
      if (D < w * 0.03 || c.edge) return;
      var widths = [], y, x, j;
      for (y = c.y0; y <= c.y1; y++) { var cnt = 0; for (x = c.x0; x <= c.x1; x++) if (lab[y * w + x] === c.id) cnt++; widths.push(cnt); }
      // החלק העליון (העיגול של הג'טון העליון) לא נספר כגובה
      // רוחב "אמיתי" של הערימה = חציון הרוחב בחצי התחתון (הצדדים הכהים לא מטעים)
      var Db = median(widths.slice(Math.floor(widths.length / 2))) || D;
      var topRows = 0; while (topRows < widths.length && widths[topRows] < Db * 0.9) topRows++;
      // משטח הג'טון העליון נראה כאליפסה מעל הצד; הצד של הערימה מתחיל בתחתית האליפסה
      var eh = Math.min(Hh * 0.45, D * 0.35, 2 * topRows / 0.56), yTop = c.y0 + eh, yBot = c.y1, body = yBot - yTop;
      var P0 = D * 0.085;
      if (body < P0 * 0.5) return;
      // אות: כמה השורה שונה מהשורה שמעליה (במרכז הערימה) — גבוה בגבול בין ג'טונים
      var xa = Math.round(c.x0 + D * 0.15), xb = Math.round(c.x1 - D * 0.15), e = [];
      for (y = Math.round(yTop); y <= yBot; y++) {
        var acc = 0, m = 0;
        for (x = xa; x <= xb; x++) { j = y * w + x; var k2 = j - w; acc += Math.abs(d[j * 4] - d[k2 * 4]) + Math.abs(d[j * 4 + 1] - d[k2 * 4 + 1]) + Math.abs(d[j * 4 + 2] - d[k2 * 4 + 2]); m++; }
        e.push(m ? acc / m : 0);
      }
      var mean = e.reduce(function (a, b) { return a + b; }, 0) / (e.length || 1);
      function at(pos) { var p = Math.round(pos), best = 0; for (var q = p - 1; q <= p + 1; q++) if (q >= 0 && q < e.length && e[q] > best) best = e[q]; return best; }
      function lo(pos) { var p = Math.round(pos), sm = 0, cn = 0; for (var q = p - 1; q <= p + 1; q++) if (q >= 0 && q < e.length) { sm += e[q]; cn++; } return cn ? sm / cn : 0; }
      // ציון לכל מספר אפשרי: הגבולות בין הג'טונים צריכים להיות "רועשים" ואמצע כל ג'טון "שקט"
      var nMin = Math.max(2, Math.floor(body / (P0 * 1.8))), nMax = Math.max(2, Math.ceil(body / (P0 * 0.5))), best = -Infinity, n = 1;
      for (var nn = nMin; nn <= nMax; nn++) {
        var hi = 0, mid = 0;
        for (var k = 1; k < nn; k++) hi += at(k * body / nn);
        for (k = 0; k < nn; k++) mid += lo((k + 0.5) * body / nn);
        var sc = hi / (nn - 1) - mid / nn;
        if (sc > best) { best = sc; n = nn; }
      }
      if (best < Math.max(6, mean * 0.5)) n = Math.max(1, Math.round(body / P0));
      // צבע של כל ג'טון בערימה
      var layers = [];
      for (var L = 0; L < n; L++) {
        var ya = yTop + body * L / n, yb = yTop + body * (L + 1) / n, votes = {};
        for (y = Math.round(ya + (yb - ya) * 0.25); y <= Math.round(yb - (yb - ya) * 0.25); y++) for (x = xa; x <= xb; x += 2) {
          j = (y * w + x) * 4; var cc = colorKey(d[j], d[j + 1], d[j + 2]); votes[cc] = (votes[cc] || 0) + 1;
        }
        var bc = 'white', bv = -1; Object.keys(votes).forEach(function (k3) { var v = votes[k3] * (k3 === 'white' ? 0.8 : 1); if (v > bv) { bv = v; bc = k3; } });
        layers.push(bc); chips.push({ x: c.x0 + D / 2, y: (ya + yb) / 2, color: bc });
      }
      out.push({ x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1, yTop: yTop, n: n, layers: layers, id: c.id });
      c.pix = null;
    });
    var ids = {}; out.forEach(function (st) { ids[st.id] = 1; });
    return { side: true, stacks: out, chips: chips, total: chips.length, comps: comps.filter(function (c) { return ids[c.id]; }), lab: lab, unit: 0, w: w, h: h };
  }

  // חלוקת כתם ל-k ג'טונים (k-means על המיקומים)
  function kmeans(pix, k, w) {
    var step = Math.max(1, Math.floor(pix.length / 3000)), P = [], i, j, it;
    for (i = 0; i < pix.length; i += step) P.push([pix[i] % w, Math.floor(pix[i] / w)]);
    var mx = 0, my = 0; P.forEach(function (p) { mx += p[0]; my += p[1]; }); mx /= P.length; my /= P.length;
    var C = [], far = function (ref) { var best = null, bd = -1; P.forEach(function (p) { var m = Infinity; ref.forEach(function (r) { var dd = (p[0] - r[0]) * (p[0] - r[0]) + (p[1] - r[1]) * (p[1] - r[1]); if (dd < m) m = dd; }); if (m > bd) { bd = m; best = p; } }); return [best[0], best[1]]; };
    C.push(far([[mx, my]]));
    while (C.length < k) C.push(far(C));
    for (it = 0; it < 15; it++) {
      var S = C.map(function () { return [0, 0, 0]; });
      P.forEach(function (p) {
        var bi = 0, bd = Infinity;
        for (j = 0; j < C.length; j++) { var dd = (p[0] - C[j][0]) * (p[0] - C[j][0]) + (p[1] - C[j][1]) * (p[1] - C[j][1]); if (dd < bd) { bd = dd; bi = j; } }
        S[bi][0] += p[0]; S[bi][1] += p[1]; S[bi][2]++;
      });
      C = C.map(function (c, j2) { return S[j2][2] ? [S[j2][0] / S[j2][2], S[j2][1] / S[j2][2]] : c; });
    }
    return C;
  }

  // צבעי הג'טונים (הערכים ניתנים לשינוי ונשמרים)
  var COLORS = [
    { k: 'white', n: 'לבן', hex: '#f4f4ee', def: 1 },
    { k: 'red', n: 'אדום', hex: '#d63c3c', def: 5 },
    { k: 'blue', n: 'כחול', hex: '#2a6fd6', def: 10 },
    { k: 'green', n: 'ירוק', hex: '#1f9e5a', def: 25 },
    { k: 'pink', n: 'ורוד', hex: '#e86fa8', def: 50 },
    { k: 'black', n: 'שחור', hex: '#1c1c1c', def: 100 },
    { k: 'orange', n: 'כתום', hex: '#e67e22', def: 250 },
    { k: 'purple', n: 'סגול', hex: '#7b3fb0', def: 500 },
    { k: 'yellow', n: 'צהוב', hex: '#e8c22e', def: 1000 }
  ];
  function colorOf(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, sat = mx ? (mx - mn) / mx : 0, hue = 0;
    if (mx !== mn) {
      if (mx === r) hue = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) hue = 60 * ((b - r) / (mx - mn) + 2); else hue = 60 * ((r - g) / (mx - mn) + 4);
      if (hue < 0) hue += 360;
    }
    if (v < 0.22 || (sat < 0.25 && v < 0.45)) return 'black';
    if (sat < 0.22) return 'white';
    if (hue < 12 || hue >= 345) return 'red';
    if (hue < 38) return 'orange';
    if (hue < 72) return 'yellow';
    if (hue < 170) return 'green';
    if (hue < 260) return 'blue';
    if (hue < 300) return 'purple';
    return 'pink';
  }
  // הצבע של ג'טון = הצבע השכיח בטבעת שלו (בלי המרכז ובלי הקצה)
  function classify(d, lab, w, h, ct, centers, id, ur) {
    var R = [], G = [], B = [];
    for (var a = 0; a < 64; a++) for (var rf = 0.55; rf <= 0.86; rf += 0.1) {
      var x = Math.round(ct[0] + Math.cos(a / 64 * 6.2832) * ur * rf), y = Math.round(ct[1] + Math.sin(a / 64 * 6.2832) * ur * rf);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      var j = y * w + x; if (lab[j] !== id) continue;
      if (centers.length > 1) {
        var mine = (x - ct[0]) * (x - ct[0]) + (y - ct[1]) * (y - ct[1]), ok = true;
        centers.forEach(function (o) { if (o !== ct && (x - o[0]) * (x - o[0]) + (y - o[1]) * (y - o[1]) < mine) ok = false; });
        if (!ok) continue;
      }
      R.push(d[j * 4]); G.push(d[j * 4 + 1]); B.push(d[j * 4 + 2]);
    }
    if (!R.length) return 'white';
    // הצבעה לפי פיקסלים (עמיד לפסים לבנים על הג'טון)
    var votes = {};
    for (var i = 0; i < R.length; i++) { var c = colorKey(R[i], G[i], B[i]); votes[c] = (votes[c] || 0) + 1; }
    var best = null, bv = -1;
    Object.keys(votes).forEach(function (c) { var v = votes[c] * (c === 'white' ? 0.8 : 1); if (v > bv) { bv = v; best = c; } });
    return best;
  }

  /* ---------- "ללמד את הג׳טונים שלנו": תמונה של ג׳טון אחד מכל סוג, נשמרת בטלפון ---------- */
  var REFS_KEY = 'wwcd_chip_refs';
  function loadRefs() { var a = []; try { a = JSON.parse(lsGet(REFS_KEY) || '[]') || []; } catch (e) {} return Array.isArray(a) ? a.filter(function (r) { return r && r.k && r.img && r.rgb && hexOf(r.k); }) : []; }
  function saveRefs() { lsSet(REFS_KEY, JSON.stringify(REFS.map(function (r) { return { k: r.k, img: r.img, rgb: r.rgb }; }))); }
  function refOf(k) { for (var i = 0; i < REFS.length; i++) if (REFS[i].k === k) return REFS[i]; return null; }
  function hexOf(k) { for (var i = 0; i < COLORS.length; i++) if (COLORS[i].k === k) return COLORS[i].hex; return null; }
  function toLab(r, g, b) {
    function f(c) { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; }
    var R = f(r), G = f(g), B = f(b);
    var X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    function h(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    var fx = h(X), fy = h(Y), fz = h(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  // הצבע של פיקסל: אם לימדו את הג׳טונים — הג׳טון הכי דומה, אחרת לפי גוון כללי
  function colorKey(r, g, b) {
    if (!REFS.length) return colorOf(r, g, b);
    var L = toLab(r, g, b), best = REFS[0].k, bd = Infinity;
    for (var i = 0; i < REFS.length; i++) {
      var rf = REFS[i]; if (!rf.lab) rf.lab = toLab(rf.rgb[0], rf.rgb[1], rf.rgb[2]);
      var dl = L[0] - rf.lab[0], da = L[1] - rf.lab[1], db = L[2] - rf.lab[2], dd = dl * dl * 0.6 + da * da + db * db;
      if (dd < bd) { bd = dd; best = rf.k; }
    }
    // צבע שלא לימדו ושלא דומה לאף ג׳טון שנלמד — לפי הגוון הכללי
    var gk = colorOf(r, g, b);
    if (best !== gk && !refOf(gk) && bd > 26 * 26) return gk;
    return best;
  }
  var REFS = loadRefs();

  // צבע שולט בעיגול סביב נקודה (לג׳טון שהמשתמש הוסיף בלחיצה, ולתמונת הלימוד)
  function sampleColor(d, w, h, cx, cy, rad, keyFn) {
    var votes = {}, px = {};
    for (var a = 0; a < 48; a++) for (var rf = 0.25; rf <= 0.85; rf += 0.15) {
      var x = Math.round(cx + Math.cos(a / 48 * 6.2832) * rad * rf), y = Math.round(cy + Math.sin(a / 48 * 6.2832) * rad * rf);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      var j = (y * w + x) * 4, k = keyFn(d[j], d[j + 1], d[j + 2]);
      votes[k] = (votes[k] || 0) + 1; (px[k] = px[k] || []).push([d[j], d[j + 1], d[j + 2]]);
    }
    var best = 'white', bv = -1;
    Object.keys(votes).forEach(function (k) { var v = votes[k] * (k === 'white' ? 0.8 : 1); if (v > bv) { bv = v; best = k; } });
    var P = px[best] || [[128, 128, 128]];
    return { k: best, rgb: [0, 1, 2].map(function (c) { return median(P.map(function (p) { return p[c]; })); }) };
  }

  function drawMarks(ctx, marks, rr) {
    var fs = Math.max(13, Math.round(rr * 1.25));
    marks.forEach(function (m) {
      if (m.box) {
        ctx.lineWidth = Math.max(2, rr * 0.22); ctx.strokeStyle = 'rgba(54,221,133,.9)';
        ctx.strokeRect(m.box[0], m.box[1], m.box[2] - m.box[0], m.box[3] - m.box[1]);
      }
      ctx.beginPath(); ctx.arc(m.x, m.y, rr + 3, 0, Math.PI * 2); ctx.fillStyle = m.added ? '#f2c94c' : '#36dd85'; ctx.fill();
      ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, Math.PI * 2); ctx.fillStyle = hexOf(m.color) || '#fff'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#062012'; ctx.stroke();
      if (m.n > 1) {
        ctx.font = '900 ' + fs + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = '#062012'; ctx.strokeText('×' + m.n, m.x, m.y - rr - fs * 0.7);
        ctx.fillStyle = '#fff'; ctx.fillText('×' + m.n, m.x, m.y - rr - fs * 0.7);
      }
    });
  }

  function drawResult(canvas, img, res, marks, rr) {
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
    if (res.side) {
      var fs = Math.max(16, Math.round(w / 32));
      (res.stacks || []).forEach(function (st) {
        var sw = st.x1 - st.x0, body = st.y1 - st.yTop, tick = Math.max(6, sw * 0.12);
        for (var L = 0; L < st.n; L++) {
          var ya = st.yTop + body * L / st.n, yb = st.yTop + body * (L + 1) / st.n;
          ctx.fillStyle = hexOf(st.layers[L]) || '#fff'; ctx.fillRect(st.x1 + 4, ya + 1, tick, Math.max(2, yb - ya - 2));
          ctx.strokeStyle = '#36dd85'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(st.x0 - 3, yb); ctx.lineTo(st.x0 + sw * 0.18, yb); ctx.stroke();
        }
        ctx.font = '900 ' + fs + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        var lx = (st.x0 + st.x1) / 2, ly = Math.max(fs + 6, st.y0 - 8);
        ctx.fillStyle = '#36dd85'; ctx.beginPath(); ctx.arc(lx, ly - fs * 0.55, fs * 0.85, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#062012'; ctx.fillText(String(st.n), lx, ly - fs * 0.05);
      });
      return;
    }
    drawMarks(ctx, marks, rr);
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
    '#cs-ov .cs-head{display:grid;grid-template-columns:1fr 122px 92px;gap:8px;padding:0 4px 6px;color:#8fa596;font-size:11.5px}',
    '#cs-ov .cs-crow{display:grid;grid-template-columns:22px 1fr 110px 12px 72px;align-items:center;gap:8px;padding:8px 10px;margin:0 0 6px;border-radius:14px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.07)}',
    '#cs-ov .cs-sw{width:22px;height:22px;border-radius:50%;border:3px dashed rgba(255,255,255,.7);box-shadow:0 0 0 1px rgba(0,0,0,.4)}',
    '#cs-ov .cs-crow b{font-size:14px}',
    '#cs-ov .cs-mini{display:flex;align-items:center;justify-content:space-between}',
    '#cs-ov .cs-mini button{width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-size:18px;font-weight:900;cursor:pointer}',
    '#cs-ov .cs-c{min-width:28px;text-align:center;font-size:18px;font-weight:900;color:#f2c94c}',
    '#cs-ov .cs-x{color:#8fa596;text-align:center}',
    '#cs-ov .cs-crow input{width:100%;box-sizing:border-box;padding:7px 4px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-weight:800;text-align:center}',
    '#cs-ov .cs-more{margin:0 0 12px}#cs-ov .cs-more summary{cursor:pointer;color:#f2c94c;font-size:13px;font-weight:800;padding:6px 4px;margin-bottom:6px}',
    '#cs-ov .cs-ai{margin:0 0 12px;padding:12px 14px;border-radius:16px;font-size:14px;line-height:1.5;display:grid;gap:6px}',
    '#cs-ov .cs-ai small{display:block;color:#b9c7bd;font-size:12px}',
    '#cs-ov .cs-ai.wait{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#d9e3dc;display:flex;align-items:center;gap:10px}',
    '#cs-ov .cs-dot{width:14px;height:14px;border-radius:50%;border:3px solid #f2c94c;border-top-color:transparent;animation:csSpin .8s linear infinite}',
    '#cs-ov .cs-ai.mute{background:rgba(255,255,255,.04);color:#8fa596;font-size:12.5px}',
    '#cs-ov .cs-ai.ok{background:rgba(47,212,124,.12);border:1px solid rgba(47,212,124,.4);color:#7af0b0;animation:csPop .4s ease}',
    '#cs-ov .cs-ai.diff{background:rgba(242,201,76,.1);border:1px solid rgba(242,201,76,.4);color:#f6dc86;animation:csPop .4s ease}',
    '@keyframes csPop{from{transform:scale(.96);opacity:0}}',
    '#cs-ov .cs-pills{display:flex;flex-wrap:wrap;gap:6px}',
    '#cs-ov .cs-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:99px;background:rgba(0,0,0,.25);color:#fff;font-weight:800;font-size:13px}',
    '#cs-ov .cs-pill i{width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.5)}',
    '#cs-ov .cs-use{margin-top:2px;min-height:42px;border:0;border-radius:12px;background:#f2c94c;color:#1b1503;font:inherit;font-weight:900;cursor:pointer}',
    '#cs-ov .cs-modes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 12px}',
    '#cs-ov .cs-mode{display:grid;justify-items:center;gap:2px;padding:12px 8px;border-radius:16px;border:1.5px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#f3efe2;font:inherit;font-weight:900;font-size:15px;cursor:pointer;transition:all .15s}',
    '#cs-ov .cs-mode b{font-size:24px}#cs-ov .cs-mode small{font-weight:600;font-size:12px;color:#9fb3a6}',
    '#cs-ov .cs-mode.on{border-color:#36dd85;background:rgba(47,212,124,.12);box-shadow:0 0 0 3px rgba(47,212,124,.15)}',
    '#cs-ov .cs-busy{padding:40px 0;text-align:center;color:#b9c7bd}',
    '#cs-ov .cs-spin{width:44px;height:44px;margin:0 auto 12px;border-radius:50%;border:5px dashed #f2c94c;animation:csSpin 1s linear infinite}',
    '@keyframes csSpin{to{transform:rotate(360deg)}}',
    '.sk-scan{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;border:1px solid rgba(242,201,76,.35);background:rgba(242,201,76,.08);color:#f2c94c;cursor:pointer;justify-self:end;transition:transform .12s}',
    '.sk-scan:active{transform:scale(.92)}.sk-scan svg{width:20px;height:20px}',
    '#cs-ov canvas{cursor:crosshair;touch-action:manipulation}',
    '#cs-ov .cs-tools{display:flex;justify-content:flex-start;margin:-6px 0 6px}',
    '#cs-ov .cs-undo{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#f3efe2;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}',
    '#cs-ov .cs-use2{margin-top:2px;min-height:38px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.06);color:#f3efe2;font:inherit;font-weight:800;cursor:pointer}',
    '#cs-ov .cs-learn{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 12px;padding:12px 14px;border-radius:16px;border:1.5px dashed rgba(242,201,76,.55);background:rgba(242,201,76,.07);color:#f3efe2;font:inherit;text-align:right;cursor:pointer}',
    '#cs-ov .cs-learn>span:first-child{font-size:26px}#cs-ov .cs-learn b{display:block;font-size:15px;color:#f2c94c}#cs-ov .cs-learn small{display:block;font-size:12px;color:#b9c7bd;margin-top:2px;line-height:1.4}',
    '#cs-ov .cs-learn.done{border-style:solid;border-color:rgba(47,212,124,.45);background:rgba(47,212,124,.08)}#cs-ov .cs-learn.done b{color:#7af0b0}',
    '#cs-ov .cs-lhead{display:grid;grid-template-columns:44px 1fr 80px 44px 32px;gap:8px;padding:0 10px 4px;color:#8fa596;font-size:11.5px}',
    '#cs-ov .cs-lrow{display:grid;grid-template-columns:44px 1fr 80px 44px 32px;align-items:center;gap:8px;padding:6px 10px;margin:0 0 6px;border-radius:14px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.07)}',
    '#cs-ov .cs-lrow.has{border-color:rgba(47,212,124,.35)}',
    '#cs-ov .cs-lrow .cs-sw{width:30px;height:30px;justify-self:center}',
    '#cs-ov .cs-thumb{width:44px;height:44px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px #36dd85}',
    '#cs-ov .cs-thumb.sm{width:22px;height:22px;box-shadow:0 0 0 1.5px #36dd85}',
    '#cs-ov .cs-lrow input{width:100%;box-sizing:border-box;padding:8px 4px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-weight:800;text-align:center}',
    '#cs-ov .cs-cam{width:44px;height:40px;border-radius:12px;border:0;background:#f2c94c;color:#1b1503;font-size:18px;cursor:pointer}',
    '#cs-ov .cs-del{width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:transparent;color:#d9a3a3;font-size:14px;cursor:pointer}'
  ].join('\n');
  document.head.appendChild(css);

  var ov, file, refFile, state = {};
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
    refFile = document.createElement('input');
    refFile.type = 'file'; refFile.accept = 'image/*'; refFile.hidden = true;
    refFile.onchange = function () { var f = refFile.files && refFile.files[0]; refFile.value = ''; if (f && state.refK) captureRef(f, state.refK); };
    document.body.appendChild(refFile);
  }
  function close() { ov.classList.remove('show'); }
  function body(html) { ov.querySelector('#cs-body').innerHTML = html; }
  function busy(t) { body('<div class="cs-busy"><div class="cs-spin"></div>' + t + '</div>'); }

  function intro() {
    var side = state.mode === 'side', nRefs = REFS.length;
    body('<h3 id="cs-title">📸 ספירת ג׳טונים — ' + esc(state.name) + '</h3>' +
      '<p class="cs-sub">איך הג׳טונים מסודרים?</p>' +
      '<div class="cs-modes"><button type="button" class="cs-mode' + (side ? '' : ' on') + '" data-m="top"><b>🫳</b>מפוזרים<small>צילום מלמעלה</small></button>' +
      '<button type="button" class="cs-mode' + (side ? ' on' : '') + '" data-m="side"><b>🗼</b>בערימות<small>צילום מהצד</small></button></div>' +
      (side
        ? '<div class="cs-tips"><div class="cs-tip"><b>↔️</b>לצלם מהצד, בגובה הערימות</div><div class="cs-tip"><b>🧱</b>רווח קטן בין ערימה לערימה</div><div class="cs-tip"><b>💡</b>תאורה טובה, רקע אחיד</div></div>'
        : '<div class="cs-tips"><div class="cs-tip"><b>🫳</b>לפזר על השולחן, בלי ערימות</div><div class="cs-tip"><b>⬇️</b>לצלם ישר מלמעלה</div><div class="cs-tip"><b>💡</b>תאורה טובה, רקע אחיד</div></div>') +
      '<button type="button" class="cs-learn' + (nRefs ? ' done' : '') + '" id="cs-learn"><span>🎯</span><span><b>' + (nRefs ? 'הג׳טונים שלכם נלמדו (' + nRefs + ' סוגים)' : 'ללמד את הג׳טונים שלכם') + '</b><small>' +
        (nRefs ? 'לחצו כדי להוסיף סוג או לשנות שווי' : 'צילום אחד לכל סוג ג׳טון + כמה הוא שווה — הזיהוי נהיה הרבה יותר מדויק') + '</small></span></button>' +
      '<button class="cs-btn cs-go" type="button" id="cs-pick">צלם / בחר תמונה</button>' +
      '<button class="cs-btn cs-ghost" type="button" id="cs-cancel">ביטול</button>');
    ov.querySelectorAll('.cs-mode').forEach(function (b2) { b2.onclick = function () { state.mode = b2.getAttribute('data-m'); lsSet(MODE_KEY, state.mode); intro(); }; });
    ov.querySelector('#cs-learn').onclick = learn;
    ov.querySelector('#cs-pick').onclick = function () { file.click(); };
    ov.querySelector('#cs-cancel').onclick = close;
  }
  var MODE_KEY = 'wwcd_chip_mode';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- מסך הלימוד ---------- */
  function learn() {
    var vals = loadVals();
    function row(c) {
      var r = refOf(c.k);
      return '<div class="cs-lrow' + (r ? ' has' : '') + '" data-k="' + c.k + '">' +
        (r ? '<img class="cs-thumb" src="' + r.img + '" alt="">' : '<span class="cs-sw" style="background:' + c.hex + '"></span>') +
        '<b>' + c.n + '</b>' +
        '<input type="number" inputmode="numeric" min="1" value="' + vals[c.k] + '" aria-label="שווי ' + c.n + '">' +
        '<button type="button" class="cs-cam" aria-label="צלם ג׳טון ' + c.n + '">' + (r ? '🔄' : '📷') + '</button>' +
        (r ? '<button type="button" class="cs-del" aria-label="מחק">✕</button>' : '<span></span>') + '</div>';
    }
    body('<h3 id="cs-title">🎯 ללמד את הג׳טונים שלכם</h3>' +
      '<p class="cs-sub">לכל סוג ג׳טון שיש לכם: לוחצים 📷 ומצלמים <b>ג׳טון אחד</b> מקרוב, מלמעלה, על השולחן. ליד כל צבע — כמה הוא שווה.<br>מעכשיו ה-AI משווה כל ג׳טון בתמונה לג׳טונים שלכם, כך שהוא לא מתבלבל בין צבעים דומים.</p>' +
      '<div class="cs-lhead"><span></span><span>צבע</span><span>שווי</span><span></span><span></span></div>' +
      COLORS.map(row).join('') +
      '<p class="cs-note">אין לכם צבע מסוים? פשוט מדלגים עליו. הכול נשמר בטלפון הזה.</p>' +
      '<button class="cs-btn cs-go" type="button" id="cs-ldone">סיימתי ✓</button>');
    ov.querySelectorAll('.cs-lrow').forEach(function (r) {
      var k = r.getAttribute('data-k'), inp = r.querySelector('input');
      inp.oninput = function () { var v = loadValsStored(); var n = Math.round(Number(inp.value)); if (n > 0) { v[k] = n; lsSet(VALS_KEY, JSON.stringify(v)); } };
      r.querySelector('.cs-cam').onclick = function () { state.refK = k; refFile.click(); };
      var del = r.querySelector('.cs-del');
      if (del) del.onclick = function () { REFS = REFS.filter(function (x) { return x.k !== k; }); saveRefs(); learn(); };
    });
    ov.querySelector('#cs-ldone').onclick = intro;
  }

  function captureRef(f, k) {
    busy('לומד את הג׳טון…');
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      setTimeout(function () {
        var s = Math.min(1, MAXD / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.naturalWidth * s)); cv.height = Math.max(1, Math.round(img.naturalHeight * s));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var W = cv.width, H = cv.height, res = null, saved = REFS;
        REFS = []; try { res = analyze(cv, false); } catch (e) { res = null; } REFS = saved;
        // הג׳טון = הכתם הכי קרוב למרכז התמונה
        var box = null, bestD = Infinity;
        ((res && res.comps) || []).forEach(function (c) {
          var dd = Math.pow(c.cx - W / 2, 2) + Math.pow(c.cy - H / 2, 2) - c.A * 0.3;
          if (c.A > W * H * 0.004 && dd < bestD) { bestD = dd; box = [c.x0, c.y0, c.x1, c.y1]; }
        });
        if (!box) { var m = Math.min(W, H) * 0.5; box = [W / 2 - m / 2, H / 2 - m / 2, W / 2 + m / 2, H / 2 + m / 2]; }
        var cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2, half = Math.max(box[2] - box[0], box[3] - box[1]) / 2;
        var d = cv.getContext('2d').getImageData(0, 0, W, H).data;
        var sc = sampleColor(d, W, H, cx, cy, half, colorOf);
        var side = Math.min(Math.max(W, H), half * 2.3), out = document.createElement('canvas');
        out.width = out.height = 192;
        var o = out.getContext('2d'); o.fillStyle = '#000'; o.fillRect(0, 0, 192, 192);
        o.drawImage(img, (cx - side / 2) / s, (cy - side / 2) / s, side / s, side / s, 0, 0, 192, 192);
        URL.revokeObjectURL(url);
        REFS = REFS.filter(function (x) { return x.k !== k; }).concat([{ k: k, img: out.toDataURL('image/jpeg', 0.82), rgb: sc.rgb }]);
        saveRefs();
        toast('נלמד ✓');
        learn();
      }, 30);
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('לא הצלחתי לפתוח את התמונה'); learn(); };
    img.src = url;
  }

  /* ---------- סריקה ---------- */
  function run(f) {
    busy('סופר ג׳טונים…');
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      setTimeout(function () {
        var side = state.mode === 'side', s = Math.min(1, (side ? 1280 : MAXD) / Math.max(img.naturalWidth, img.naturalHeight));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.naturalWidth * s)); cv.height = Math.max(1, Math.round(img.naturalHeight * s));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var plain = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        var res;
        try { res = analyze(cv, side); } catch (e) { res = { total: 0, chips: [], comps: [], unit: 0, w: cv.width, h: cv.height, lab: new Int32Array(cv.width * cv.height) }; }
        // עותק איכותי של התמונה בשביל ה-AI (רזולוציה גבוהה = פחות ג׳טונים מתפספסים)
        var s2 = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight)), big = document.createElement('canvas');
        big.width = Math.round(img.naturalWidth * s2); big.height = Math.round(img.naturalHeight * s2);
        big.getContext('2d').drawImage(img, 0, 0, big.width, big.height);
        URL.revokeObjectURL(url);
        var token = ++state.run;
        state.img = img; state.cv = cv; state.res = res; state.plain = plain; state.side = side;
        state.phoneMarks = (res.chips || []).map(function (c) { return { x: c.x, y: c.y, color: c.color, n: 1 }; });
        state.phoneRR = Math.max(7, Math.round(Math.sqrt(res.unit || 400) * 0.24));
        state.aiMarks = null; state.ai = null; state.vals = loadVals();
        use('phone');
        aiCheck(big.toDataURL('image/jpeg', 0.86), token);
      }, 30);
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast('לא הצלחתי לפתוח את התמונה'); intro(); };
    img.src = url;
  }

  var VALS_KEY = 'wwcd_chip_values';
  function loadValsStored() { var v = {}; try { v = JSON.parse(lsGet(VALS_KEY) || '{}') || {}; } catch (e) {} return v; }
  function loadVals() { var v = loadValsStored(); COLORS.forEach(function (c) { if (!(Number(v[c.k]) > 0)) v[c.k] = c.def; }); return v; }

  /* ---------- בדיקת AI: מודל ראייה מסמן כל ג׳טון/ערימה בתמונה ---------- */
  var FN = 'https://ctrnlkfopahdtoiaakru.supabase.co/functions/v1/wwcd-chip-ai';
  var ANON = 'sb_publishable_zpiuN3ZFGPTHr5ySfL-rOw_Ngfzl7hc';
  function storedToken() {
    try { var x = JSON.parse(localStorage.getItem('sb-ctrnlkfopahdtoiaakru-auth-token') || 'null'); if (x && x.currentSession) x = x.currentSession; return x && x.access_token ? x.access_token : null; } catch (e) { return null; }
  }
  function getToken() {
    var c = window.wwcdCloud;
    if (c && typeof c.accessToken === 'function') return Promise.resolve(c.accessToken()).then(function (t) { return t || storedToken(); }, storedToken);
    return Promise.resolve(storedToken());
  }
  function aiCheck(dataUrl, token) {
    state.ai = { status: 'loading' }; paintAi();
    var vals = state.vals;
    getToken().then(function (tk) {
      if (token !== state.run) return;
      if (!tk) { state.ai = { status: 'off', message: 'בדיקת AI זמינה אחרי התחברות.' }; return paintAi(); }
      return fetch(FN, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + tk, 'apikey': ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, mime: 'image/jpeg', mode: state.mode, refs: REFS.map(function (r) { return { k: r.k, img: r.img, value: vals[r.k] }; }) })
      }).then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          if (token !== state.run) return;
          if (!(j && j.ok)) {
            state.ai = { status: (j && j.error) === 'setup' ? 'off' : 'error', message: (j && j.message) || 'בדיקת ה-AI נכשלה.' };
            return paintAi();
          }
          state.ai = { status: 'done', r: j };
          state.aiMarks = aiToMarks(j.items || []);
          learnPrinted(j.items || []);
          // ה-AI בדרך כלל מדויק יותר — עוברים אליו אוטומטית כשהוא מצא ג׳טונים
          if (j.total > 0) use('ai'); else paintAi();
        });
    }).catch(function () { if (token === state.run) { state.ai = { status: 'error', message: 'אין חיבור לאינטרנט — ממשיכים עם הספירה של הטלפון.' }; paintAi(); } });
  }
  function aiToMarks(items) {
    var W = state.cv.width, H = state.cv.height, mins = [], seen = {}, marks = [];
    items.forEach(function (it) { if (it.box && it.box.length === 4) mins.push(Math.min((it.box[3] - it.box[1]) / 1000 * W, (it.box[2] - it.box[0]) / 1000 * H)); });
    var rr = Math.max(7, Math.min(28, Math.round((median(mins) || 40) * 0.2)));
    state.aiRR = rr;
    items.forEach(function (it, i) {
      var b = it.box && it.box.length === 4 ? [it.box[1] / 1000 * W, it.box[0] / 1000 * H, it.box[3] / 1000 * W, it.box[2] / 1000 * H] : null;
      var key = b ? it.box.join(',') : 'n' + i, idx = seen[key] = (seen[key] || 0) + 1;
      var x = b ? (b[0] + b[2]) / 2 : rr * 2 + (i % 10) * rr * 2.4, y = b ? (b[1] + b[3]) / 2 : rr * 2;
      // ערימה עם כמה צבעים: נקודה לכל צבע, אחת ליד השנייה
      marks.push({ x: x + (idx - 1) * rr * 2.3, y: y, color: it.color, n: Math.max(1, it.count || 1), box: idx === 1 && b && it.count > 1 ? b : null });
    });
    return marks;
  }
  // אם כתוב מספר על הג׳טונים ועוד לא קבעתם שווי לצבע — לוקחים אותו
  function learnPrinted(items) {
    var stored = loadValsStored(), seen = {}, changed = false;
    items.forEach(function (it) { if (it.value > 0) (seen[it.color] = seen[it.color] || []).push(it.value); });
    Object.keys(seen).forEach(function (k) {
      var a = seen[k]; if (stored[k] || a.some(function (v) { return v !== a[0]; })) return;
      state.vals[k] = a[0]; changed = true;
    });
    state.printed = changed;
  }

  function use(src) {
    state.src = src; state.hist = []; state.adj = {};
    var m = src === 'ai' ? state.aiMarks : state.phoneMarks;
    state.marks = (m || []).map(function (x) { return { x: x.x, y: x.y, color: x.color, n: x.n, box: x.box }; });
    state.rr = src === 'ai' ? state.aiRR : state.phoneRR;
    result();
  }
  function counts() {
    var c = {};
    COLORS.forEach(function (x) { c[x.k] = state.adj[x.k] || 0; });
    state.marks.forEach(function (m) { if (c[m.color] != null) c[m.color] += m.n; });
    COLORS.forEach(function (x) { if (c[x.k] < 0) c[x.k] = 0; });
    return c;
  }
  function sumCounts(c) { var n = 0; Object.keys(c).forEach(function (k) { n += c[k] || 0; }); return n; }
  function marksTotal(ms) { var n = 0; (ms || []).forEach(function (m) { n += m.n; }); return n; }
  function draw() {
    var cv = state.cv;
    if (state.src === 'phone') drawResult(cv, state.img, state.res, state.marks, state.rr);
    else { cv.getContext('2d').drawImage(state.img, 0, 0, cv.width, cv.height); drawMarks(cv.getContext('2d'), state.marks, state.rr); }
  }
  function canTap() { return !(state.src === 'phone' && state.side); }
  function onTap(e) {
    if (!canTap()) { toast('בערימות — מתקנים עם + / − למטה'); return; }
    var cv = state.cv, rect = cv.getBoundingClientRect();
    var x = (e.clientX - rect.left) * cv.width / rect.width, y = (e.clientY - rect.top) * cv.height / rect.height;
    var hit = null, hd = Infinity, R = state.rr * 1.9;
    state.marks.forEach(function (m) { var d = Math.sqrt((m.x - x) * (m.x - x) + (m.y - y) * (m.y - y)); if (d < R && d < hd) { hd = d; hit = m; } });
    if (hit && hit.n > 1) { toast('בערימה — מתקנים את הכמות עם + / − למטה'); return; }
    state.hist.push(JSON.stringify(state.marks));
    if (hit) state.marks.splice(state.marks.indexOf(hit), 1);
    else state.marks.push({ x: x, y: y, color: sampleColor(state.plain, cv.width, cv.height, x, y, Math.max(6, state.rr * 2.2), colorKey).k, n: 1, added: true });
    refresh();
  }

  function paintAi() {
    var box = ov && ov.querySelector('#cs-ai'); if (!box) return;
    var a = state.ai || {}, html = '';
    if (a.status === 'loading') html = '<div class="cs-ai wait"><span class="cs-dot"></span>🤖 ה-AI מחפש כל ג׳טון בתמונה…</div>';
    else if (a.status === 'off' || a.status === 'error') html = '<div class="cs-ai mute">🤖 ' + esc(a.message || '') + '</div>';
    else if (a.status === 'done') {
      var r = a.r, phone = marksTotal(state.phoneMarks), low = r.confidence === 'low' ? ' <small>(ה-AI לא בטוח — כדאי לבדוק בתמונה)</small>' : '';
      var refsTxt = r.refs ? '<small>🎯 הושווה ל-' + r.refs + ' סוגי הג׳טונים שלכם</small>' : '';
      var note = r.note ? '<small>' + esc(r.note) + '</small>' : '';
      var printed = state.printed ? '<small>💰 השווי נקרא מהמספר שכתוב על הג׳טונים</small>' : '';
      if (!r.total) html = '<div class="cs-ai mute">🤖 ה-AI לא מצא ג׳טונים בתמונה. ' + esc(r.note || '') + '</div>';
      else if (state.src === 'ai') {
        html = '<div class="cs-ai ok"><div>🤖 <b>ה-AI מצא ' + r.total + ' ג׳טונים</b> — כל אחד מסומן בתמונה' + (phone !== r.total ? ' <small>(הטלפון לבד ספר ' + phone + ')</small>' : '') + low + '</div>' + refsTxt + printed + note +
          (state.phoneMarks.length ? '<button type="button" class="cs-use2" id="cs-use-phone">השתמש בספירת הטלפון</button>' : '') + '</div>';
      } else {
        html = '<div class="cs-ai diff"><div>⚠️ <b>ה-AI ספר ' + r.total + '</b> (הטלפון: ' + phone + ')' + low + '</div>' + refsTxt + note +
          '<button type="button" class="cs-use" id="cs-use-ai">השתמש בספירת ה-AI</button></div>';
      }
    }
    if (box.getAttribute('data-h') === html) return; // לא לצייר מחדש (ולא להפעיל שוב את האנימציה) בכל לחיצה
    box.setAttribute('data-h', html); box.innerHTML = html;
    var u = box.querySelector('#cs-use-ai'); if (u) u.onclick = function () { use('ai'); };
    var p = box.querySelector('#cs-use-phone'); if (p) p.onclick = function () { use('phone'); };
  }

  function result() {
    var vals = state.vals, c = counts();
    function row(x) {
      return '<div class="cs-crow" data-k="' + x.k + '">' +
        (refOf(x.k) ? '<img class="cs-thumb sm" src="' + refOf(x.k).img + '" alt="">' : '<span class="cs-sw" style="background:' + x.hex + '"></span>') + '<b>' + x.n + '</b>' +
        '<div class="cs-mini"><button type="button" data-d="-1" aria-label="פחות">−</button><span class="cs-c">' + c[x.k] + '</span><button type="button" data-d="1" aria-label="יותר">+</button></div>' +
        '<span class="cs-x">×</span><input type="number" inputmode="numeric" min="1" value="' + vals[x.k] + '" aria-label="שווי ' + x.n + '"></div>';
    }
    var found = COLORS.filter(function (x) { return c[x.k] > 0 || refOf(x.k); }), rest = COLORS.filter(function (x) { return !(c[x.k] > 0 || refOf(x.k)); });
    var any = state.marks.length > 0, tapNote = canTap()
      ? '<p class="cs-note">👆 <b>ג׳טון שלא סומן?</b> לחצו עליו בתמונה והוא יתווסף. לחיצה על סימון מיותר — מוחקת אותו.</p>'
      : '<p class="cs-note">מעל כל ערימה — כמה ג׳טונים יש בה. ליד הערימה — הצבע של כל ג׳טון.</p>';
    body('<h3 id="cs-title">' + esc(state.name) + '</h3><div id="cs-img"></div>' +
      '<div class="cs-tools"><button type="button" id="cs-undo" class="cs-undo" hidden>↶ ביטול לחיצה</button></div>' +
      (any || canTap() ? tapNote : '') +
      (!any && state.src === 'phone' ? '<p class="cs-note">הטלפון לא זיהה ג׳טונים. ' + (state.side ? 'צלמו את הערימות מהצד, בגובה שלהן, על רקע אחיד' : 'נסו לפזר אותם על משטח בצבע אחיד ולצלם מלמעלה') + ', או חכו לבדיקת ה-AI.</p>' : '') +
      (!REFS.length ? '<p class="cs-note">💡 טיפ: "ללמד את הג׳טונים שלכם" (במסך הקודם) משפר מאוד את זיהוי הצבעים.</p>' : '') +
      '<div id="cs-ai"></div>' +
      '<div class="cs-head"><span>צבע</span><span>כמות</span><span>שווי כל ג׳טון</span></div>' +
      '<div class="cs-rows">' + found.map(row).join('') + '</div>' +
      (rest.length ? '<details class="cs-more"' + (found.length ? '' : ' open') + '><summary>צבעים נוספים</summary>' + rest.map(row).join('') + '</details>' : '') +
      '<div class="cs-total" id="cs-t"></div>' +
      '<button class="cs-btn cs-go" type="button" id="cs-apply">עדכן ל' + esc(state.name) + '</button>' +
      '<button class="cs-btn cs-ghost" type="button" id="cs-again">צלם שוב</button>');
    var cv = state.cv;
    ov.querySelector('#cs-img').appendChild(cv);
    cv.onclick = onTap;
    ov.querySelector('#cs-undo').onclick = function () { if (!state.hist.length) return; state.marks = JSON.parse(state.hist.pop()); refresh(); };
    ov.querySelectorAll('.cs-crow').forEach(function (r) {
      var k = r.getAttribute('data-k'), inp = r.querySelector('input');
      r.querySelectorAll('[data-d]').forEach(function (b) {
        b.onclick = function () {
          var d = Number(b.getAttribute('data-d')), now = counts()[k];
          if (d < 0 && now <= 0) return;
          state.adj[k] = (state.adj[k] || 0) + d; refresh();
        };
      });
      inp.oninput = function () { vals[k] = Math.max(1, Number(inp.value) || 1); refresh(); };
    });
    refresh();
    ov.querySelector('#cs-again').onclick = function () { file.click(); };
    ov.querySelector('#cs-apply').onclick = function () {
      lsSet(VALS_KEY, JSON.stringify(vals));
      var t = refresh(); close(); if (state.cb) state.cb(t);
    };
  }
  function refresh() {
    var c = counts(), vals = state.vals, n = 0, t = 0;
    ov.querySelectorAll('.cs-crow').forEach(function (r) { var k = r.getAttribute('data-k'); r.querySelector('.cs-c').textContent = c[k]; });
    COLORS.forEach(function (x) { n += c[x.k]; t += c[x.k] * vals[x.k]; });
    var tEl = ov.querySelector('#cs-t'); if (tEl) tEl.innerHTML = n + ' ג׳טונים · סה״כ <b>' + t.toLocaleString('he-IL') + '</b>';
    var u = ov.querySelector('#cs-undo'); if (u) u.hidden = !state.hist.length;
    draw(); paintAi();
    return t;
  }

  window.wnChipScan = {
    open: function (name, cb) { build(); REFS = loadRefs(); state = { name: name, cb: cb, run: 0, mode: lsGet(MODE_KEY) === 'side' ? 'side' : 'top' }; intro(); ov.classList.add('show'); },
    learn: function () { build(); REFS = loadRefs(); state = { name: '', run: 0, mode: 'top' }; learn(); ov.classList.add('show'); },
    analyze: analyze
  };
})();
