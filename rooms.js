// Winner Winner Chicken Dinner — accounts, rooms, profile and cloud save.
// v2026.10.26-claude
import { initAdminArea } from "/admin.js";

const SUPABASE_URL = "https://ctrnlkfopahdtoiaakru.supabase.co";
// Public publishable key (safe for browsers). Never put service-role or secret keys here.
const SUPABASE_KEY = "sb_publishable_zpiuN3ZFGPTHr5ySfL-rOw_Ngfzl7hc";
const AUTH_STORAGE_KEY = "sb-ctrnlkfopahdtoiaakru-auth-token";
const ALLOWED_SITES = ["https://yairakiva55-ship-it.github.io", "https://winner-poker-yair.netlify.app", "https://winner-poker-yair.brightflute34.chatgpt.site"];
// Always return to the live site the user is on (never localhost).
const SITE_AUTH_REDIRECT_URL = (ALLOWED_SITES.includes(location.origin) ? location.origin : ALLOWED_SITES[0]) + "/";
const SDK_SOURCES = [
  "https://esm.sh/@supabase/supabase-js@2.118.0",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm"
];

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const nis = value => "₪" + (Number(value || 0) / 100).toLocaleString("he-IL", { maximumFractionDigits: 2 });
const safeGet = key => { try { return localStorage.getItem(key); } catch { return null; } };
const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
const safeRemove = key => { try { localStorage.removeItem(key); } catch {} };

let client = null;
let user = null, room = null, members = [], entries = [], channel = null, shownUser = null, rooms = [];
let roomActionMode = "create", roomActionOpener = null, pendingProfileAvatar;
let signOutRequested = false, verifyTimer = null, verifyAttempts = 0;
let profileRow = null, profilesTable = true, gamesTable = true, wins = null, points = null, gamesPlayed = null;
let cloudSaveTimer = null, cloudReady = false;
// Login gate: the app opens only after the visitor taps Google or Guest on the login screen.
// A remembered account is kept so the tap re-enters it instantly instead of creating a new one.
const LOGIN_TAP_KEY = "wwcd_oauth_tap";
const LINK_KEY = "wwcd_link_google";
let loginGateOpen = false, rememberedUser = null;
const safeSessionGet = key => { try { return sessionStorage.getItem(key); } catch { return null; } };
const safeSessionSet = (key, value) => { try { sessionStorage.setItem(key, value); } catch {} };
const safeSessionRemove = key => { try { sessionStorage.removeItem(key); } catch {} };

/* ---------- small UI helpers ---------- */
function message(text = "", type = "") {
  $("roomMessage").textContent = text;
  $("roomMessage").className = "room-message" + (type ? " " + type : "");
}
function actionMessage(text = "", type = "") {
  $("roomActionMessage").textContent = text;
  $("roomActionMessage").className = "room-action-message" + (type ? " " + type : "");
}
// A small, non-blocking notice under the account bar. Never signs the user out.
function notice(text = "", type = "") {
  const el = $("appNotice");
  if (!el) return;
  el.textContent = text;
  el.className = "app-notice" + (type ? " " + type : "");
  el.hidden = !text;
}
function toast(text) { if (typeof window.showToast === "function") window.showToast(text); }

/* ---------- room action sheet ---------- */
function openRoomAction(mode, opener) {
  roomActionMode = mode;
  roomActionOpener = opener;
  const joining = mode === "join";
  $("roomActionTitle").textContent = joining ? "הצטרפות לשולחן" : "פתיחת שולחן";
  $("roomActionSubtitle").textContent = joining ? "הזן את הקוד שקיבלת ממנהל החדר." : "בחר שם שיופיע לחברים בשולחן.";
  $("roomActionSubmit").textContent = joining ? "הצטרף לשולחן" : "צור שולחן";
  $("roomActionSubmit").classList.toggle("primary", !joining);
  $("roomActionCodeField").hidden = !joining;
  $("roomActionName").value ||= displayName();
  if (!joining) $("roomJoinCode").value = "";
  actionMessage();
  $("roomActionModal").classList.add("show");
  $("roomActionModal").setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => $(joining ? "roomJoinCode" : "roomActionName").focus());
}
function closeRoomAction() {
  $("roomActionModal").classList.remove("show");
  $("roomActionModal").setAttribute("aria-hidden", "true");
  roomActionOpener?.focus?.();
}

