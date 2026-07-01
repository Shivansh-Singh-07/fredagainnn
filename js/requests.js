import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  firstName,
  initials
} from "./firebase-init.js";
import { icon } from "./animations.js";

const requestList = document.querySelector("#requestList");
const requestForm = document.querySelector("#requestForm");
const guestList = document.querySelector("#guestList");
const headcount = document.querySelector("#headcount");
const tabs = document.querySelector("[data-request-tabs]");
let requestSort = "newest";
let unsubscribeRequests;
let unsubscribeGuests;
let expandedGuests = false;
let latestGuests = [];

function approved() {
  return Boolean(sessionStorage.getItem("approvedGuestEmail"));
}

function startLive() {
  if (!approved() || !requestList) return;
  listenRequests();
  listenGuests();
}

function listenRequests() {
  if (unsubscribeRequests) unsubscribeRequests();
  const sortField = requestSort === "top" ? "votes" : "created_at";
  const direction = "desc";
  unsubscribeRequests = onSnapshot(query(collection(db, "song_requests"), orderBy(sortField, direction)), (snap) => {
    requestList.innerHTML = snap.docs.map((item) => {
      const data = item.data();
      return `
        <article class="request-row">
          ${icon("vinyl")}
          <div><strong>${escapeHTML(data.track || "Untitled")}</strong><br><span>${escapeHTML(data.artist || "Unknown artist")}</span></div>
          <button class="btn btn-outline" data-upvote="${item.id}" type="button">↑ ${Number(data.votes || 0)}</button>
        </article>
      `;
    }).join("") || `<p class="privacy-note">No requests yet. Be first.</p>`;
  });
}

function listenGuests() {
  if (unsubscribeGuests) unsubscribeGuests();
  unsubscribeGuests = onSnapshot(query(collection(db, "approved_guests"), orderBy("approved_at", "desc")), (snap) => {
    latestGuests = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
    const total = latestGuests.reduce((sum, guest) => sum + Number(guest.party_size || 1), 0);
    headcount.textContent = `${total} people`;
    renderGuests();
  });
}

function renderGuests() {
  const visible = expandedGuests ? latestGuests : latestGuests.slice(0, 8);
  guestList.innerHTML = visible.map((guest) => {
    const size = Number(guest.party_size || 1);
    const party = size === 1 ? "Solo" : guest.party_type === "Couple" ? "Couple" : `Group of ${size}`;
    return `
      <article class="guest-row">
        <span class="avatar">${initials(guest.name)}</span>
        <strong>${firstName(guest.name)}</strong>
        <span>${party}</span>
      </article>
    `;
  }).join("") || `<p class="privacy-note">Approved guests will appear here.</p>`;
}

if (requestForm) {
  document.addEventListener("guest-approved", startLive);
  if (approved()) startLive();

  tabs?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-sort]");
    if (!button) return;
    requestSort = button.dataset.sort;
    tabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
    listenRequests();
  });

  requestList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-upvote]");
    if (!button || !approved()) return;
    await updateDoc(doc(db, "song_requests", button.dataset.upvote), { votes: increment(1) });
  });

  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!approved()) return;
    const data = new FormData(requestForm);
    await addDoc(collection(db, "song_requests"), {
      track: data.get("track").trim(),
      artist: data.get("artist").trim(),
      votes: 0,
      created_at: serverTimestamp()
    });
    requestForm.reset();
  });

  document.querySelector("#expandGuests")?.addEventListener("click", () => {
    expandedGuests = !expandedGuests;
    document.querySelector("#expandGuests").textContent = expandedGuests ? "Collapse List" : "Open Full List";
    renderGuests();
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
