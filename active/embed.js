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

// Try UV proxy first
registerSW()
  .then(() => {
    const proxiedUrl = __uv$config.prefix + __uv$config.encodeUrl(destination);
    window.location.href = proxiedUrl;
  })
  .catch((err) => {
    console.warn("Service worker registration failed, trying direct iframe:", err);
    // Fallback: Try opening with iframe
    setTimeout(() => {
      const iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.src = destination;
      document.body.innerHTML = "";
      document.body.appendChild(iframe);
    }, 500);
  });
