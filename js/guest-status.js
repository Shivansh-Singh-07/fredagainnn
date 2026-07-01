import {
  db,
  EVENT_CONFIG,
  doc,
  getDoc,
  normalizeEmail,
  statusLookupId
} from "./firebase-init.js";
import { icon } from "./animations.js";

const form = document.querySelector("#statusForm");
const result = document.querySelector("#statusResult");

if (form && result) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = normalizeEmail(new FormData(form).get("status_email"));
    result.innerHTML = `<article class="status-panel panel"><p>Checking...</p></article>`;
    try {
      const snap = await getDoc(doc(db, "status_lookup", await statusLookupId(email)));
      if (!snap.exists()) {
        result.innerHTML = rejectedPanel("No application found for that email.");
        return;
      }
      const app = { id: snap.id, ...snap.data() };
      renderStatus(app);
    } catch (error) {
      console.error(error);
      result.innerHTML = `<article class="status-panel panel"><h3>Could not check status</h3><p>Make sure Firebase is configured and the lookup index exists.</p></article>`;
    }
  });
}

function renderStatus(app) {
  if (app.status === "approved") {
    const guests = Math.max(0, Number(app.party_size || 1) - 1);
    result.innerHTML = `
      <article class="status-panel panel approved">
        <h3 class="neon">See you Saturday</h3>
        <p>For you + ${guests} guest${guests === 1 ? "" : "s"}</p>
        <div>
          <a class="btn btn-pink" href="#requests" id="showRequests">View Song Requests</a>
          <a class="btn btn-outline" href="#requests" id="showGuests">See Who's Coming</a>
        </div>
      </article>
    `;
    document.querySelector("#approvedArea").hidden = false;
    document.querySelector("#requests").hidden = false;
    document.querySelector("#approvedSubline").textContent = `For you + ${guests} guest${guests === 1 ? "" : "s"}`;
    document.querySelector(".details-card").innerHTML = `
      <p>${icon("location", "line-icon small")}<strong>Location</strong><span>${EVENT_CONFIG.EVENT_LOCATION}</span></p>
      <p>${icon("clock", "line-icon small")}<strong>Arrival</strong><span>${EVENT_CONFIG.ARRIVAL_TIME}</span></p>
      <p>${icon("hanger", "line-icon small")}<strong>Dress</strong><span>${EVENT_CONFIG.DRESS_CODE}</span></p>
      <p>${icon("lock", "line-icon small")}<strong>Reminder</strong><span>Respect the space. No phones on the dancefloor.</span></p>
    `;
    sessionStorage.setItem("approvedGuestEmail", app.email);
    document.dispatchEvent(new CustomEvent("guest-approved"));
    return;
  }

  if (app.status === "rejected") {
    result.innerHTML = rejectedPanel("It's a curated vibe and we're keeping it small this time. Hope to see you at the next one.");
    return;
  }

  result.innerHTML = `
    <article class="status-panel panel">
      ${icon("hourglass")}
      <p class="micro">Pending Review</p>
      <h3>Good things take time.</h3>
      <p>Your application is still being reviewed personally.</p>
      <a class="btn btn-outline" href="#home">Back Home</a>
    </article>
  `;
}

function rejectedPanel(copy) {
  return `
    <article class="status-panel panel">
      ${icon("sad")}
      <p class="micro">Not This Time</p>
      <h3>Keeping it small.</h3>
      <p>${copy}</p>
      <a class="btn btn-outline" href="#home">Back Home</a>
    </article>
  `;
}