/* ---------- profile ---------- */
function profileInitials(name) {
  return String(name || "שחקן").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "י";
}
function isGuest(account = user) { return Boolean(account?.is_anonymous || account?.app_metadata?.provider === "anonymous"); }
function displayName(account = user) {
  if (!profileRow?.display_name && !account?.user_metadata?.wwcd_display_name && isGuest(account)) return safeGet("wwcd_display_name") || "אורח";
  return profileRow?.display_name || account?.user_metadata?.wwcd_display_name || account?.user_metadata?.full_name || account?.user_metadata?.name || account?.email?.split("@")[0] || "";
}
function customAvatar(account = user) {
  if (profileRow) return profileRow.avatar_data || "";
  return account?.user_metadata?.wwcd_avatar_url || "";
}
function profileImageUrl(account = user) {
  if (profileRow && profileRow.avatar_removed) return "";
  return customAvatar(account) || account?.user_metadata?.avatar_url || account?.user_metadata?.picture || "";
}
function safeImageSrc(src) {
  return /^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(String(src || "")) ? src : "";
}
function renderProfileIdentity() {
  const name = displayName() || "השחקן שלי";
  $("roomUserLabel").textContent = name;
  const src = safeImageSrc(profileImageUrl());
  $("profileMiniAvatar").innerHTML = src ? `<img src="${escapeHtml(src)}" alt="" referrerpolicy="no-referrer">` : escapeHtml(profileInitials(name));
  $("profileAvatar").innerHTML = src ? `<img src="${escapeHtml(src)}" alt="תמונת הפרופיל שלך" referrerpolicy="no-referrer">` : escapeHtml(profileInitials(name));
  $("profileRemoveAvatarBtn").hidden = !src;
  $("profileUploadBtn").textContent = src ? "החלף תמונה" : "העלה תמונה";
  const winsEl = $("profileWins");
  if (winsEl) winsEl.textContent = wins === null ? "—" : Number(wins).toLocaleString("he-IL");
  const guest = isGuest();
  const pointsEl = $("profilePoints"), gamesEl = $("profileGames");
  if (pointsEl) {
    const value = points === null || guest ? null : Math.round(Number(points) / 100);
    pointsEl.textContent = value === null ? "—" : (value > 0 ? "+" : value < 0 ? "−" : "") + Math.abs(value).toLocaleString("he-IL");
    pointsEl.className = value < 0 ? "neg" : "";
  }
  if (gamesEl) gamesEl.textContent = gamesPlayed === null || guest ? "—" : Number(gamesPlayed).toLocaleString("he-IL");
  if ($("profileLinkBox")) $("profileLinkBox").hidden = !guest;
}
function profileMessage(text = "", type = "") {
  $("profileMessage").textContent = text;
  $("profileMessage").className = "profile-message" + (type ? " " + type : "");
}
function openProfile() {
  if (!user) return;
  pendingProfileAvatar = undefined;
  $("profileName").value = displayName();
  $("profileEmail").textContent = user.email || (isGuest() ? "חשבון אורח — שמור רק במכשיר הזה" : "חשבון Google");
  profileMessage();
  renderProfileIdentity();
  $("profileModal").classList.add("show");
  $("profileModal").setAttribute("aria-hidden", "false");
  void loadWins();
}
function closeProfile() {
  $("profileModal").classList.remove("show");
  $("profileModal").setAttribute("aria-hidden", "true");
  pendingProfileAvatar = undefined;
  renderProfileIdentity();
}
function imageAsProfileData(file) {
  return new Promise((resolve, reject) => {
    if (!file || !["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || "")) return reject(new Error("בחר תמונת JPG, PNG או WebP."));
    if (file.size > 15 * 1024 * 1024) return reject(new Error("התמונה גדולה מדי. בחר תמונה עד 15MB."));
    const objectUrl = URL.createObjectURL(file), image = new Image();
    image.onload = () => {
      try {
        // Square, centred crop at 256px keeps the saved image small (≈15–30KB).
        const size = 256, side = Math.min(image.naturalWidth, image.naturalHeight);
        const sx = (image.naturalWidth - side) / 2, sy = (image.naturalHeight - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("לא ניתן לקרוא את התמונה.");
        context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", .8));
      } catch (error) { reject(error); }
      finally { URL.revokeObjectURL(objectUrl); }
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("לא הצלחתי לפתוח את התמונה. נסה תמונת JPG או PNG.")); };
    image.src = objectUrl;
  });
}
function missingTable(error) {
  const text = String(error?.code || "") + " " + String(error?.message || "");
  return /42P01|PGRST205|PGRST202|does not exist|Could not find the table|schema cache/i.test(text);
}
async function loadProfileRow() {
  if (!user || !profilesTable) return;
  const { data, error } = await client.from("wwcd_profiles").select("user_id,display_name,avatar_data,avatar_removed,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) { if (missingTable(error)) profilesTable = false; return; }
  profileRow = data || null;
  renderProfileIdentity();
}
async function loadWins() {
  if (!user) return;
  let { data, error } = await client.from("wwcd_user_stats").select("wins,points_agorot,games").eq("user_id", user.id).maybeSingle();
  if (error) ({ data, error } = await client.from("wwcd_user_stats").select("wins").eq("user_id", user.id).maybeSingle());
  if (!error) {
    wins = Number(data?.wins || 0);
    points = Number(data?.points_agorot || 0);
    gamesPlayed = Number(data?.games || 0);
    renderProfileIdentity();
  }
}
async function saveProfile() {
  if (!user) return;
  const name = $("profileName").value.trim();
  if (!name) return profileMessage("כתוב את השם שיופיע לשחקנים.", "error");
  if (name.length > 40) return profileMessage("השם יכול להכיל עד 40 תווים.", "error");
  $("profileSaveBtn").disabled = true;
  profileMessage("שומר את הפרופיל...");
  try {
    if (profilesTable) {
      const row = { user_id: user.id, display_name: name, updated_at: new Date().toISOString() };
      if (pendingProfileAvatar !== undefined) { row.avatar_data = pendingProfileAvatar; row.avatar_removed = pendingProfileAvatar === null; }
      const { data, error } = await client.from("wwcd_profiles").upsert(row, { onConflict: "user_id" }).select("user_id,display_name,avatar_data,avatar_removed,updated_at").single();
      if (error && missingTable(error)) profilesTable = false;
      else if (error) throw error;
      else {
        profileRow = data;
        // Keep the login token small: the photo lives in the table, not in the session.
        if (user.user_metadata?.wwcd_avatar_url || user.user_metadata?.wwcd_display_name !== name) {
          const r = await client.auth.updateUser({ data: { wwcd_avatar_url: null, wwcd_display_name: name } });
          if (!r.error && r.data?.user) user = r.data.user;
        }
      }
    }
    if (!profilesTable) {
      const updates = { wwcd_display_name: name };
      if (pendingProfileAvatar !== undefined) updates.wwcd_avatar_url = pendingProfileAvatar;
      const { data, error } = await client.auth.updateUser({ data: updates });
      if (error) throw error;
      user = data.user || { ...user, user_metadata: { ...user.user_metadata, ...updates } };
    }
    safeSet("wwcd_display_name", name);
    $("roomActionName").value = name;
    pendingProfileAvatar = undefined;
    renderProfileIdentity();
    profileMessage("הפרופיל נשמר.", "success");
    setTimeout(() => { if ($("profileModal").classList.contains("show")) closeProfile(); }, 600);
  } catch (error) {
    profileMessage("שמירת הפרופיל נכשלה: " + (error?.message || "בדוק את החיבור ונסה שוב."), "error");
  } finally { $("profileSaveBtn").disabled = false; }
}

/* ---------- rooms panel ---------- */
function setRoomView() { document.body.classList.remove("room-view-active"); }
function openRoomsPanel() {
  $("roomPanelOverlay").classList.add("show");
  $("roomPanelOverlay").setAttribute("aria-hidden", "false");
  document.body.classList.add("room-panel-open");
  if (user && !rooms.length) void loadRooms();
  requestAnimationFrame(() => $("closeRoomsPanelBtn").focus());
}
function closeRoomsPanel() {
  if ($("roomActionModal").classList.contains("show")) closeRoomAction();
  $("roomPanelOverlay").classList.remove("show");
  $("roomPanelOverlay").setAttribute("aria-hidden", "true");
  document.body.classList.remove("room-panel-open");
}
function updateRoomsBadge() {
  if ($("tableCard")) renderTable();
  const badge = $("roomsBtnBadge");
  if (!badge) return;
  badge.textContent = room && room.status !== "finished" ? room.code : "";
  badge.hidden = !badge.textContent;
}
function profileInitialsSafe(name) { return String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("") || "?"; }
function renderTable() {
  const active = Boolean(user && room && room.status !== "finished");
  $("tableEmpty").hidden = active;
  $("tableActive").hidden = !active;
  $("tableHistoryBtn").hidden = active || !rooms.length;
  const seats = $("seatsPanel");
  if (!active) { seats.hidden = true; closeSeats(); return; }
  const host = room.host_id === user.id;
  const count = members.length;
  $("tableName").textContent = room.name;
  $("tableSub").textContent = `${count ? count + " בשולחן" : "ממתין לחברים"} · ${host ? "אתה המנהל" : "אתה משתתף"}`;
  $("tableCode").textContent = room.code;
  seats.hidden = !count;
  $("seatsCount").textContent = count;
  $("seatsSub").textContent = room.name;
  $("seatsList").innerHTML = members.map(member => {
    const me = member.user_id === user.id, isHost = member.user_id === room.host_id;
    const tags = `${isHost ? '<span class="seat-tag">מנהל</span>' : ""}${me ? '<span class="seat-tag me">אתה</span>' : ""}`;
    return `<li class="seat${me ? " me" : ""}"><span class="seat-avatar" aria-hidden="true">${escapeHtml(profileInitialsSafe(member.display_name))}</span><span class="seat-name">${escapeHtml(member.display_name)}</span>${tags}</li>`;
  }).join("");
}
function openSeats() { $("seatsPanel").classList.add("open"); $("seatsToggle").setAttribute("aria-expanded", "true"); }
function closeSeats() { $("seatsPanel").classList.remove("open"); $("seatsToggle").setAttribute("aria-expanded", "false"); }
function hostsOpenRoom() {
  return Boolean(user && rooms.some(item => item.host_id === user.id && item.status !== "finished"));
}
function updateCreateRoomButton() {
  const hide = hostsOpenRoom();
  $("openCreateRoomBtn").hidden = hide;
  $("openCreateRoomBtn").parentElement.classList.toggle("single", hide);
}
function renderRoomList() {
  updateCreateRoomButton();
  renderTable();
  // The list is only useful for switching between tables; with a single table it just repeats the name.
  const lobby = $("roomLobby");
  if (lobby) lobby.hidden = rooms.length <= 1 && Boolean(room);
  $("roomList").innerHTML = rooms.length
    ? rooms.map(item => `<button type="button" data-room-id="${escapeHtml(item.id)}" class="${room?.id === item.id ? "is-active" : ""}">${escapeHtml(item.name)} · ${item.status === "finished" ? "הסתיים" : item.status === "started" ? "במשחק" : "פתוח"}</button>`).join("")
    : "<span class=\"room-note\">עדיין אין לך חדרים. פתח שולחן או הצטרף עם קוד.</span>";
}

/* ---------- auth ---------- */
function showSignedOut(text = "") {
  closeRoomsPanel();
  $("profileModal").classList.remove("show");
  document.body.classList.remove("room-authenticated");
  setRoomView();
  $("roomHubTitle").textContent = "המשחקים שלך, במקום אחד";
  $("roomHubSubtitle").textContent = "התחבר עם Google או כאורח כדי להיכנס לשולחן.";
  $("roomAuthPanel").hidden = false;
  $("roomDashboard").hidden = true;
  $("activeRoom").hidden = true;
  $("roomConnectionStatus").textContent = "מוכן להתחברות";
  $("googleSignInBtn").disabled = !client;
  $("guestSignInBtn").disabled = !client;
  if (text) $("authMessage").textContent = text;
  initAdminArea(null, client);
}
function storedSession() {
  try {
    const raw = safeGet(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.user && parsed?.refresh_token ? parsed : null;
  } catch { return null; }
}
function holdAtLoginGate(account) {
  rememberedUser = account;
  user = null;
  showSignedOut();
  $("roomHubSubtitle").textContent = isGuest(account)
    ? "חשבון האורח שלך שמור במכשיר. לחץ \"כניסה כאורח\" כדי לחזור אליו."
    : "החשבון שלך שמור במכשיר. לחץ \"המשך עם Google\" כדי להיכנס.";
}
async function enterUser(nextUser, { provisional = false } = {}) {
  if (!nextUser) return;
  if (!loginGateOpen) { holdAtLoginGate(nextUser); return; }
  rememberedUser = null;
  user = nextUser;
  if (client) initAdminArea(user, client);
  document.body.classList.add("room-authenticated");
  setRoomView();
  $("roomAuthPanel").hidden = true;
  $("roomDashboard").hidden = false;
  $("authMessage").textContent = "";
  $("roomConnectionStatus").textContent = provisional ? "מתחבר מחדש..." : isGuest() ? "מחובר כאורח" : "מחובר עם Google";
  renderProfileIdentity();
  if (provisional || !client) return;
  if (shownUser === user.id) return;
  shownUser = user.id;
  notice();
  if (!$("roomActionModal").classList.contains("show")) $("roomActionName").value = safeGet("wwcd_display_name") || displayName();
  await Promise.allSettled([loadProfileRow(), loadWins(), loadCloudGame()]);
  await loadRooms({ restoreActive: true });
}
function isFatalAuthError(error) {
  // Only an explicit "this refresh token is no longer valid" is final. Network blips are not.
  const status = Number(error?.status || 0);
  const text = (String(error?.code || "") + " " + String(error?.message || "")).toLowerCase();
  if (error?.name === "AuthRetryableFetchError" || status === 0 || status >= 500) return false;
  return /refresh_token_not_found|refresh token not found|invalid refresh token|refresh_token_already_used|session_not_found|user_banned|user_not_found/.test(text) || status === 400 || status === 401 || status === 403;
}
async function verifySession() {
  clearTimeout(verifyTimer);
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (data.session?.user) {
      verifyAttempts = 0;
      await enterUser(data.session.user);
      return;
    }
    // No session from the SDK. If we still hold a stored one, give the SDK one more moment.
    if (storedSession() && verifyAttempts < 2) {
      verifyAttempts++;
      verifyTimer = setTimeout(verifySession, 1500);
      return;
    }
    user = null; shownUser = null; rememberedUser = null;
    showSignedOut();
  } catch (error) {
    if (isFatalAuthError(error)) {
      user = null; shownUser = null; rememberedUser = null;
      safeRemove(AUTH_STORAGE_KEY);
      showSignedOut("ההתחברות פגה. התחבר שוב עם Google.");
      return;
    }
    // Temporary problem: keep the user in, retry quietly with backoff.
    verifyAttempts++;
    if (user) {
      $("roomConnectionStatus").textContent = "מחובר (ללא רשת)";
      notice("אין חיבור לשרת כרגע. אפשר להמשיך לשחק — הנתונים נשמרים במכשיר.", "warn");
    } else {
      showSignedOut("שירות ההתחברות לא זמין כרגע. נסה שוב בעוד רגע.");
    }
    verifyTimer = setTimeout(verifySession, Math.min(30000, 1500 * 2 ** Math.min(verifyAttempts - 1, 4)));
  }
}
async function signIn() {
  if (!client) return;
  loginGateOpen = true;
  if (rememberedUser && !isGuest(rememberedUser)) { await enterUser(rememberedUser); return; }
  safeSessionSet(LOGIN_TAP_KEY, "1");
  $("authMessage").textContent = "פותח התחברות Google...";
  $("googleSignInBtn").disabled = true;
  const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: SITE_AUTH_REDIRECT_URL, queryParams: { prompt: "select_account" } } });
  if (error) {
    loginGateOpen = false; safeSessionRemove(LOGIN_TAP_KEY);
    $("googleSignInBtn").disabled = false;
    $("authMessage").textContent = "ההתחברות עם Google לא נפתחה: " + error.message;
  }
}
function friendlyLinkError(text) {
  const t = String(text || "");
  if (/manual linking/i.test(t)) return "החיבור ל-Google עוד לא הופעל בשרת. נסה שוב מאוחר יותר.";
  if (/already|exists|linked to another/i.test(t)) return "חשבון ה-Google הזה כבר רשום אצלנו כמשתמש אחר, ולכן אי אפשר לחבר אליו את חשבון האורח.";
  return "החיבור ל-Google לא הושלם. נסה שוב.";
}
async function linkGoogle() {
  if (!client || !user || !isGuest()) return;
  profileMessage("פותח את Google...");
  $("profileLinkGoogleBtn").disabled = true;
  safeSessionSet(LINK_KEY, "1");
  const { error } = await client.auth.linkIdentity({ provider: "google", options: { redirectTo: SITE_AUTH_REDIRECT_URL, queryParams: { prompt: "select_account" } } });
  if (error) {
    safeSessionRemove(LINK_KEY);
    $("profileLinkGoogleBtn").disabled = false;
    profileMessage(friendlyLinkError(error.message), "error");
  }
}
async function finishGoogleLink() {
  // The guest is now a Google user with the same id: their guest games start counting.
  try {
    const { data } = await client.rpc("wwcd_claim_guest_results");
    const games = Number(data?.games || 0);
    toast(games ? `החשבון חובר ל-Google — ${games} משחקים נוספו לנקודות שלך` : "החשבון חובר ל-Google");
  } catch { toast("החשבון חובר ל-Google"); }
  await loadWins();
  renderProfileIdentity();
}
async function signInGuest() {
  if (!client) return;
  loginGateOpen = true;
  if (rememberedUser && isGuest(rememberedUser)) { await enterUser(rememberedUser); toast("נכנסת כאורח"); return; }
  $("authMessage").textContent = "נכנס כאורח...";
  $("guestSignInBtn").disabled = true; $("googleSignInBtn").disabled = true;
  const { data, error } = await client.auth.signInAnonymously();
  $("guestSignInBtn").disabled = false; $("googleSignInBtn").disabled = false;
  if (error || !data?.user) {
    loginGateOpen = false;
    $("authMessage").textContent = /anonymous.*disabled|not enabled/i.test(error?.message || "") ? "כניסת אורח עוד לא הופעלה בשרת. נסה שוב בעוד רגע או היכנס עם Google." : "הכניסה כאורח נכשלה: " + (error?.message || "נסה שוב.");
    return;
  }
  await enterUser(data.user);
  toast("נכנסת כאורח — החיבור נשמר במכשיר הזה");
}
async function signOut() {
  const warning = isGuest() ? "אתה מחובר כאורח. אחרי התנתקות לא תוכל לחזור לאותו חשבון אורח, והחדרים שלו לא יופיעו לך יותר. להתנתק?" : "להתנתק מהחשבון במכשיר הזה?";
  if (!confirm(warning)) return;
  signOutRequested = true;
  await flushCloudSave();
  if (channel) { try { await client.removeChannel(channel); } catch {} channel = null; }
  try { await client.auth.signOut({ scope: "local" }); } catch {}
  safeRemove(AUTH_STORAGE_KEY);
  loginGateOpen = false; rememberedUser = null;
  user = null; shownUser = null; room = null; rooms = []; members = []; entries = []; profileRow = null; wins = null; points = null; gamesPlayed = null; cloudReady = false;
  updateRoomsBadge();
  showSignedOut("התנתקת. אפשר להתחבר שוב בכל רגע.");
  signOutRequested = false;
}
function readOAuthError() {
  const query = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const description = query.get("error_description") || hash.get("error_description");
  if (!description && !query.get("error") && !hash.get("error")) return "";
  history.replaceState(null, "", location.pathname);
  return /provider.*not.*enabled|unsupported provider/i.test(description || "") ? "ההתחברות עם Google לא מופעלת בפרויקט Supabase." : "ההתחברות עם Google לא הושלמה" + (description ? ": " + description : ".");
}

