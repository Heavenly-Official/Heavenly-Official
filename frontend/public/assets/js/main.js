'use strict';

let tabs = [];
let activeTabId = null;
let tabIdCounter = 0;

const tabsContainer   = document.getElementById('tabs-container');
const browserContent  = document.getElementById('browser-content');
const addressBar      = document.getElementById('address-bar');
const faviconDisplay  = document.getElementById('favicon-display');
const backBtn         = document.getElementById('back-btn');
const forwardBtn      = document.getElementById('forward-btn');
const reloadBtn       = document.getElementById('reload-btn');
const homeBtn         = document.getElementById('home-btn');
const goBtn           = document.getElementById('go-btn');
const newTabBtn       = document.getElementById('new-tab-btn');

class Tab {
  constructor(id, url) {
    this.id       = id;
    this.url      = url;
    this.embedUrl = '';
    this.title    = 'New Tab';
    this.favicon  = null;
    this.iframeEl = null;
    this.tabEl    = null;
    this.isNew    = url === 'newtab';
  }
}

const HEAVENLY_PAGES = {
  'games':    '/games/g.html',
  'settings': '/settings/settings.html',
  'popup':    '/popup.html',
};

// ── Control Panel ─────────────────────────────────────────
const CTRL_PANEL_META = {
  games:    { label: 'Games',    icon: 'gamepad-2' },
  settings: { label: 'Settings', icon: 'settings'  },
  popup:    { label: 'Popup',    icon: 'bell'       },
};

const ctrlPanelOverlay = document.getElementById('ctrl-panel-overlay');
const ctrlPanelList    = document.getElementById('ctrl-panel-list');

(function buildCtrlPanel() {
  Object.keys(HEAVENLY_PAGES).forEach(key => {
    const meta = CTRL_PANEL_META[key] || { label: key.charAt(0).toUpperCase() + key.slice(1), icon: 'file' };
    const btn = document.createElement('button');
    btn.className = 'ctrl-panel-item';
    btn.innerHTML = `
      <div class="ctrl-panel-item-icon"><i data-lucide="${meta.icon}"></i></div>
      <div>
        <div class="ctrl-panel-item-name">${meta.label}</div>
        <div class="ctrl-panel-item-url">heavenly://${key}</div>
      </div>
    `;
    btn.addEventListener('click', () => {
      closeCtrlPanel();
      const tab = tabs.find(t => t.id === activeTabId) || null;
      navigate('heavenly://' + key, tab);
    });
    ctrlPanelList.appendChild(btn);
  });
  lucide.createIcons({ nodes: [ctrlPanelList] });
})();

function openCtrlPanel() {
  ctrlPanelOverlay.classList.add('open');
  lucide.createIcons({ nodes: [document.getElementById('ctrl-panel')] });
}

function closeCtrlPanel() {
  ctrlPanelOverlay.classList.remove('open');
}

ctrlPanelOverlay.addEventListener('click', (e) => {
  if (e.target === ctrlPanelOverlay) closeCtrlPanel();
});

function buildEmbedUrl(input) {
  input = input.trim();
  if (!input) return null;

  if (input === 'newtab') return 'newtab.html';

  if (/^heavenly:\/\//i.test(input)) {
    const pageKey = input.replace(/^heavenly:\/\//i, '').toLowerCase().split('/')[0].split('?')[0];
    return HEAVENLY_PAGES[pageKey] || null;
  }

  let targetUrl = '';

  if (/^https?:\/\//i.test(input)) {
    targetUrl = input;
  } else if (/^[^\s]+\.[^\s]+$/.test(input) && !input.includes(' ')) {
    targetUrl = 'https://' + input;
  } else {
    const engine = loadSetting('engine', 'https://duckduckgo.com/?q=');
    targetUrl = engine + encodeURIComponent(input);
  }

  return '/active/embed.html?url=' + encodeURIComponent(targetUrl);
}

function getRealUrlFromEmbed(embedSrc) {
  if (!embedSrc) return '';
  if (embedSrc === 'newtab.html' || /\/newtab\.html$/i.test(embedSrc)) return 'New Tab';

  for (const [page, path] of Object.entries(HEAVENLY_PAGES)) {
    if (embedSrc === path || embedSrc.endsWith(path)) {
      return 'Heavenly://' + page;
    }
  }

  try {
    const parsed = new URL(embedSrc, window.location.href);
    if (/\/active\/embed\.html$/i.test(parsed.pathname) || /embed\.html$/i.test(parsed.pathname)) {
      const original = parsed.searchParams.get('url');
      return original || '';
    }
    return parsed.href;
  } catch (e) {}

  try {
    return decodeURIComponent(embedSrc);
  } catch (e) {
    return embedSrc;
  }
}

function createTab(url) {
  const id  = ++tabIdCounter;
  const tab = new Tab(id, url === 'newtab' ? 'newtab' : url);
  tabs.push(tab);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('allow', 'autoplay; fullscreen');
  tab.iframeEl = iframe;
  browserContent.appendChild(iframe);

  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.dataset.id = id;
  tabEl.innerHTML = `
    <span class="tab-favicon"><i data-lucide="globe"></i></span>
    <span class="tab-title">New Tab</span>
    <button class="tab-close" title="Close tab"><i data-lucide="x"></i></button>
  `;
  tab.tabEl = tabEl;
  tabsContainer.appendChild(tabEl);

  tabEl.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-close')) switchTab(id);
  });

  tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(id);
  });

  iframe.addEventListener('load', () => {
    updateTabInfo(tab);
    if (tab.id === activeTabId) {
      reloadBtn.classList.remove('loading');
    }
  });

  lucide.createIcons();

  navigate(url, tab);
  switchTab(id);
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;

  const tab = tabs[idx];
  tab.iframeEl.remove();
  tab.tabEl.remove();
  tabs.splice(idx, 1);

  if (tabs.length === 0) {
    createTab('newtab');
    return;
  }

  if (activeTabId === id) {
    const nextIdx = Math.min(idx, tabs.length - 1);
    switchTab(tabs[nextIdx].id);
  }
}

