export const BACKGROUND_IMAGES = {
  hero: "assets/approved.jpg",
  confirmation: "assets/requests.jpg",
  approved: "assets/crowd.jpg",
  requests: "assets/confirmation.jpg",
  crowd: "assets/hero.jpg"
};

function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

document.querySelectorAll("[data-bg-key]").forEach((node) => {
  const key = node.dataset.bgKey;
  const url = BACKGROUND_IMAGES[key];
  if (url) node.style.setProperty("--bg-image", `url("${assetUrl(url)}")`);
});
