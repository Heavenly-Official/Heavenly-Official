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

function buildEmbedUrl(input) {
  input = input.trim();
  if (!input) return null;

  if (input === 'newtab') return '/newtab.html';

  if (/^https?:\/\//i.test(input)) {
    return '/active/embed.html?url=' + encodeURIComponent(input);
  }

  if (/^[^\s]+\.[^\s]+$/.test(input) && !input.includes(' ')) {
    return '/active/embed.html?url=' + encodeURIComponent('https://' + input);
  }

  const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(input);
  return '/active/embed.html?url=' + encodeURIComponent(searchUrl);
}

function getRealUrlFromEmbed(embedSrc) {
  if (!embedSrc) return '';
  if (embedSrc === '/newtab.html') return 'New Tab';
  try {
    const url = new URL(embedSrc, window.location.origin);
    const encoded = url.searchParams.get('url');
    return encoded ? decodeURIComponent(encoded) : embedSrc;
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

window.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'navigate') return;
  const tab = getActiveTab();
  if (!tab) return;
  const url = e.data.url;
  if (!url) return;
  navigate(url, tab);
});

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

createTab('newtab');