/* ---------- rooms data ---------- */
async function loadRooms({ restoreActive = false } = {}) {
  if (!user || !client) return;
  message("טוען חדרים...");
  const { data, error } = await client.from("wwcd_room_members")
    .select("room_id,display_name,joined_at,room:wwcd_rooms!wwcd_room_members_room_id_fkey(id,code,name,status,max_members,host_id,ratio_money,ratio_chips,created_at)")
    .eq("user_id", user.id).order("joined_at", { ascending: false });
  if (error) {
    // Rooms failing to load must never sign the user out.
    message("טעינת החדרים נכשלה. נסה שוב בעוד רגע.", "error");
    notice("החדרים לא נטענו כרגע — המשחק הראשי ממשיך לעבוד.", "warn");
    return;
  }
  rooms = (data || []).map(item => item.room).filter(Boolean);
  renderRoomList();
  message();
  if (restoreActive) {
    const saved = rooms.find(item => item.id === safeGet("wwcd_active_room") && item.status !== "finished");
    if (saved) await openRoom(saved.id, { reveal: false });
    else { room = null; $("activeRoom").hidden = true; updateRoomsBadge(); }
  } else if (room && !rooms.some(item => item.id === room.id)) {
    room = null; $("activeRoom").hidden = true; updateRoomsBadge();
  }
}
async function openRoom(id, { reveal = true } = {}) {
  if (!user) return;
  message("פותח חדר...");
  const { data, error } = await client.from("wwcd_rooms").select("*").eq("id", id).maybeSingle();
  if (error || !data) return message("פתיחת החדר נכשלה. נסה שוב.", "error");
  if (room?.id !== data.id) members = [];
  room = data;
  rooms = rooms.map(item => item.id === data.id ? { ...item, ...data } : item);
  safeSet("wwcd_active_room", room.id);
  $("activeRoom").hidden = false;
  $("activeRoomName").textContent = room.name;
  $("activeRoomCode").textContent = room.code;
  const host = room.host_id === user.id;
  const finished = room.status === "finished";
  $("activeRoomMeta").textContent = `${finished ? "המשחק הסתיים" : room.status === "started" ? "המשחק התחיל" : "המשחק פתוח"} · ${host ? "אתה מנהל החדר" : "מנהל: " + (room.host_id ? "מארח החדר" : "—")} · יחס ${Number(room.ratio_money)} ₪ = ${Number(room.ratio_chips).toLocaleString("he-IL")} ג׳טונים`;
  $("hostRatioControls").hidden = !host || finished;
  $("roomRatioMoney").value = room.ratio_money;
  $("roomRatioChips").value = room.ratio_chips;
  $("finishRoomBtn").hidden = !host || finished;
  $("addMoneyEntryBtn").disabled = finished;
  renderRoomList();
  updateRoomsBadge();
  await refreshRoom();
  if (channel) { try { await client.removeChannel(channel); } catch {} }
  const roomId = room.id;
  channel = client.channel("wwcd-room-" + roomId)
    .on("postgres_changes", { event: "*", schema: "public", table: "wwcd_room_members", filter: "room_id=eq." + roomId }, () => void refreshRoom())
    .on("postgres_changes", { event: "*", schema: "public", table: "wwcd_room_money_entries", filter: "room_id=eq." + roomId }, () => void refreshRoom())
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wwcd_rooms", filter: "id=eq." + roomId }, () => { if (room?.id === roomId) void openRoom(roomId, { reveal: false }); })
    .subscribe();
  if (reveal && !$("roomPanelOverlay").classList.contains("show")) openRoomsPanel();
  message();
}
async function refreshRoom() {
  if (!room || !user) return;
  const roomId = room.id;
  const [m, e] = await Promise.all([
    client.from("wwcd_room_members").select("room_id,user_id,display_name,joined_at").eq("room_id", roomId).order("joined_at"),
    client.from("wwcd_room_money_entries").select("id,room_id,user_id,kind,amount_agorot,note,created_at").eq("room_id", roomId).order("created_at", { ascending: false })
  ]);
  if (m.error || e.error) return message("עדכון נתוני החדר נכשל. נסה שוב בעוד רגע.", "error");
  if (room?.id !== roomId) return;
  members = m.data || []; entries = e.data || [];
  renderRoom();
}
function totals() {
  return members.map(member => {
    let invested = 0, cashed = 0;
    entries.filter(item => item.user_id === member.user_id).forEach(item => {
      const amount = Number(item.amount_agorot || 0);
      if (item.kind === "buyin" || item.kind === "rebuy") invested += amount;
      else if (item.kind === "cashout") cashed += amount;
      else if (item.kind === "adjustment") amount >= 0 ? invested += amount : cashed += Math.abs(amount);
    });
    return { ...member, invested, cashed, net: invested - cashed };
  });
}
function label(kind) { return ({ buyin:"קנייה ראשונית", rebuy:"קנייה נוספת", cashout:"פדיון", adjustment:"תיקון" })[kind] || kind; }
function renderRoom() {
  const players = totals();
  $("roomRoster").innerHTML = players.length ? players.map(item => `<div class="room-player">
    <div><strong>${escapeHtml(item.display_name)}${item.user_id === room.host_id ? " ★" : ""}</strong><small>${item.user_id === user.id ? "אתה" : item.user_id === room.host_id ? "מנהל החדר" : "שחקן בחדר"}</small></div>
    <div><small>קניות ותיקונים</small><strong>${nis(item.invested)}</strong></div>
    <div><small>פדיון ותיקונים</small><strong>${nis(item.cashed)}</strong></div>
    <div><small>${item.net > 0 ? "צריך להעביר" : item.net < 0 ? "מקבל" : "מאוזן"}</small><strong>${nis(Math.abs(item.net))}</strong></div>
  </div>`).join("") : "<div class=\"room-note\">אין עדיין שחקנים בחדר.</div>";
  $("roomMembersCount").textContent = `${players.length} / ${Number(room.max_members || 100)} משתתפים`;
  $("roomLedger").innerHTML = entries.length ? entries.map(item => {
    const owner = members.find(member => member.user_id === item.user_id);
    const sign = item.kind === "adjustment" && Number(item.amount_agorot) < 0 ? "−" : "+";
    const own = item.user_id === user.id && room.status !== "finished";
    return `<div class="room-entry"><span>${escapeHtml(owner?.display_name || "שחקן")} · ${label(item.kind)} · ${sign}${nis(Math.abs(Number(item.amount_agorot)))}</span>${own ? `<button class="btn danger" type="button" data-delete-money="${escapeHtml(item.id)}">מחק</button>` : ""}</div>`;
  }).join("") : "<div class=\"room-note\">עוד לא נרשמו קניות או פדיונות.</div>";
  $("addMoneyEntryBtn").disabled = room.status === "finished";
  renderTable();
}
function friendlyRpcError(error) {
  const text = String(error?.message || "");
  if (/Invalid room code/i.test(text)) return "הקוד לא נמצא. בדוק אותו מול מנהל החדר.";
  if (/already started/i.test(text)) return "המשחק בחדר כבר התחיל, ולכן אי אפשר להצטרף.";
  if (/Room is full/i.test(text)) return "החדר מלא.";
  if (/sign-in is required/i.test(text)) return "צריך להיות מחובר כדי להשתמש בחדרים.";
  if (/Only the room host/i.test(text)) return "רק מנהל החדר יכול לבצע את הפעולה.";
  if (/1 to 40/i.test(text)) return "השם צריך להכיל 1–40 תווים.";
  return text || "הפעולה נכשלה. נסה שוב.";
}
async function createRoom() {
  if (hostsOpenRoom()) { closeRoomAction(); return message("כבר יש לך שולחן פתוח. סיים אותו כדי לפתוח שולחן חדש.", "error"); }
  const name = $("roomActionName").value.trim();
  if (!name) return actionMessage("הזן את השם שיוצג בחדר.", "error");
  safeSet("wwcd_display_name", name);
  actionMessage("יוצר שולחן...");
  const { data, error } = await client.rpc("wwcd_create_room", { p_name: name });
  if (error) return actionMessage("יצירת השולחן נכשלה: " + friendlyRpcError(error), "error");
  closeRoomAction();
  await loadRooms();
  if (data?.id) await openRoom(data.id, { reveal: false });
  toast("השולחן נפתח! לחץ \"שתף שולחן\" כדי לשלוח לחברים את הקוד");
}
async function joinRoom() {
  const name = $("roomActionName").value.trim(), code = $("roomJoinCode").value.trim().toUpperCase();
  if (!name) return actionMessage("הזן את השם שיוצג בחדר.", "error");
  if (!/^[A-Z2-9]{8}$/.test(code)) return actionMessage("הקוד צריך להכיל 8 אותיות או מספרים.", "error");
  safeSet("wwcd_display_name", name);
  actionMessage("מצטרף לשולחן...");
  const { data, error } = await client.rpc("wwcd_join_room", { p_code: code, p_name: name });
  if (error) return actionMessage("ההצטרפות נכשלה: " + friendlyRpcError(error), "error");
  $("roomJoinCode").value = "";
  closeRoomAction();
  await loadRooms();
  if (data?.id) await openRoom(data.id, { reveal: false });
  toast("הצטרפת לשולחן");
}
async function addMoney() {
  if (!room || room.status === "finished") return message("המשחק הסתיים ואי אפשר לשנות רישומים.", "error");
  const kind = $("moneyKind").value;
  const amount = Number(String($("moneyAmount").value).replace(",", "."));
  if (!Number.isFinite(amount) || amount === 0 || (kind !== "adjustment" && amount < 0)) return message("הזן סכום תקין בשקלים.", "error");
  const { error } = await client.from("wwcd_room_money_entries").insert({ room_id: room.id, user_id: user.id, kind, amount_agorot: Math.round(amount * 100) });
  if (error) return message("שמירת הרישום נכשלה: " + friendlyRpcError(error), "error");
  $("moneyAmount").value = "";
  await refreshRoom();
  message("הרישום נשמר.", "success");
}
async function deleteMoney(id) {
  if (!confirm("למחוק את הרישום שלך?")) return;
  const { error } = await client.from("wwcd_room_money_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) return message("מחיקת הרישום נכשלה: " + friendlyRpcError(error), "error");
  await refreshRoom(); message("הרישום נמחק.", "success");
}
async function updateRatio() {
  const money = Number($("roomRatioMoney").value), chipsCount = Number($("roomRatioChips").value);
  if (!(money > 0) || !(chipsCount > 0)) return message("הזן יחס חיובי.", "error");
  const { error } = await client.rpc("wwcd_update_room_ratio", { p_room_id: room.id, p_ratio_money: money, p_ratio_chips: Math.round(chipsCount) });
  if (error) return message("עדכון היחס נכשל: " + friendlyRpcError(error), "error");
  await openRoom(room.id, { reveal: false }); message("יחס החדר עודכן.", "success");
}
async function roomAction(action) {
  const { error } = await client.rpc(action, { p_room_id: room.id });
  if (error) return message("עדכון מצב המשחק נכשל: " + friendlyRpcError(error), "error");
  await openRoom(room.id, { reveal: false });
  if (action === "wwcd_finish_room") void loadWins();
  message(action === "wwcd_start_room" ? "המשחק התחיל. מעכשיו אי אפשר להצטרף לחדר." : "המשחק הסתיים והרישומים ננעלו.", "success");
}
async function leaveRoom() {
  if (!room) return;
  const host = room.host_id === user.id;
  const prompt = host ? "אתה מנהל החדר: יציאה תמחק את החדר ואת רישומי הכסף של כל המשתתפים. להמשיך?" : "לצאת מהחדר? רישומי הכסף שלך יישארו בחדר.";
  if (!confirm(prompt)) return;
  const { error } = await client.rpc("wwcd_leave_room", { p_room_id: room.id });
  if (error) return message("היציאה מהחדר נכשלה: " + friendlyRpcError(error), "error");
  if (channel) { try { await client.removeChannel(channel); } catch {} channel = null; }
  room = null; safeRemove("wwcd_active_room"); $("activeRoom").hidden = true; updateRoomsBadge();
  await loadRooms(); message(host ? "החדר נמחק." : "יצאת מהחדר.", "success");
}
function settleRoom() {
  const balances = totals().map(item => ({ name:item.display_name, amount:item.net }));
  const sum = balances.reduce((a, item) => a + item.amount, 0), target = $("roomTransfers");
  if (Math.abs(sum) > 1) { target.innerHTML = `<div class="room-note">הסכומים לא מאוזנים (הפרש ${nis(Math.abs(sum))}). בדקו שסך הפדיונות תואם לסך הקניות.</div>`; return; }
  const debtors = balances.filter(item => item.amount > 0).map(item => ({ ...item })).sort((a, b) => b.amount - a.amount);
  const creditors = balances.filter(item => item.amount < 0).map(item => ({ ...item, amount:-item.amount })).sort((a, b) => b.amount - a.amount);
  const result = []; let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const value = Math.min(debtors[i].amount, creditors[j].amount);
    result.push(`<div class="transfer"><div class="transfer-top"><span>${escapeHtml(debtors[i].name)} ← ${escapeHtml(creditors[j].name)}</span><span class="transfer-amount">${nis(value)}</span></div></div>`);
    debtors[i].amount -= value; creditors[j].amount -= value;
    if (debtors[i].amount < 1) i++;
    if (creditors[j].amount < 1) j++;
  }
  target.innerHTML = result.length ? result.join("") : "<div class=\"room-note\">החדר מאוזן — אין העברות.</div>";
}

