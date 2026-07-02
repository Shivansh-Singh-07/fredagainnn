import {
  auth,
  db,
  EVENT_CONFIG,
  collection,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  relativeTime,
  googleProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  isAdminEmail
} from "./firebase-init.js";

const login = document.querySelector("#adminLogin");
const dashboard = document.querySelector("#dashboard");
const adminGoogleLogin = document.querySelector("#adminGoogleLogin");
const adminLoginNote = document.querySelector("#adminLoginNote");
const adminLogout = document.querySelector("#adminLogout");
const table = document.querySelector("#applicationsTable");
const detailPanel = document.querySelector("#detailPanel");
const detailContent = document.querySelector("#detailContent");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const tabs = document.querySelector("#statusTabs");
let apps = [];
let filter = "all";
let unsubscribeApplications;

adminGoogleLogin?.addEventListener("click", async () => {
  try {
    adminLoginNote.textContent = "Opening Google login...";
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error(error);
    adminLoginNote.textContent = error.code === "auth/popup-closed-by-user"
      ? "Login popup was closed before finishing. Click Continue with Google and complete the popup."
      : `Google login failed: ${error.code || error.message}`;
  }
});

adminLogout?.addEventListener("click", async () => {
  await signOut(auth);
  sessionStorage.removeItem("approvedGuestEmail");
  window.location.href = "index.html#home";
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    lock("Sign in with your host Google account.");
    return;
  }
  if (!isAdminEmail(user.email)) {
    lock(`${user.email} is signed in, but it is not in ADMIN_EMAILS.`);
    return;
  }
  unlock(user);
});

function lock(message) {
  if (unsubscribeApplications) unsubscribeApplications();
  dashboard.classList.add("hidden");
  login.classList.remove("hidden");
  if (adminLoginNote) adminLoginNote.textContent = message;
}

function unlock(user) {
  login.classList.add("hidden");
  dashboard.classList.remove("hidden");
  if (adminLoginNote) adminLoginNote.textContent = `Signed in as ${user.email}.`;
  if (unsubscribeApplications) unsubscribeApplications();
  unsubscribeApplications = onSnapshot(query(collection(db, "applications"), orderBy("submitted_at", "desc")), (snap) => {
    apps = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderAll();
  }, (error) => {
    console.error(error);
    lock(`Could not read applications for ${user.email}. Paste the README Firestore rules, confirm this email is in the admin list, and disable ad blockers for this site.`);
  });
}

function renderAll() {
  renderStats();
  renderActivity();
  renderChart();
  renderTabs();
  renderTable();
}

function approvedHeadcount() {
  return apps.filter((app) => app.status === "approved").reduce((sum, app) => sum + Number(app.party_size || 1), 0);
}

function renderStats() {
  const approved = approvedHeadcount();
  const pending = apps.filter((app) => app.status === "pending").length;
  document.querySelector("#statTotal").textContent = apps.length;
  document.querySelector("#statApproved").textContent = `${approved}/${EVENT_CONFIG.MAX_GUESTS}`;
  document.querySelector("#statRemaining").textContent = Math.max(0, EVENT_CONFIG.MAX_GUESTS - approved);
  document.querySelector("#statPending").textContent = pending;
}

function renderActivity() {
  const feed = document.querySelector("#activityFeed");
  feed.innerHTML = apps.slice(0, 7).map((app) => `
    <article class="activity-row">
      <span class="status-dot ${app.status}"></span>
      <div><strong>${escapeHTML(app.name)}</strong><br><span>Application ${app.status || "pending"}</span></div>
      <span>${relativeTime(app.updated_at || app.submitted_at)}</span>
    </article>
  `).join("") || `<p class="privacy-note">No activity yet.</p>`;
}

function renderChart() {
  const svg = document.querySelector("#appsChart");
  const days = [...Array(7)].map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const counts = days.map((day) => apps.filter((app) => {
    const submitted = app.submitted_at?.toDate ? app.submitted_at.toDate() : null;
    return submitted && submitted.toDateString() === day.toDateString();
  }).length);
  const max = Math.max(1, ...counts);
  const points = counts.map((count, index) => {
    const x = 30 + index * 76;
    const y = 150 - (count / max) * 115;
    return `${x},${y}`;
  }).join(" ");
  const area = `30,160 ${points} 486,160`;
  svg.innerHTML = `
    <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff3d9a" stop-opacity=".34"/><stop offset="1" stop-color="#ff3d9a" stop-opacity="0"/></linearGradient></defs>
    <polyline points="${points}" fill="none" stroke="#d4ff3d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <polygon points="${area}" fill="url(#chartFill)"></polygon>
    ${counts.map((count, index) => `<circle cx="${30 + index * 76}" cy="${150 - (count / max) * 115}" r="4" fill="#d4ff3d"></circle>`).join("")}
  `;
}

function renderTabs() {
  const counts = {
    all: apps.length,
    pending: apps.filter((app) => app.status === "pending").length,
    approved: apps.filter((app) => app.status === "approved").length,
    rejected: apps.filter((app) => app.status === "rejected").length
  };
  tabs.querySelectorAll("button").forEach((button) => {
    button.querySelector("span").textContent = counts[button.dataset.filter];
  });
}

