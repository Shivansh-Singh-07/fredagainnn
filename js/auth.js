import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  googleProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  isAdminEmail,
  normalizeEmail
} from "./firebase-init.js";

const eventApp = document.querySelector("#eventApp");
const heroLogin = document.querySelector("#heroLogin");
const navLogin = document.querySelector("#navLogin");
const navLogout = document.querySelector("#navLogout");
const enterSite = document.querySelector("#enterSite");
const adminPanelLink = document.querySelector("#adminPanelLink");
const userPill = document.querySelector("#userPill");
const authMessage = document.querySelector("#authMessage");
let scrollAfterLogin = false;

function setAuthMessage(text = "", type = "") {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.className = `auth-message ${type}`.trim();
}

async function login() {
  try {
    setAuthMessage("Opening Google login...", "success");
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error(error);
    const message = error.code === "auth/popup-closed-by-user"
      ? "Login popup was closed before finishing. Click Continue with Google and complete the popup."
      : `Google login failed: ${error.code || error.message}`;
    setAuthMessage(message, "error");
  }
}

async function logout() {
  await signOut(auth);
  sessionStorage.removeItem("approvedGuestEmail");
  sessionStorage.removeItem("firebase:previous_websocket_failure");
  window.location.hash = "#home";
}

async function rememberUser(user) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: user.displayName || "",
    email: normalizeEmail(user.email),
    photo_url: user.photoURL || "",
    is_admin: isAdminEmail(user.email),
    last_login_at: serverTimestamp()
  }, { merge: true });
}

function setLoggedOut() {
  eventApp?.classList.add("hidden");
  enterSite?.classList.add("hidden");
  navLogout?.classList.add("hidden");
  adminPanelLink?.classList.add("hidden");
  userPill?.classList.add("hidden");
  navLogin?.classList.remove("hidden");
  if (heroLogin) heroLogin.textContent = "Continue with Google";
  setAuthMessage("Login to unlock the invite page.", "");
}

function setLoggedIn(user) {
  eventApp?.classList.remove("hidden");
  enterSite?.classList.remove("hidden");
  navLogout?.classList.remove("hidden");
  navLogin?.classList.add("hidden");
  userPill?.classList.remove("hidden");
  if (userPill) userPill.textContent = user.displayName || user.email;
  if (heroLogin) heroLogin.textContent = "Logged In";
  setAuthMessage(`Signed in as ${user.email}.`, "success");
  adminPanelLink?.classList.toggle("hidden", !isAdminEmail(user.email));
}

heroLogin?.addEventListener("click", () => {
  scrollAfterLogin = true;
  login();
});
navLogin?.addEventListener("click", login);
navLogout?.addEventListener("click", logout);
enterSite?.addEventListener("click", () => {
  eventApp?.scrollIntoView({ behavior: "smooth", block: "start" });
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setLoggedOut();
    document.dispatchEvent(new CustomEvent("auth-user-changed", { detail: { user: null } }));
    return;
  }

  setLoggedIn(user);
  rememberUser(user).catch(console.error);
  document.dispatchEvent(new CustomEvent("auth-user-changed", { detail: { user } }));
  if (scrollAfterLogin) {
    scrollAfterLogin = false;
    window.setTimeout(() => eventApp?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
  }
});
