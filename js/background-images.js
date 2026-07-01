export const BACKGROUND_IMAGES = {
  hero: "assets/hero.jpg",
  confirmation: "assets/confirmation.jpg",
  approved: "assets/approved.jpg",
  requests: "assets/requests.jpg",
  crowd: "assets/crowd.jpg"
};

document.querySelectorAll("[data-bg-key]").forEach((node) => {
  const key = node.dataset.bgKey;
  const url = BACKGROUND_IMAGES[key];
  if (url) node.style.setProperty("--bg-image", `url("${url}")`);
});
