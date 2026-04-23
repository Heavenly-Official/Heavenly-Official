'use strict';

const sidebarEl    = document.getElementById('sidebar');
const sidebarPanel = document.getElementById('sidebar-panel');
const sidebarFrame = document.getElementById('sidebar-frame');
const railBtns     = document.querySelectorAll('.sidebar-rail-btn');

let activePanelId = null;
let isExpanded    = false;

function openPanel(id) {
  if (activePanelId === id) {
    closePanel();
    return;
  }

  activePanelId = id;
  isExpanded    = false;
  sidebarPanel.classList.remove('expanded');
  sidebarFrame.src = 'public/sidebar/' + id + '.html';
  sidebarPanel.classList.add('open');
  sidebarEl.classList.add('expanded');

  railBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.panel === id);
  });
}

function closePanel() {
  activePanelId = null;
  isExpanded    = false;
  sidebarPanel.classList.remove('open', 'expanded');
  sidebarEl.classList.remove('expanded');
  railBtns.forEach(btn => btn.classList.remove('active'));
  setTimeout(() => { if (!activePanelId) sidebarFrame.src = ''; }, 300);
}

function toggleExpand() {
  isExpanded = !isExpanded;
  sidebarPanel.classList.toggle('expanded', isExpanded);
  syncExpandIcon();
}

function syncExpandIcon() {
  try {
    const btn = sidebarFrame.contentDocument && sidebarFrame.contentDocument.getElementById('expand-btn');
    if (!btn) return;
    if (isExpanded) {
      btn.title = 'Collapse sidebar';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">
        <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
        <line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/>
      </svg>`;
    } else {
      btn.title = 'Expand sidebar';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px">
        <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
        <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
      </svg>`;
    }
  } catch(e) {}
}

railBtns.forEach(btn => {
  btn.addEventListener('click', () => openPanel(btn.dataset.panel));
});

sidebarFrame.addEventListener('load', () => {
  if (isExpanded) syncExpandIcon();
});

window.addEventListener('message', (e) => {
  if (!e.data) return;

  if (e.data.type === 'sidebar-navigate') {
    const url = e.data.url;
    if (!url) return;
    const tab = getActiveTab();
    if (tab) navigate(url, tab);
  }

  if (e.data.type === 'navigate') {
    const url = e.data.url;
    if (!url) return;
    const tab = getActiveTab();
    if (tab) navigate(url, tab);
  }

  if (e.data.type === 'sidebar-toggle-expand') {
    if (activePanelId) toggleExpand();
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
