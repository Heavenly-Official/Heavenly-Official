'use strict';

const sidebarEl    = document.getElementById('sidebar');
const sidebarPanel = document.getElementById('sidebar-panel');
const sidebarFrame = document.getElementById('sidebar-frame');
const railBtns     = document.querySelectorAll('.sidebar-rail-btn');

let activePanelId = null;

function openPanel(id) {
  if (activePanelId === id) {
    closePanel();
    return;
  }

  activePanelId = id;
  sidebarFrame.src = '/sidebar/' + id + '.html';
  sidebarPanel.classList.add('open');
  sidebarEl.classList.add('expanded');

  railBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.panel === id);
  });
}

function closePanel() {
  activePanelId = null;
  sidebarPanel.classList.remove('open');
  sidebarEl.classList.remove('expanded');
  railBtns.forEach(btn => btn.classList.remove('active'));
  setTimeout(() => { if (!activePanelId) sidebarFrame.src = ''; }, 300);
}

railBtns.forEach(btn => {
  btn.addEventListener('click', () => openPanel(btn.dataset.panel));
});

window.addEventListener('message', (e) => {
  if (!e.data) return;

  if (e.data.type === 'sidebar-navigate') {
    const url = e.data.url;
    if (!url) return;
    const tab = getActiveTab();
    if (tab) navigate(url, tab);
  }

  if (e.data.type === 'prefs-updated') {
    applyPrefs(e.data.prefs);
  }

  if (e.data.type === 'prefs-cleared') {
    applyPrefs({});
  }
});

function applyPrefs(prefs) {
  const homeBtn = document.getElementById('home-btn');
  if (homeBtn) {
    homeBtn.style.display = (prefs.showHome ?? false) ? '' : 'none';
  }
}

(function initPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem('heavenly_prefs') || '{}');
    applyPrefs(prefs);
  } catch {}
})();
