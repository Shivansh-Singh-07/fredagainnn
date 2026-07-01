import {
  auth,
  db,
  EVENT_CONFIG,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  onAuthStateChanged
} from "./firebase-init.js";
import { icon } from "./animations.js";

const result = document.querySelector("#statusResult");
let unsubscribeApplication;

if (result) {
  onAuthStateChanged(auth, (user) => {
    if (unsubscribeApplication) unsubscribeApplication();

    if (!user) {
      hideApprovedDetails();
      renderLoggedOut();
      return;
    }

    watchApplication(user);
  });
}

function watchApplication(user) {
  result.innerHTML = `
    <article class="status-panel panel">
      <p class="micro">Your Application</p>
      <h3>Checking...</h3>
      <p>Looking for an application connected to ${escapeHTML(user.email)}.</p>
    </article>
  `;

  const q = query(
    collection(db, "applications"),
    where("uid", "==", user.uid),
    limit(1)
  );

  unsubscribeApplication = onSnapshot(q, (snap) => {
    if (snap.empty) {
      hideApprovedDetails();
      renderNotRegistered(user);
      return;
    }

    const app = { id: snap.docs[0].id, ...snap.docs[0].data() };
    renderStatus(app);
  }, (error) => {
    console.error(error);
    hideApprovedDetails();
    result.innerHTML = `
      <article class="status-panel panel">
        <p class="micro">Status Unavailable</p>
        <h3>Permission issue.</h3>
        <p>Firestore rules need to allow signed-in users to read their own application by uid.</p>
      </article>
    `;
  });
}

function renderLoggedOut() {
  result.innerHTML = `
    <article class="status-panel panel">
      <p class="micro">Status</p>
      <h3>Login required.</h3>
      <p>Sign in with Google and your application status will appear here automatically.</p>
    </article>
  `;
}

function renderNotRegistered(user) {
  result.innerHTML = `
    <article class="status-panel panel">
      <p class="micro">Not Registered Yet</p>
      <h3>No application found.</h3>
      <p>${escapeHTML(user.email)} has not submitted an application yet. Fill the form above and this panel will update automatically.</p>
      <a class="btn btn-lime" href="#apply">Apply Now</a>
    </article>
  `;
}

function renderStatus(app) {
  if (app.status === "approved") {
    renderApproved(app);
    return;
  }

  if (app.status === "rejected") {
    hideApprovedDetails();
    result.innerHTML = `
      <article class="status-panel panel">
        ${icon("sad")}
        <p class="micro">Not This Time</p>
        <h3>Keeping it small.</h3>
        <p>It's a curated vibe and we're keeping it small this time. Hope to see you at the next one.</p>
      </article>
    `;
    return;
  }

  hideApprovedDetails();
  result.innerHTML = `
    <article class="status-panel panel">
      ${icon("hourglass")}
      <p class="micro">Pending Review</p>
      <h3>Good things take time.</h3>
      <p>Your application is in. The host has not reviewed it yet.</p>
    </article>
  `;
}

function renderApproved(app) {
  const guests = Math.max(0, Number(app.party_size || 1) - 1);

  result.innerHTML = `
    <article class="status-panel panel approved">
      <p class="micro">Approved</p>
      <h3 class="neon">See you Saturday.</h3>
      <p>For you + ${guests} guest${guests === 1 ? "" : "s"}.</p>
      <a class="btn btn-pink" href="#approvedArea">View Event Details</a>
    </article>
  `;

  document.querySelector("#approvedArea").hidden = false;
  document.querySelector("#approvedSubline").textContent = `For you + ${guests} guest${guests === 1 ? "" : "s"}`;
  document.querySelector(".details-card").innerHTML = `
    <p>${icon("location", "line-icon small")}<strong>Venue</strong><span>${escapeHTML(EVENT_CONFIG.EVENT_LOCATION)}</span></p>
    <p>${icon("clock", "line-icon small")}<strong>Time</strong><span>${escapeHTML(EVENT_CONFIG.ARRIVAL_TIME)}</span></p>
    <p>${icon("lock", "line-icon small")}<strong>Access</strong><span>Invite-only. Please fill the RSVP form to get the invitation.</span></p>
    <p>${icon("hanger", "line-icon small")}<strong>BYOB</strong><span>Guests may bring their own beverages. A venue corkage/setup fee per person applies at the gate.</span></p>
  `;
}

function hideApprovedDetails() {
  const approvedArea = document.querySelector("#approvedArea");
  if (approvedArea) approvedArea.hidden = true;
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
