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

// Load directly in iframe (bypass UV proxy due to CORS limitations)
window.addEventListener('DOMContentLoaded', () => {
  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.display = "block";
  iframe.style.position = "absolute";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.src = destination;
  
  // Remove loading box
  const loadingBox = document.getElementById('loadingbox');
  if (loadingBox) loadingBox.style.display = 'none';
  
  // Add iframe
  document.body.appendChild(iframe);
});

// Also try immediate load
const iframe = document.createElement("iframe");
iframe.style.width = "100%";
iframe.style.height = "100%";
iframe.style.border = "none";
iframe.style.display = "block";
iframe.style.position = "absolute";
iframe.style.top = "0";
iframe.style.left = "0";
iframe.src = destination;

const loadingBox = document.getElementById('loadingbox');
if (loadingBox) loadingBox.style.display = 'none';

document.body.appendChild(iframe);
