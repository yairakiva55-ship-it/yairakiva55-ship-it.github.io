const ADMIN_EMAIL = "yairakiva55@gmail.com";
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const nisFromAgorot = (value) => "₪" + (Number(value || 0) / 100).toLocaleString("he-IL", { maximumFractionDigits: 2 });
const prettyDate = (value) => value ? new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" }).format(new Date(value)) : "—";
const statusLabel = (status) => ({ waiting: "פתוח", started: "במשחק", finished: "הסתיים" })[status] || status;

let client = null;
let currentUser = null;
let activeTab = "overview";
let listenersAttached = false;
let usersCache = [];
let roomsCache = [];
let dataCache = null;
let dataTable = "reports";
const DATA_TABLES = {
  reports: { label: "דיווחים", cols: { reported: "מדווח", reporter: "מי דיווח", room: "שולחן", reason: "סיבה", status: "מצב", created: "מתי" } },
  blocks: { label: "חסימות", cols: { blocker: "חוסם", blocked: "נחסם", created: "מתי" } },
  users: { label: "חשבונות", cols: { email: "דוא״ל", guest: "אורח", provider: "התחברות", created: "נוצר", lastSignIn: "כניסה אחרונה", banned: "מושעה", id: "מזהה" } },
  profiles: { label: "פרופילים", cols: { user: "משתמש", displayName: "שם מוצג", hasPhoto: "תמונה", updated: "עודכן" } },
  stats: { label: "סטטיסטיקה", cols: { user: "משתמש", games: "משחקים", wins: "ניצחונות", pointsNis: "נקודות (₪)" } },
  savedGames: { label: "משחקים שמורים", cols: { user: "משתמש", players: "שחקנים", playerCount: "מס׳ שחקנים", potNis: "קופה (₪)", ratio: "יחס", updated: "עודכן" } },
  rooms: { label: "שולחנות", cols: { name: "שם", code: "קוד", host: "מארח", status: "מצב", ratio: "יחס", created: "נוצר" } },
  members: { label: "משתתפים בשולחנות", cols: { room: "שולחן", user: "משתמש", displayName: "שם בשולחן", joined: "הצטרף" } },
  money: { label: "רישומי כסף", cols: { room: "שולחן", user: "משתמש", kind: "סוג", amountNis: "סכום (₪)", note: "הערה", created: "מתי" } },
  results: { label: "תוצאות", cols: { room: "שולחן", user: "משתמש", profitNis: "רווח/הפסד (₪)", applied: "נספר", finished: "הסתיים" } },
  events: { label: "אירועים", cols: { room: "שולחן", actor: "מי", kind: "פעולה", created: "מתי" } },
  terms: { label: "אישורי תנאים", cols: { user: "משתמש", version: "גרסה", accepted: "אושר", device: "מכשיר" } },
};
const DATE_COLS = new Set(["created", "lastSignIn", "updated", "joined", "finished", "accepted"]);
const fullDate = (v) => v ? new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(v)) : "—";
function cellText(key, value) {
  if (DATE_COLS.has(key)) return fullDate(value);
  if (typeof value === "boolean") return value ? "כן" : "לא";
  if (key === "status") return value === "open" ? "פתוח" : value === "handled" ? "טופל" : statusLabel(value);
  if (key === "kind") return ({ buyin: "קנייה ראשונית", rebuy: "קנייה נוספת", cashout: "פדיון", adjustment: "תיקון", game_started: "משחק התחיל", game_finished: "משחק הסתיים", player_added: "שחקן נוסף", player_removed: "שחקן הוסר", ratio_changed: "שינוי יחס" })[value] || value;
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
function renderData(search = $("adminDataSearch")?.value || "") {
  const tables = dataCache?.tables || {};
  const def = DATA_TABLES[dataTable];
  const rows = tables[dataTable] || [];
  const q = search.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))) : rows;
  const chips = Object.entries(DATA_TABLES).map(([key, t]) => `<button type="button" class="admin-data-chip" data-admin-action="data-table" data-table="${key}" aria-pressed="${key === dataTable}">${escapeHtml(t.label)} <b>${(tables[key] || []).length}</b></button>`).join("");
  const head = Object.values(def.cols).map((h) => `<th>${escapeHtml(h)}</th>`).join("") + (dataTable === "reports" ? "<th>פעולה</th>" : "");
  const banCell = (r) => dataTable === "reports" && r.reportedId ? `<td><button class="btn danger" type="button" data-admin-action="ban" data-user-id="${escapeHtml(r.reportedId)}">השעה משתמש</button></td>` : "";
  const body = filtered.slice(0, 500).map((r) => `<tr>${Object.keys(def.cols).map((k) => `<td>${escapeHtml(cellText(k, r[k]))}</td>`).join("")}${banCell(r)}</tr>`).join("");
  $("adminContent").innerHTML = `
    <div class="admin-toolbar"><div><h3>כל הנתונים</h3><div class="admin-muted">עודכן ${escapeHtml(fullDate(dataCache?.generatedAt))} · ${filtered.length} שורות${filtered.length > 500 ? " (מוצגות 500 ראשונות)" : ""}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" type="button" data-admin-action="data-csv">הורד CSV</button><button class="btn" type="button" data-admin-action="data-json">הורד הכל (JSON)</button><button class="btn" type="button" data-admin-action="refresh">רענן</button></div></div>
    <div class="admin-data-chips">${chips}</div>
    <label class="room-field" style="max-width:420px;margin:10px 0 12px">חיפוש בטבלה<input id="adminDataSearch" class="input" value="${escapeHtml(search)}" autocomplete="off"></label>
    ${body ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>` : '<div class="admin-empty">אין נתונים בטבלה הזו.</div>'}`;
}
function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function downloadCsv() {
  const def = DATA_TABLES[dataTable], rows = dataCache?.tables?.[dataTable] || [];
  const esc = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
  const lines = [Object.values(def.cols).map(esc).join(",")].concat(rows.map((r) => Object.keys(def.cols).map((k) => esc(cellText(k, r[k]))).join(",")));
  download(`wwcd-${dataTable}-${new Date().toISOString().slice(0, 10)}.csv`, "\ufeff" + lines.join("\r\n"), "text/csv;charset=utf-8");
}

export function initAdminArea(user, supabase) {
  client = supabase;
  currentUser = user || null;
  const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL;
  $("adminOpenBtn").hidden = !isAdmin;
  // Only the admin gets a sign-out button.
  $("googleSignOutBtn").hidden = !isAdmin;
  if (!isAdmin) {
    $("adminOverlay").hidden = true;
    return;
  }
  $("adminIdentity").textContent = currentUser.email;
  attachListeners();
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  $("adminOpenBtn").addEventListener("click", () => {
    if (currentUser?.email?.toLowerCase() !== ADMIN_EMAIL) return;
    $("adminOverlay").hidden = false;
    void loadTab(activeTab);
    $("adminContent").focus();
  });
  $("adminCloseBtn").addEventListener("click", closeAdmin);
  $("adminOverlay").addEventListener("click", (event) => {
    if (event.target === $("adminOverlay")) closeAdmin();
  });
  $("adminNav").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-admin-tab]")?.dataset.adminTab;
    if (tab) void loadTab(tab);
  });
  $("adminContent").addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button) return;
    if (button.dataset.adminAction === "refresh") void loadTab(activeTab);
    if (button.dataset.adminAction === "data-table") { dataTable = button.dataset.table; renderData(""); }
    if (button.dataset.adminAction === "data-csv") downloadCsv();
    if (button.dataset.adminAction === "data-json" && dataCache) download(`wwcd-all-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(dataCache, null, 2), "application/json");
    if (button.dataset.adminAction === "ban") void setUserBan(button.dataset.userId, true);
    if (button.dataset.adminAction === "goto-users") void loadTab("users");
    if (button.dataset.adminAction === "unban") void setUserBan(button.dataset.userId, false);
    if (button.dataset.adminAction === "start-room") void setRoomStatus(button.dataset.roomId, "started");
    if (button.dataset.adminAction === "finish-room") void setRoomStatus(button.dataset.roomId, "finished");
  });
  $("adminContent").addEventListener("input", (event) => {
    if (event.target.id === "adminUserSearch") renderUsers(usersCache, event.target.value);
    if (event.target.id === "adminDataSearch") { const v = event.target.value; renderData(v); const el = $("adminDataSearch"); el.focus(); el.setSelectionRange(v.length, v.length); }
  });
  $("adminContent").addEventListener("submit", (event) => {
    if (event.target.id === "adminSettingsForm") {
      event.preventDefault();
      void saveSettings(event.target);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("adminOverlay").hidden) closeAdmin();
  });
}

