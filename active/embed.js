"use strict";

let urlParams = new URLSearchParams(window.location.search);
let destination = urlParams.get("url");

if (!destination) {
  alert("Error: No URL provided!");
  throw new Error("No URL provided");
}

try {
  destination = new URL(destination).toString();
} catch (err) {
  alert(`Invalid URL:\n${err}`);
  throw err;
}

// Route through UV proxy
(async () => {
  try {
    await registerSW();
  } catch (err) {
    const loadingBox = document.getElementById('loadingbox');
    if (loadingBox) loadingBox.textContent = "Failed to register service worker: " + err;
    throw err;
  }

  location.href = __uv$config.prefix + __uv$config.encodeUrl(destination);
})();