function switchTab(id) {
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  tabs.forEach(t => {
    t.tabEl.classList.remove('active');
    t.iframeEl.classList.remove('active');
  });

  tab.tabEl.classList.add('active');
  tab.iframeEl.classList.add('active');
  activeTabId = id;

  if (tab.isNew) {
    addressBar.value = '';
    addressBar.placeholder = 'Search or enter address';
    setFaviconGlobe();
  } else {
    const realUrl = getRealUrlFromEmbed(tab.embedUrl);
    addressBar.value = realUrl !== 'New Tab' ? realUrl : '';
    updateFaviconFromTab(tab);
  }
}

function navigate(url, targetTab) {
  const tab = targetTab || tabs.find(t => t.id === activeTabId);
  if (!tab) return;

  const embedUrl = buildEmbedUrl(url);
  if (!embedUrl) return;

  tab.url      = url;
  tab.embedUrl = embedUrl;
  tab.isNew    = (url === 'newtab');
  tab.title    = tab.isNew ? 'New Tab' : 'Loading...';
  tab.favicon  = null;

  const titleEl = tab.tabEl.querySelector('.tab-title');
  if (titleEl) titleEl.textContent = tab.title;

  setTabFaviconGlobe(tab);

  reloadBtn.classList.add('loading');
  tab.iframeEl.src = embedUrl;
}

function updateTabInfo(tab) {
  if (!tab) return;

  let title   = null;
  let favicon = null;

  try {
    const doc = tab.iframeEl.contentDocument;
    if (doc && doc.title) {
      title = doc.title;
    }
    const iconEl = doc && (
      doc.querySelector('link[rel="icon"]') ||
      doc.querySelector('link[rel="shortcut icon"]') ||
      doc.querySelector('link[rel*="icon"]')
    );
    if (iconEl && iconEl.href) favicon = iconEl.href;
  } catch (e) {}

  if (!title && !tab.isNew) {
    const realUrl = getRealUrlFromEmbed(tab.embedUrl);
    if (realUrl && realUrl !== 'New Tab') {
      try {
        title = new URL(realUrl).hostname.replace(/^www\./, '');
      } catch (e) {
        title = realUrl;
      }
    }
  }

  if (!title) title = tab.isNew ? 'New Tab' : 'Untitled';

  if (!favicon && !tab.isNew) {
    try {
      const realUrl = getRealUrlFromEmbed(tab.embedUrl);
      const origin = new URL(realUrl).origin;
      favicon = origin + '/favicon.ico';
    } catch (e) {}
  }

  tab.title   = title;
  tab.favicon = favicon;

  const titleEl = tab.tabEl.querySelector('.tab-title');
  if (titleEl) titleEl.textContent = title;

  if (favicon) {
    setTabFaviconImg(tab, favicon);
  } else {
    setTabFaviconGlobe(tab);
  }

  if (tab.id === activeTabId) {
    if (!tab.isNew) {
      const realUrl = getRealUrlFromEmbed(tab.embedUrl);
      addressBar.value = realUrl !== 'New Tab' ? realUrl : '';
    }
    updateFaviconFromTab(tab);
  }

  reloadBtn.classList.remove('loading');
}