function closeAdmin() {
  $("adminOverlay").hidden = true;
  $("adminOpenBtn").focus();
}

function setFooter(message = "") {
  $("adminFooter").textContent = message;
}

async function callAdmin(action, payload = {}) {
  if (currentUser?.email?.toLowerCase() !== ADMIN_EMAIL) throw new Error("אין הרשאת מנהל לחשבון הזה.");
  const { data, error } = await client.functions.invoke("wwcd-admin", { body: { action, ...payload } });
  if (error) throw new Error(data?.error || error.message || "הפעולה נכשלה.");
  if (data?.error) throw new Error(data.error);
  return data;
}

async function loadTab(tab) {
  activeTab = tab;
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.adminTab === tab));
  });
  $("adminContent").innerHTML = '<div class="admin-empty">טוען נתונים מאובטחים...</div>';
  setFooter("");
  try {
    if (tab === "overview") {
      const [overview, usersResult, roomsResult] = await Promise.all([
        callAdmin("overview"),
        callAdmin("users").catch(() => null),
        callAdmin("rooms").catch(() => null),
      ]);
      if (usersResult) usersCache = usersResult.users || [];
      if (roomsResult) roomsCache = roomsResult.rooms || [];
      const weekAgo = Date.now() - 7 * 86400000;
      overview.activeUserCount = usersResult ? usersCache.filter((item) => item.lastSignInAt && Date.parse(item.lastSignInAt) >= weekAgo).length : null;
      overview.bannedUserCount = usersResult ? usersCache.filter((item) => item.bannedUntil && new Date(item.bannedUntil) > new Date()).length : null;
      overview.gameCount = roomsResult ? roomsCache.filter((item) => item.status === "started" || item.status === "finished").length : Number(overview.startedRoomCount || 0);
      renderOverview(overview);
    }
    if (tab === "users") {
      const result = await callAdmin("users");
      usersCache = result.users || [];
      renderUsers(usersCache);
    }
    if (tab === "rooms") {
      const result = await callAdmin("rooms");
      roomsCache = result.rooms || [];
      renderRooms(roomsCache);
    }
    if (tab === "settings") renderSettings(await callAdmin("settings"));
    if (tab === "data") { dataCache = await callAdmin("all-data"); renderData(""); }
  } catch (error) {
    $("adminContent").innerHTML = `<div class="admin-error">${escapeHtml(error?.message || "לא ניתן לטעון את הנתונים.")}</div>`;
    setFooter("בדוק שהתחברת עם חשבון המנהל וששירות Supabase זמין.");
  }
}