/* ---------- cloud save of the main game ---------- */
async function loadCloudGame() {
  cloudReady = false;
  if (!user || !gamesTable || !window.wwcdGame) return;
  const { data, error } = await client.from("wwcd_user_games").select("state,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) { if (missingTable(error)) gamesTable = false; return; }
  cloudReady = true;
  const local = window.wwcdGame.get();
  const localTime = Number(local?.savedAt || 0), cloudTime = data?.updated_at ? Date.parse(data.updated_at) : 0;
  if (data?.state && Array.isArray(data.state.players) && cloudTime > localTime + 1000) {
    window.wwcdGame.replace(data.state);
    toast("המשחק האחרון נטען מהחשבון שלך");
  } else if (local && (local.players?.length || localTime) && localTime > cloudTime) {
    queueCloudSave(0);
  }
}
async function pushCloudGame() {
  cloudSaveTimer = null;
  if (!user || !gamesTable || !cloudReady || !window.wwcdGame) return false;
  const state = window.wwcdGame.get();
  const { error } = await client.from("wwcd_user_games").upsert({ user_id: user.id, state, updated_at: new Date(Number(state.savedAt) || Date.now()).toISOString() }, { onConflict: "user_id" });
  if (error) { if (missingTable(error)) gamesTable = false; return false; }
  return true;
}
function queueCloudSave(delay = 1500) {
  if (!user || !gamesTable || !cloudReady) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => void pushCloudGame(), delay);
}
async function flushCloudSave() {
  if (!cloudSaveTimer) return;
  clearTimeout(cloudSaveTimer);
  await pushCloudGame();
}
window.wwcdCloud = {
  queueSave: () => queueCloudSave(),
  saveNow: async () => { clearTimeout(cloudSaveTimer); return user && cloudReady && gamesTable ? pushCloudGame() : false; },
  isSignedIn: () => Boolean(user)
};