function setTabFaviconGlobe(tab) {
  const faviconEl = tab.tabEl.querySelector('.tab-favicon');
  if (!faviconEl) return;
  faviconEl.innerHTML = '<i data-lucide="globe"></i>';
  lucide.createIcons({ nodes: [faviconEl] });
}

function setTabFaviconImg(tab, src) {
  const faviconEl = tab.tabEl.querySelector('.tab-favicon');
  if (!faviconEl) return;
  const img = document.createElement('img');
  img.src = src;
  img.width = 14;
  img.height = 14;
  img.onerror = () => setTabFaviconGlobe(tab);
  faviconEl.innerHTML = '';
  faviconEl.appendChild(img);
}

function setFaviconGlobe() {
  faviconDisplay.innerHTML = '<i data-lucide="globe"></i>';
  lucide.createIcons({ nodes: [faviconDisplay] });
}

function updateFaviconFromTab(tab) {
  if (!tab || tab.isNew || !tab.favicon) {
    setFaviconGlobe();
    return;
  }
  const img = document.createElement('img');
  img.src = tab.favicon;
  img.width = 14;
  img.height = 14;
  img.onerror = () => setFaviconGlobe();
  img.onload  = () => {
    faviconDisplay.innerHTML = '';
    faviconDisplay.appendChild(img);
  };
}

function getActiveTab() {
  return tabs.find(t => t.id === activeTabId) || null;
}

backBtn.addEventListener('click', () => {
  const tab = getActiveTab();
  if (!tab) return;
  try { tab.iframeEl.contentWindow.history.back(); } catch(e) {}
});

forwardBtn.addEventListener('click', () => {
  const tab = getActiveTab();
  if (!tab) return;
  try { tab.iframeEl.contentWindow.history.forward(); } catch(e) {}
});

reloadBtn.addEventListener('click', () => {
  const tab = getActiveTab();
  if (!tab) return;
  reloadBtn.classList.add('loading');
  try {
    tab.iframeEl.contentWindow.location.reload();
  } catch(e) {
    tab.iframeEl.src = tab.iframeEl.src;
  }
});

homeBtn.addEventListener('click', () => {
  const tab = getActiveTab();
  if (!tab) return;
  navigate('newtab', tab);
});

function doNavigate() {
  const val = addressBar.value.trim();
  if (!val) return;
  const tab = getActiveTab();
  if (!tab) return;
  navigate(val, tab);
  addressBar.blur();
}

addressBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doNavigate();
  if (e.key === 'Escape') {
    const tab = getActiveTab();
    if (tab) {
      addressBar.value = tab.isNew ? '' : getRealUrlFromEmbed(tab.embedUrl);
    }
    addressBar.blur();
  }
});

addressBar.addEventListener('focus', () => {
  addressBar.select();
});

goBtn.addEventListener('click', doNavigate);

newTabBtn.addEventListener('click', () => createTab('newtab'));

document.addEventListener('keydown', (e) => {
  const meta = e.ctrlKey || e.metaKey;

  if (e.key === 'Escape') {
    closeCtrlPanel();
  }

  if (meta && e.key === 'y') {
    e.preventDefault();
    if (ctrlPanelOverlay.classList.contains('open')) {
      closeCtrlPanel();
    } else {
      openCtrlPanel();
    }
  }

  if (meta && e.key === 't') {
    e.preventDefault();
    createTab('newtab');
  }

  if (meta && e.key === 'w') {
    e.preventDefault();
    if (activeTabId !== null) closeTab(activeTabId);
  }

  if (meta && e.key === 'l') {
    e.preventDefault();
    addressBar.focus();
    addressBar.select();
  }

  if (meta && e.key === 'r') {
    e.preventDefault();
    reloadBtn.click();
  }
});

// ── Theme helpers ──────────────────────────────────────
function loadSetting(key, def) {
  try { return localStorage.getItem('heavenly_settings_' + key) ?? def; } catch(e) { return def; }
}

function applyThemeVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

async function applySavedTheme() {
  const savedId = loadSetting('theme', 'dark');
  try {
    const res  = await fetch('/settings/settings.json');
    const data = await res.json();
    const theme = (data.themes || []).find(t => t.id === savedId);
    if (theme) applyThemeVars(theme.vars);
  } catch(e) {}
}