function renderOverview(data) {
  const trend = data.trend || [];
  const max = Math.max(1, ...trend.map((day) => Number(day.rooms || 0) + Number(day.events || 0)));
  const chart = trend.map((day) => {
    const total = Number(day.rooms || 0) + Number(day.events || 0);
    const height = total ? Math.max(8, Math.round(total / max * 100)) : 3;
    const label = new Intl.DateTimeFormat("he-IL", { weekday: "short" }).format(new Date(day.date + "T12:00:00"));
    return `<div class="admin-chart-day" title="${escapeHtml(label)}: ${total} פעולות"><div class="admin-chart-bar" style="height:${height}%"></div><span>${escapeHtml(label)}</span></div>`;
  }).join("");
  $("adminContent").innerHTML = `
    <div class="admin-toolbar"><div><h3>תמונת מצב</h3><div class="admin-muted">נתונים מהמשחקים והחשבונות באתר</div></div><button class="btn" type="button" data-admin-action="refresh">רענן</button></div>
    <div class="admin-kpis">
      <div class="admin-kpi"><span>משתמשים רשומים</span><strong>${Number(data.userCount || 0).toLocaleString("he-IL")}</strong></div>
      <div class="admin-kpi"><span>חדרים בסך הכול</span><strong>${Number(data.roomCount || 0).toLocaleString("he-IL")}</strong></div>
      <div class="admin-kpi"><span>חדרים פתוחים</span><strong>${Number(data.activeRoomCount || 0).toLocaleString("he-IL")}</strong></div>
      <div class="admin-kpi"><span>כסף שנרשם בחדרים</span><strong>${nisFromAgorot(data.moneyLoggedAgorot)}</strong></div>
      <div class="admin-kpi"><span>משחקים ששוחקו</span><strong>${Number(data.gameCount || 0).toLocaleString("he-IL")}</strong></div>
      <div class="admin-kpi"><span>משתמשים פעילים (7 ימים)</span><strong>${data.activeUserCount === null ? "—" : Number(data.activeUserCount).toLocaleString("he-IL")}</strong></div>
      <div class="admin-kpi"><span>משחקים פעילים עכשיו</span><strong>${Number(data.startedRoomCount || 0).toLocaleString("he-IL")}</strong></div>
      <div class="admin-kpi"><span>משתמשים חסומים</span><strong>${data.bannedUserCount === null ? "—" : Number(data.bannedUserCount).toLocaleString("he-IL")}</strong></div>
    </div>
    <section style="margin-top:20px"><div class="admin-toolbar"><div><h3>פעילות בשבעת הימים האחרונים</h3><div class="admin-muted">חדרים חדשים ואירועים במשחק</div></div></div><div class="admin-chart">${chart || '<span class="admin-muted">אין פעילות להצגה</span>'}</div></section>
    <p class="admin-note">הסטטיסטיקה מתעדכנת מתוך נתוני ההתחברות והמשחקים שנשמרים ב־Supabase.</p>`;
}

