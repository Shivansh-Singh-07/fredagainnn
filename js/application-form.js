import {
  auth,
  db,
  EVENT_CONFIG,
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  normalizeEmail,
  statusLookupId
} from "./firebase-init.js";

const form = document.querySelector("#applicationForm");

if (form) {
  let step = 0;
  let submitting = false;
  let partyType = "Solo";
  const steps = [...form.querySelectorAll(".wizard-step")];
  const dots = [...form.querySelectorAll("[data-step-dot]")];
  const lines = [...form.querySelectorAll(".step-line")];
  const back = form.querySelector("[data-back]");
  const next = form.querySelector("[data-next]");
  const submit = form.querySelector("[data-submit]");
  const message = form.querySelector(".form-message");
  const groupSize = form.querySelector("[data-group-size]");
  const partySizeInput = form.elements.party_size;

  partySizeInput.max = EVENT_CONFIG.MAX_PARTY_SIZE;

  function syncUser(user) {
    if (!user) return;
    if (form.elements.name && !form.elements.name.value) form.elements.name.value = user.displayName || "";
    if (form.elements.email) {
      form.elements.email.value = normalizeEmail(user.email);
      form.elements.email.readOnly = true;
    }
  }

  syncUser(auth.currentUser);
  document.addEventListener("auth-user-changed", (event) => syncUser(event.detail.user));

  function setMessage(text = "", type = "") {
    message.textContent = text;
    message.className = `form-message ${type}`.trim();
  }

  function setStep(nextStep) {
    steps[step].classList.toggle("prev", nextStep > step);
    step = Math.max(0, Math.min(2, nextStep));
    steps.forEach((node, index) => {
      node.classList.toggle("active", index === step);
      node.classList.toggle("prev", index < step);
    });
    dots.forEach((node, index) => {
      node.classList.toggle("active", index === step);
      node.classList.toggle("done", index < step);
    });
    lines.forEach((line, index) => line.classList.toggle("filled", index < step));
    back.hidden = step === 0;
    next.hidden = step === 2;
    submit.hidden = step !== 2;
  }

  function validateStep() {
    const fields = [...steps[step].querySelectorAll("input, textarea")].filter((field) => !field.closest(".slide-field:not(.open)"));
    const invalid = fields.find((field) => !field.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    if (partyType === "Group" && Number(partySizeInput.value) > EVENT_CONFIG.MAX_PARTY_SIZE) {
      setMessage(`Groups are capped at ${EVENT_CONFIG.MAX_PARTY_SIZE} people total.`, "error");
      return false;
    }
    setMessage();
    return true;
  }

  form.querySelector("[data-party-type]").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-value]");
    if (!button) return;
    partyType = button.dataset.value;
    form.querySelectorAll("[data-party-type] button").forEach((item) => item.classList.toggle("selected", item === button));
    groupSize.classList.toggle("open", partyType === "Group");
    partySizeInput.value = partyType === "Solo" ? 1 : partyType === "Couple" ? 2 : Math.max(3, Number(partySizeInput.value || 3));
  });

  next.addEventListener("click", () => {
    if (validateStep()) setStep(step + 1);
  });

  back.addEventListener("click", () => setStep(step - 1));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting || !validateStep()) return;
    if (!auth.currentUser) {
      setMessage("Please login with Google before submitting.", "error");
      return;
    }
    submitting = true;
    submit.disabled = true;
    setMessage("Submitting your application...", "success");
    const data = new FormData(form);
    const substances = [...form.querySelectorAll("[data-substances] input:checked")].map((item) => item.value);
    const payload = {
      name: data.get("name").trim(),
      email: normalizeEmail(auth.currentUser.email),
      uid: auth.currentUser.uid,
      google_name: auth.currentUser.displayName || "",
      google_photo_url: auth.currentUser.photoURL || "",
      phone: data.get("phone").trim(),
      party_type: partyType,
      party_size: Number(data.get("party_size") || 1),
      favourite_song: data.get("favourite_song").trim(),
      favourite_genre: data.get("favourite_genre").trim(),
      substance_pref: substances,
      favourite_artist: data.get("favourite_artist").trim(),
      instagram_handle: data.get("instagram_handle").trim(),
      applicant_notes: data.get("applicant_notes").trim(),
      status: "pending",
      host_rating: 0,
      review_notes: "",
      submitted_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    try {
      const created = await addDoc(collection(db, "applications"), payload);
      await setDoc(doc(db, "status_lookup", await statusLookupId(payload.email)), {
        application_id: created.id,
        email: payload.email,
        status: "pending",
        party_size: payload.party_size,
        party_type: payload.party_type,
        updated_at: serverTimestamp()
      });
      form.reset();
      syncUser(auth.currentUser);
      form.querySelector('[data-value="Solo"]').click();
      setStep(0);
      document.querySelector("#confirmation").classList.remove("hidden");
      document.querySelector("#confirmation").scrollIntoView({ behavior: "smooth" });
      setMessage("Application received.", "success");
    } catch (error) {
      console.error(error);
      setMessage("Could not submit right now. Check Firebase config and rules.", "error");
    } finally {
      window.setTimeout(() => {
        submitting = false;
        submit.disabled = false;
      }, 900);
    }
  });
}