// ── Popup overlay ──────────────────────────────────────
function showStartupPopup() {
  const seen = sessionStorage.getItem('heavenly_popup_shown');
  if (seen) return;
  sessionStorage.setItem('heavenly_popup_shown', '1');

  const overlay = document.createElement('div');
  overlay.id = 'popup-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    pointer-events: none;
    display: flex; flex-direction: column;
    align-items: flex-end; justify-content: flex-end;
    padding: 24px; gap: 12px;
  `;
  document.body.appendChild(overlay);

  const msgs = [
    {
      icon: 'sparkles',
      title: 'Heavenly',
      sub: '1 of 3',
      counter: '1/3 popups remaining',
      text: 'To get to Games &amp; Settings, type <b>heavenly://games</b> or <b>heavenly://settings</b> in the address bar.',
    },
    {
      icon: 'star',
      title: 'Heavenly Premium',
      sub: '2 of 3',
      counter: '2/3 popups remaining',
      text: 'Unlock the full Heavenly experience. Visit <b>heavenly://premium</b> to purchase our premium plan.',
    },
    {
      icon: 'heart',
      title: 'Support Us',
      sub: '3 of 3',
      counter: '3/3',
      text: 'Love Heavenly? Support us on CashApp: <b>$OhheyElijah</b> 💚',
    },
  ];

  const cards = [];

  msgs.forEach((m, i) => {
    const card = document.createElement('div');
    card.style.cssText = `
      width: 300px;
      background: #202123;
      border: 1px solid #3a3a3a;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      opacity: 0;
      transform: translateY(16px) scale(0.96);
      transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1);
      pointer-events: all;
    `;
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid #2f2f2f">
        <div style="width:28px;height:28px;border-radius:50%;background:#10a37f;display:flex;align-items:center;justify-content:center;flex:0 0 28px">
          <i data-lucide="${m.icon}" style="width:14px;height:14px;color:#fff"></i>
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:#ececec;font-family:inherit">${m.title}</div>
          <div style="font-size:11px;color:#8e8ea0;font-family:inherit">${m.sub}</div>
        </div>
        <button data-close style="margin-left:auto;width:22px;height:22px;border-radius:5px;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#8e8ea0">
          <i data-lucide="x" style="width:13px;height:13px"></i>
        </button>
      </div>
      <div style="padding:14px 16px 8px;min-height:72px;display:flex;flex-direction:column;justify-content:center">
        <div class="hpopup-loader" style="display:flex;gap:5px;align-items:center;padding:4px 0">
          <div style="width:7px;height:7px;border-radius:50%;background:#8e8ea0;animation:hbounce 1.2s ease-in-out infinite 0s"></div>
          <div style="width:7px;height:7px;border-radius:50%;background:#8e8ea0;animation:hbounce 1.2s ease-in-out infinite 0.2s"></div>
          <div style="width:7px;height:7px;border-radius:50%;background:#8e8ea0;animation:hbounce 1.2s ease-in-out infinite 0.4s"></div>
        </div>
        <div class="hpopup-msg" style="font-size:13px;line-height:1.6;color:#d1d5db;display:none;font-family:inherit">${m.text}</div>
      </div>
      <div style="padding:0 16px 14px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:10px;color:#555;font-family:inherit">${m.counter}</span>
      </div>
    `;
    overlay.appendChild(card);
    cards.push(card);

    card.querySelector('[data-close]').addEventListener('click', () => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(8px) scale(0.97)';
      setTimeout(() => card.remove(), 350);
    });
  });

  // Inject animation keyframes once
  if (!document.getElementById('hpopup-style')) {
    const style = document.createElement('style');
    style.id = 'hpopup-style';
    style.textContent = `@keyframes hbounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}`;
    document.head.appendChild(style);
  }

  function revealCard(idx, delay) {
    setTimeout(() => {
      const card = cards[idx];
      if (!card) return;
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
      });
      setTimeout(() => {
        const loader = card.querySelector('.hpopup-loader');
        const msg    = card.querySelector('.hpopup-msg');
        if (loader) loader.style.display = 'none';
        if (msg) msg.style.display = 'block';
        lucide.createIcons({ nodes: [card] });
      }, 1200);
    }, delay);
  }

  lucide.createIcons({ nodes: [overlay] });

  revealCard(0, 500);
  revealCard(1, 3700);
  revealCard(2, 6900);
}