/* ---------- wire up ---------- */
$("googleSignInBtn").addEventListener("click", () => void signIn());
$("guestSignInBtn").addEventListener("click", () => void signInGuest());
// Coming back to the site (tab switch, phone unlock, reopening the app): refresh the session quietly.
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && client && user) void verifySession(); });
window.addEventListener("pageshow", event => { if (event.persisted && client && user) void verifySession(); });
$("googleSignOutBtn").addEventListener("click", () => void signOut());
$("profileOpenBtn").addEventListener("click", openProfile);
$("profileCloseBtn").addEventListener("click", closeProfile);
$("profileCancelBtn").addEventListener("click", closeProfile);
$("profileModal").addEventListener("click", event => { if (event.target === $("profileModal")) closeProfile(); });
$("profileUploadBtn").addEventListener("click", () => $("profileFileInput").click());
$("profileFileInput").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  profileMessage("מכין את התמונה...");
  try {
    pendingProfileAvatar = await imageAsProfileData(file);
    $("profileAvatar").innerHTML = `<img src="${escapeHtml(pendingProfileAvatar)}" alt="תצוגה מקדימה של תמונת הפרופיל">`;
    $("profileRemoveAvatarBtn").hidden = false;
    profileMessage("התמונה מוכנה. לחץ \"שמור פרופיל\".", "success");
  } catch (error) { profileMessage(error.message, "error"); }
  finally { event.target.value = ""; }
});
$("profileRemoveAvatarBtn").addEventListener("click", () => {
  pendingProfileAvatar = null;
  $("profileAvatar").textContent = profileInitials($("profileName").value || displayName());
  $("profileRemoveAvatarBtn").hidden = true;
  profileMessage("התמונה תוסר לאחר שמירת הפרופיל.");
});
$("profileSaveBtn").addEventListener("click", () => void saveProfile());
$("profileLinkGoogleBtn").addEventListener("click", () => void linkGoogle());
$("profileSignOutBtn").addEventListener("click", () => void signOut());
$("profileName").addEventListener("keydown", event => { if (event.key === "Enter") void saveProfile(); });
$("roomViewBackBtn").addEventListener("click", () => { setRoomView(); closeRoomsPanel(); });
$("roomViewBackInlineBtn").addEventListener("click", () => { setRoomView(); closeRoomsPanel(); });
$("openCreateRoomBtn").addEventListener("click", event => openRoomAction("create", event.currentTarget));
$("openJoinRoomBtn").addEventListener("click", event => openRoomAction("join", event.currentTarget));
$("openRoomsPanelBtn")?.addEventListener("click", openRoomsPanel);
$("tableManageBtn").addEventListener("click", openRoomsPanel);
$("tableHistoryBtn").addEventListener("click", openRoomsPanel);
// The seats drawer floats above everything, so it lives at the top level of the page.
document.body.appendChild($("seatsPanel"));
$("seatsToggle").addEventListener("click", openSeats);
$("seatsClose").addEventListener("click", closeSeats);
document.addEventListener("click", event => { if ($("seatsPanel").classList.contains("open") && !event.target.closest("#seatsPanel")) closeSeats(); });
$("closeRoomsPanelBtn").addEventListener("click", closeRoomsPanel);
$("roomPanelOverlay").addEventListener("click", event => { if (event.target === $("roomPanelOverlay")) closeRoomsPanel(); });
$("roomActionCancel").addEventListener("click", closeRoomAction);
$("roomActionSubmit").addEventListener("click", () => void (roomActionMode === "join" ? joinRoom() : createRoom()));
$("roomJoinCode").addEventListener("input", event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
$("roomJoinCode").addEventListener("keydown", event => { if (event.key === "Enter") void joinRoom(); });
$("roomActionName").addEventListener("keydown", event => { if (event.key === "Enter") void (roomActionMode === "join" ? joinRoom() : createRoom()); });
$("roomActionModal").addEventListener("click", event => { if (event.target === $("roomActionModal")) closeRoomAction(); });
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if ($("profileModal").classList.contains("show")) closeProfile();
  else if ($("roomActionModal").classList.contains("show")) closeRoomAction();
  else if ($("roomPanelOverlay").classList.contains("show")) closeRoomsPanel();
  else if ($("seatsPanel").classList.contains("open")) closeSeats();
});
$("roomList").addEventListener("click", event => { const button = event.target.closest("[data-room-id]"); if (button) void openRoom(button.dataset.roomId); });
$("addMoneyEntryBtn").addEventListener("click", () => void addMoney());
$("moneyAmount").addEventListener("keydown", event => { if (event.key === "Enter") void addMoney(); });
$("roomLedger").addEventListener("click", event => { const button = event.target.closest("[data-delete-money]"); if (button) void deleteMoney(button.dataset.deleteMoney); });
$("saveRoomRatioBtn").addEventListener("click", () => void updateRatio());
$("finishRoomBtn").addEventListener("click", () => { if (confirm("לסיים את המשחק? לאחר מכן הרישומים יינעלו.")) void roomAction("wwcd_finish_room"); });
$("leaveRoomBtn").addEventListener("click", () => void leaveRoom());
$("copyRoomCodeBtn").addEventListener("click", async () => {
  if (!room) return;
  const text = `הוזמנת לשולחן פוקר "${room.name}"\nקוד הצטרפות: ${room.code}\n${SITE_AUTH_REDIRECT_URL}`;
  try {
    if (navigator.share) { await navigator.share({ title: "Winner winner chicken dinner", text }); return; }
  } catch (error) { if (error?.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(text); message("ההזמנה עם הקוד הועתקה.", "success"); } catch { message("קוד החדר: " + room.code); }
});
$("settleRoomBtn").addEventListener("click", settleRoom);
window.addEventListener("pagehide", () => { if (cloudSaveTimer) void pushCloudGame(); });
window.addEventListener("online", () => { if (user && client) { notice(); void verifySession(); } });

/* ---------- boot ---------- */
async function loadSdk() {
  let lastError;
  for (const source of SDK_SOURCES) {
    try { const mod = await import(source); if (mod?.createClient) return mod.createClient; } catch (error) { lastError = error; }
  }
  throw lastError || new Error("SDK unavailable");
}
(async function boot() {
  $("roomConnectionStatus").textContent = "בודק חיבור...";
  $("googleSignInBtn").disabled = true;
  $("guestSignInBtn").disabled = true;
  const linking = safeSessionGet(LINK_KEY) === "1";
  if (linking) safeSessionRemove(LINK_KEY);
  const rawOauthError = readOAuthError();
  // A failed Google link must not sign the guest out: they stay in and see a notice.
  const oauthError = linking ? "" : rawOauthError;
  if (safeSessionGet(LOGIN_TAP_KEY)) { safeSessionRemove(LOGIN_TAP_KEY); if (!oauthError) loginGateOpen = true; }
  const cached = storedSession();
  // Remember me: a returning user who already signed in on this device goes straight in.
  // The login screen only appears when there is no saved account (first visit or after sign-out).
  if (cached && !oauthError) { loginGateOpen = true; await enterUser(cached.user, { provisional: true }); }
  let createClient;
  try { createClient = await loadSdk(); }
  catch {
    if (user) notice("לא הצלחתי לטעון את שירות החשבון. המשחק המקומי ממשיך לעבוד — רענן כשיש רשת.", "warn");
    else showSignedOut("לא הצלחתי לטעון את שירות ההתחברות. בדוק את החיבור לאינטרנט ורענן.");
    return;
  }
  client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, storageKey: AUTH_STORAGE_KEY }
  });
  client.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === "SIGNED_OUT") {
        if (signOutRequested) return;
        // Unexpected sign-out event: re-check before showing the login screen.
        void verifySession();
      } else if (session?.user) {
        if (!loginGateOpen) { rememberedUser = session.user; return; }
        if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") { user = session.user; renderProfileIdentity(); if (client) initAdminArea(user, client); }
        else void enterUser(session.user);
      }
    }, 0);
  });
  if (oauthError) showSignedOut(oauthError);
  await verifySession();
  if (linking) {
    if (rawOauthError) notice(friendlyLinkError(rawOauthError), "warn");
    else if (user && !isGuest()) await finishGoogleLink();
  }
  if (!user && !oauthError && !$("authMessage").textContent) $("roomConnectionStatus").textContent = "מוכן להתחברות";
})();