function renderUsers(users, search = $("adminUserSearch")?.value || "") {
  const filtered = users.filter((user) => `${user.email} ${user.id}`.toLowerCase().includes(search.trim().toLowerCase()));
  const rows = filtered.map((user) => {
    const banned = Boolean(user.bannedUntil && new Date(user.bannedUntil) > new Date());
    const isSelf = user.id === currentUser?.id;
    return `<tr>
      <td><span class="admin-terms ${user.termsAcceptedAt ? "ok" : "no"}" title="${user.termsAcceptedAt ? "אישר את תנאי השימוש ב־" + escapeHtml(prettyDate(user.termsAcceptedAt)) : "עוד לא אישר את תנאי השימוש"}" aria-label="${user.termsAcceptedAt ? "אישר תנאי שימוש" : "לא אישר תנאי שימוש"}">${user.termsAcceptedAt ? "✓" : "–"}</span><strong>${escapeHtml(user.email || (user.isAnonymous ? "אורח" : "ללא דוא״ל"))}</strong><div class="admin-muted">הצטרף ${escapeHtml(prettyDate(user.createdAt))}${user.termsAcceptedAt ? " · אישר תנאים " + escapeHtml(prettyDate(user.termsAcceptedAt)) : " · לא אישר תנאים"}</div></td>
      <td>${escapeHtml(prettyDate(user.lastSignInAt))}</td><td>${Number(user.roomCount || 0)}</td><td>${Number(user.wins || 0)}</td>
      <td><span class="admin-badge ${banned ? "suspended" : ""}">${banned ? "מושעה" : "פעיל"}</span></td>
      <td>${isSelf ? '<span class="admin-muted">מנהל</span>' : banned ? `<button class="btn" type="button" data-admin-action="unban" data-user-id="${escapeHtml(user.id)}">הפעל</button>` : `<button class="btn danger" type="button" data-admin-action="ban" data-user-id="${escapeHtml(user.id)}">השעיה</button>`}</td>
    </tr>`;
  }).join("");
  $("adminContent").innerHTML = `
    <div class="admin-toolbar"><div><h3>משתמשים</h3><div class="admin-muted">${filtered.length} מתוך ${users.length} חשבונות · ${users.filter((u) => u.termsAcceptedAt).length} אישרו תנאי שימוש</div></div><button class="btn" type="button" data-admin-action="refresh">רענן</button></div>
    <label class="room-field" style="max-width:420px;margin-bottom:12px">חיפוש לפי דוא״ל או מזהה משתמש<input id="adminUserSearch" class="input" value="${escapeHtml(search)}" autocomplete="off"></label>
    ${rows ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>חשבון</th><th>כניסה אחרונה</th><th>חדרים</th><th>ניצחונות</th><th>מצב</th><th>פעולה</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="admin-empty">לא נמצאו משתמשים תואמים.</div>'}`;
}