// ── Message listener ───────────────────────────────────
window.addEventListener('message', (e) => {
  if (!e.data) return;

  const { type } = e.data;

  if (type === 'navigate') {
    const tab = getActiveTab();
    if (!tab) return;
    const url = e.data.url;
    if (!url || typeof url !== 'string') return;
    // Validate: only allow safe URL schemes and Heavenly internal pages
    if (/^javascript:/i.test(url.trim())) return;
    navigate(url, tab);
    return;
  }

  if (type === 'theme' && e.data.vars) {
    applyThemeVars(e.data.vars);
    return;
  }

  if (type === 'font_size') {
    const sizes = { small: '12px', medium: '13px', large: '15px' };
    document.documentElement.style.fontSize = sizes[e.data.value] || '13px';
    return;
  }

  if (type === 'search_engine') {
    try { localStorage.setItem('heavenly_settings_engine', e.data.value); } catch(err) {}
    return;
  }

  if (type === 'clear_data') {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('heavenly_'))
        .forEach(k => localStorage.removeItem(k));
    } catch(err) {}
    return;
  }
});

// ── Drag-to-reorder tabs ───────────────────────────────
let dragSrcId = null;

tabsContainer.addEventListener('dragstart', (e) => {
  const tabEl = e.target.closest('.tab');
  if (!tabEl) return;
  dragSrcId = parseInt(tabEl.dataset.id, 10);
  e.dataTransfer.effectAllowed = 'move';
  tabEl.style.opacity = '0.5';
});

tabsContainer.addEventListener('dragend', (e) => {
  const tabEl = e.target.closest('.tab');
  if (tabEl) tabEl.style.opacity = '';
  dragSrcId = null;
});

tabsContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});

tabsContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  const targetEl = e.target.closest('.tab');
  if (!targetEl || !dragSrcId) return;
  const targetId = parseInt(targetEl.dataset.id, 10);
  if (dragSrcId === targetId) return;

  const srcIdx = tabs.findIndex(t => t.id === dragSrcId);
  const tgtIdx = tabs.findIndex(t => t.id === targetId);
  if (srcIdx === -1 || tgtIdx === -1) return;

  [tabs[srcIdx], tabs[tgtIdx]] = [tabs[tgtIdx], tabs[srcIdx]];

  const srcEl = tabs[tgtIdx].tabEl;
  const tgtEl = tabs[srcIdx].tabEl;
  tabsContainer.insertBefore(tgtEl, srcEl.nextSibling);
  tabsContainer.insertBefore(srcEl, tgtEl);
});

tabsContainer.addEventListener('mousedown', (e) => {
  const tabEl = e.target.closest('.tab');
  if (tabEl) tabEl.draggable = true;
});

tabsContainer.addEventListener('mouseup', (e) => {
  const tabEl = e.target.closest('.tab');
  if (tabEl) tabEl.draggable = false;
});

lucide.createIcons();

// ── Boot ───────────────────────────────────────────────
applySavedTheme();
createTab('newtab');
showStartupPopup();

// ── Custom cursor ──────────────────────────────────────
(function initCursor() {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mouseX = 0, mouseY = 0;
  let ringX  = 0, ringY  = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform  = `translate(calc(-50% + ${mouseX}px), calc(-50% + ${mouseY}px))`;
  }, { passive: true });

  (function animateRing() {
    const dx = mouseX - ringX;
    const dy = mouseY - ringY;
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      ringX += dx * 0.14;
      ringY += dy * 0.14;
      ring.style.transform = `translate(calc(-50% + ${ringX}px), calc(-50% + ${ringY}px))`;
    }
    requestAnimationFrame(animateRing);
  })();

  document.addEventListener('mousedown', () => document.body.classList.add('cursor-clicking'),    { passive: true });
  document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-clicking'), { passive: true });

  const hoverTargets = 'a, button, [role="button"], .tab, .nav-btn, .new-tab-btn, ' +
                       '.go-btn, .tab-close, .ctrl-panel-item, .quicklink, label, select';
  const textTargets  = 'input[type="text"], input[type="search"], textarea, [contenteditable]';

  document.addEventListener('mouseover', (e) => {
    const el = e.target;
    if (el.closest(textTargets)) {
      document.body.classList.remove('cursor-hovering');
      document.body.classList.add('cursor-text');
    } else if (el.closest(hoverTargets)) {
      document.body.classList.remove('cursor-text');
      document.body.classList.add('cursor-hovering');
    } else {
      document.body.classList.remove('cursor-hovering', 'cursor-text');
    }
  }, { passive: true });

  // Hide cursor elements when mouse leaves the browser window
  document.addEventListener('mouseout', (e) => {
    if (e.relatedTarget === null) {
      dot.style.opacity  = '0';
      ring.style.opacity = '0';
    }
  }, { passive: true });

  document.addEventListener('mouseover', (e) => {
    if (e.relatedTarget === null) {
      dot.style.opacity  = '';
      ring.style.opacity = '';
    }
  }, { passive: true });
})();
