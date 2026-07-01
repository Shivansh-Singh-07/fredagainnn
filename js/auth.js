import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  googleProvider,
  onAuthStateChanged,
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
let scrollAfterLogin = false;

async function login() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error(error);
    alert("Google login could not complete. Check Firebase Auth setup and authorized domains.");
  }
}

async function logout() {
  await signOut(auth);
  sessionStorage.removeItem("approvedGuestEmail");
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
}

function setLoggedIn(user) {
  eventApp?.classList.remove("hidden");
  enterSite?.classList.remove("hidden");
  navLogout?.classList.remove("hidden");
  navLogin?.classList.add("hidden");
  userPill?.classList.remove("hidden");
  if (userPill) userPill.textContent = user.displayName || user.email;
  if (heroLogin) heroLogin.textContent = "Logged In";
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