function renderRooms(rooms) {
  const cards = rooms.map((room) => {
    const isFinished = room.status === "finished";
    const action = room.status === "waiting" || room.status === "started"
        ? `<button class="btn danger" type="button" data-admin-action="finish-room" data-room-id="${escapeHtml(room.id)}">סיים משחק</button>`
        : "";
    const members = (room.members || []).map((member) => member.name).filter(Boolean);
    return `<article class="admin-room-card">
      <div class="admin-room-top"><h4 title="${escapeHtml(room.name)}">${escapeHtml(room.name)}</h4><span class="admin-badge ${isFinished ? "done" : ""}">${escapeHtml(statusLabel(room.status))}</span><b class="admin-room-code">${escapeHtml(room.code)}</b></div>
      <div class="admin-room-meta"><span>${escapeHtml(room.hostEmail || "ללא מארח")}</span><span title="${escapeHtml(members.join(" · ") || "אין משתתפים")}">${Number(room.memberCount || 0)} / ${Number(room.max_members || 0)} שחקנים</span><span>${escapeHtml(room.ratio_money)} ₪ = ${Number(room.ratio_chips || 0).toLocaleString("he-IL")} ג׳טונים</span></div>
      <div class="admin-room-actions">${action}</div>
    </article>`;
  }).join("");
  $("adminContent").innerHTML = `<div class="admin-toolbar"><div><h3>חדרים <span class="admin-muted">(${rooms.length})</span></h3></div><button class="btn" type="button" data-admin-action="refresh">רענן</button></div>${cards ? `<div class="admin-room-grid"><div class="admin-room-header"><span>חדר</span><span>מארח</span><span>שחקנים</span><span>יחס המרה</span><span>פעולה</span></div>${cards}</div>` : '<div class="admin-empty">עדיין לא נוצרו חדרים.</div>'}`;
}

function renderSettings(settings) {
  $("adminContent").innerHTML = `
    <div class="admin-toolbar"><div><h3>הגדרות משחק</h3><div class="admin-muted">ברירת המחדל לחדרים חדשים</div></div></div>
    <form id="adminSettingsForm">
      <div class="admin-settings">
        <div class="admin-setting-card"><label>סכום בשקלים<input id="adminRatioMoney" class="input" type="number" min="0.01" max="100000" step="0.01" required value="${escapeHtml(settings.default_ratio_money)}"></label></div>
        <div class="admin-setting-card"><label>מספר ג׳טונים<input id="adminRatioChips" class="input" type="number" min="1" max="1000000000" step="1" required value="${escapeHtml(settings.default_ratio_chips)}"></label></div>
      </div>
      <p class="admin-note">השינוי יחול על חדרים חדשים בלבד.</p>
      <button class="btn primary" type="submit">שמור הגדרות</button>
    </form>
    <p class="admin-note">עודכן לאחרונה: ${escapeHtml(prettyDate(settings.updated_at))}</p>`;
}

async function setUserBan(userId, banned) {
  const user = usersCache.find((item) => item.id === userId) || { id: userId, email: "" };
  const action = banned ? "להשעות" : "להפעיל מחדש";
  if (!confirm(`ל${action} את ${user.email || "המשתמש הזה"}?`)) return;
  setFooter("מעדכן הרשאת משתמש...");
  try {
    await callAdmin("set-user-ban", { userId, banned });
    setFooter(banned ? "המשתמש הושעה." : "המשתמש הופעל מחדש.");
    await loadTab("users");
  } catch (error) {
    setFooter(error?.message || "עדכון המשתמש נכשל.");
  }
}

async function setRoomStatus(roomId, status) {
  const room = roomsCache.find((item) => item.id === roomId);
  const verb = status === "started" ? "להתחיל" : "לסיים";
  if (!room || !confirm(`${verb} את המשחק בחדר ${room.code}?`)) return;
  setFooter("מעדכן את מצב החדר...");
  try {
    await callAdmin("set-room-status", { roomId, status });
    setFooter("מצב החדר עודכן.");
    await loadTab("rooms");
  } catch (error) {
    setFooter(error?.message || "עדכון החדר נכשל.");
  }
}

async function saveSettings(form) {
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  setFooter("שומר הגדרות...");
  try {
    const result = await callAdmin("update-settings", {
      defaultRatioMoney: Number($("adminRatioMoney").value),
      defaultRatioChips: Number($("adminRatioChips").value),
    });
    renderSettings(result.settings);
    setFooter("ההגדרות נשמרו וישמשו בחדרים חדשים.");
  } catch (error) {
    setFooter(error?.message || "שמירת ההגדרות נכשלה.");
    submit.disabled = false;
  }
}