function visibleApps() {
  const search = searchInput.value.trim().toLowerCase();
  return apps
    .filter((app) => filter === "all" || app.status === filter)
    .filter((app) => !search || [app.name, app.email, app.favourite_song, app.favourite_genre].some((value) => String(value || "").toLowerCase().includes(search)))
    .sort((a, b) => {
      if (sortSelect.value === "newest") return time(b.submitted_at) - time(a.submitted_at);
      if (sortSelect.value === "party") return Number(b.party_size || 1) - Number(a.party_size || 1);
      return Number(b.host_rating || 0) - Number(a.host_rating || 0);
    });
}

function renderTable() {
  const approved = approvedHeadcount();
  table.innerHTML = visibleApps().map((app) => {
    const size = Number(app.party_size || 1);
    const exceeds = app.status === "pending" && approved + size > EVENT_CONFIG.MAX_GUESTS;
    return `
      <tr data-id="${app.id}">
        <td><strong>${escapeHTML(app.name)}</strong><br><span>${escapeHTML(app.email)}</span>${exceeds ? '<span class="capacity-flag">! Exceeds capacity</span>' : ""}</td>
        <td>${escapeHTML(app.party_type || "Solo")}<br><span>${size} total</span></td>
        <td>${escapeHTML(app.favourite_song || "")}<br><span>${escapeHTML(app.favourite_genre || "")}</span></td>
        <td>${(app.substance_pref || []).map((item) => `<span class="pill">${escapeHTML(item)}</span>`).join("")}</td>
        <td>${"&#9733;".repeat(Number(app.host_rating || 0))}${"&#9734;".repeat(5 - Number(app.host_rating || 0))}</td>
        <td><span class="pill ${app.status || "pending"}">${app.status || "pending"}</span></td>
        <td>${relativeTime(app.submitted_at)}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="7">No applications match.</td></tr>`;
}

tabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  filter = button.dataset.filter;
  tabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
  renderTable();
});

searchInput.addEventListener("input", renderTable);
sortSelect.addEventListener("change", renderTable);

table.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-id]");
  if (!row) return;
  const app = apps.find((item) => item.id === row.dataset.id);
  if (app) openDetail(app);
});

document.querySelector("#closeDetail").addEventListener("click", closeDetail);

function openDetail(app) {
  detailPanel.classList.add("open");
  detailPanel.setAttribute("aria-hidden", "false");
  const rating = Number(app.host_rating || 0);
  detailContent.innerHTML = `
    <form class="detail-form" data-detail-id="${app.id}">
      <p class="micro">Applicant Detail</p>
      <h2>${escapeHTML(app.name)}</h2>
      <p class="privacy-note">${escapeHTML(app.party_type || "Solo")} - ${Number(app.party_size || 1)} total - submitted ${relativeTime(app.submitted_at)}</p>
      <p><a href="mailto:${escapeHTML(app.email)}">${escapeHTML(app.email)}</a>${app.instagram_handle ? ` - <a href="https://instagram.com/${escapeHTML(app.instagram_handle).replace("@", "")}" target="_blank" rel="noreferrer">${escapeHTML(app.instagram_handle)}</a>` : ""}</p>
      <div class="panel">
        <p><strong>Song</strong><br>${escapeHTML(app.favourite_song || "")}</p>
        <p><strong>Genre</strong><br>${escapeHTML(app.favourite_genre || "")}</p>
        <p><strong>Artist</strong><br>${escapeHTML(app.favourite_artist || "")}</p>
        <p><strong>Substances</strong><br>${(app.substance_pref || []).join(", ") || "None shared"}</p>
        <p><strong>Dance floor</strong><br>${escapeHTML(app.dance_floor_energy || "No answer")}</p>
        <p><strong>Leaves early if</strong><br>${escapeHTML(app.party_exit_reason || "No answer")}</p>
        <p><strong>Notes</strong><br>${escapeHTML(app.applicant_notes || "No notes")}</p>
      </div>
      <div>
        <span class="label-text">Vibe Rating</span>
        <div class="star-row">${[1,2,3,4,5].map((star) => `<button type="button" data-star="${star}" class="${star <= rating ? "active" : ""}">&#9733;</button>`).join("")}</div>
      </div>
      <label>Review notes<textarea name="review_notes">${escapeHTML(app.review_notes || "")}</textarea></label>
      <label>Status
        <select name="status">
          ${["pending", "approved", "rejected"].map((status) => `<option value="${status}" ${status === (app.status || "pending") ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </label>
      <div class="danger-row">
        <button class="btn btn-lime" type="submit">Update Application</button>
        <button class="icon-button" type="button" data-delete title="Delete application">&times;</button>
      </div>
      <p class="form-message" role="status"></p>
    </form>
  `;

  const form = detailContent.querySelector("form");
  let hostRating = rating;
  form.querySelector(".star-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-star]");
    if (!button) return;
    hostRating = Number(button.dataset.star);
    form.querySelectorAll("[data-star]").forEach((item) => item.classList.toggle("active", Number(item.dataset.star) <= hostRating));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = new FormData(form).get("status");
    const payload = {
      host_rating: hostRating,
      review_notes: new FormData(form).get("review_notes"),
      status,
      updated_at: serverTimestamp()
    };
    await updateDoc(doc(db, "applications", app.id), payload);
    form.querySelector(".form-message").textContent = "Updated.";
  });

  form.querySelector("[data-delete]").addEventListener("click", async () => {
    if (!confirm(`Delete ${app.name}'s application?`)) return;
    await deleteDoc(doc(db, "applications", app.id));
    closeDetail();
  });
}

function closeDetail() {
  detailPanel.classList.remove("open");
  detailPanel.setAttribute("aria-hidden", "true");
}

function time(value) {
  return value?.toDate ? value.toDate().getTime() : 0;
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
