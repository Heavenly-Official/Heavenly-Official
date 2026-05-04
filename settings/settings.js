'use strict';

let THEMES = [];

function load(key, def) {
  try { return localStorage.getItem('heavenly_settings_' + key) ?? def; } catch(e) { return def; }
}
function save(key, val) {
  try { localStorage.setItem('heavenly_settings_' + key, val); } catch(e) {}
}
function navigate(url) {
  try { window.parent.postMessage({ type: 'navigate', url }, '*'); } catch(e) {}
}

// ── Theme application ──────────────────────────────────
function applyThemeVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  // Broadcast to parent (browser chrome)
  try {
    window.parent.postMessage({ type: 'theme', vars }, '*');
  } catch(e) {}
}

function applyThemeById(id) {
  const theme = THEMES.find(t => t.id === id);
  if (theme) applyThemeVars(theme.vars);
}

// ── Load themes from settings.json ────────────────────
async function loadThemes() {
  try {
    const res = await fetch('settings.json');
    const data = await res.json();
    THEMES = data.themes || [];
  } catch(e) {
    THEMES = [];
  }
  buildThemeGrid();
  applyThemeById(load('theme', 'dark'));
}

function buildThemeGrid() {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const current = load('theme', 'dark');
  THEMES.forEach(theme => {
    const swatch = document.createElement('div');
    swatch.className = 'theme-swatch' + (theme.id === current ? ' selected' : '');
    swatch.dataset.id = theme.id;
    const v = theme.vars;
    swatch.style.background = v['--bg'] || '#0a0a0a';
    swatch.style.color = v['--text'] || '#e8e8e8';
    swatch.innerHTML = `
      <div class="swatch-bars">
        <div class="swatch-bar" style="background:${v['--accent'] || '#fff'}"></div>
        <div class="swatch-bar" style="background:${v['--border'] || '#2a2a2a'}"></div>
        <div class="swatch-bar" style="background:${v['--subtext'] || '#666'}"></div>
      </div>
      <div class="theme-swatch-name">${theme.name}</div>
    `;
    swatch.addEventListener('click', () => {
      grid.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      save('theme', theme.id);
      applyThemeVars(theme.vars);
      // Also update theme-select if present
      const sel = document.getElementById('theme-select');
      if (sel) sel.value = theme.id;
    });
    grid.appendChild(swatch);
  });

  // Populate theme select dropdown too
  const sel = document.getElementById('theme-select');
  if (sel) {
    sel.innerHTML = '';
    THEMES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      sel.appendChild(opt);
    });
    sel.value = load('theme', 'dark');
    sel.addEventListener('change', () => {
      save('theme', sel.value);
      applyThemeById(sel.value);
      grid.querySelectorAll('.theme-swatch').forEach(s =>
        s.classList.toggle('selected', s.dataset && s.dataset.id === sel.value)
      );
    });
  }
}

// ── Toggle helper ──────────────────────────────────────
function setupToggle(id, key, def) {
  const btn = document.getElementById(id);
  if (!btn) return;
  let state = load(key, def) === 'on';
  if (state) btn.classList.add('on');
  btn.setAttribute('aria-pressed', String(state));
  btn.addEventListener('click', () => {
    state = !state;
    btn.classList.toggle('on', state);
    btn.setAttribute('aria-pressed', String(state));
    save(key, state ? 'on' : 'off');
    updatePrivacyStatus();
  });
}

function updatePrivacyStatus() {
  const trackerDot = document.getElementById('tracker-status-dot');
  const dntDot     = document.getElementById('dnt-status-dot');
  if (trackerDot) trackerDot.className = 'status-dot' + (load('block_trackers', 'on') === 'on' ? '' : ' off');
  if (dntDot)     dntDot.className     = 'status-dot' + (load('dnt', 'off') === 'on' ? '' : ' off');
}

// ── Sections ───────────────────────────────────────────
const SECTIONS = [
  {
    id: 'general',
    label: 'General',
    icon: 'clock',
    render() {
      return `
        <div class="section-title">General</div>
        <div class="group">
          <div class="group-label">On Startup</div>
          <div class="setting-row">
            <div><div class="setting-label">Open page</div></div>
            <select class="select-input" id="startup-page">
              <option value="newtab">New Tab</option>
              <option value="heavenly://games">Games</option>
            </select>
          </div>
        </div>
        <div class="group">
          <div class="group-label">Search</div>
          <div class="setting-row">
            <div><div class="setting-label">Default search engine</div></div>
            <select class="select-input" id="search-engine">
              <option value="https://duckduckgo.com/?q=">DuckDuckGo</option>
              <option value="https://www.google.com/search?q=">Google</option>
              <option value="https://www.bing.com/search?q=">Bing</option>
              <option value="https://search.brave.com/search?q=">Brave</option>
            </select>
          </div>
        </div>
        <div class="group">
          <div class="group-label">Downloads</div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Ask where to save</div>
              <div class="setting-sub">Prompt for download location each time</div>
            </div>
            <button class="toggle" id="toggle-ask-download" aria-pressed="false"></button>
          </div>
        </div>
      `;
    },
    init() {
      const startupSel = document.getElementById('startup-page');
      startupSel.value = load('startup', 'newtab');
      startupSel.addEventListener('change', () => save('startup', startupSel.value));

      const engineSel = document.getElementById('search-engine');
      engineSel.value = load('engine', 'https://duckduckgo.com/?q=');
      engineSel.addEventListener('change', () => {
        save('engine', engineSel.value);
        try { window.parent.postMessage({ type: 'search_engine', value: engineSel.value }, '*'); } catch(e) {}
      });

      setupToggle('toggle-ask-download', 'ask_download', 'off');
    }
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: 'palette',
    render() {
      return `
        <div class="section-title">Appearance</div>
        <div class="group">
          <div class="group-label">Theme</div>
          <div class="setting-row" style="flex-direction:column;align-items:flex-start;gap:12px">
            <div><div class="setting-label">Color theme</div><div class="setting-sub">Changes the entire browser appearance</div></div>
            <select class="select-input" id="theme-select" style="min-width:180px"></select>
          </div>
          <div class="theme-grid" id="theme-grid" style="margin-top:12px"></div>
        </div>
        <div class="group">
          <div class="group-label">Display</div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Show tab favicons</div>
              <div class="setting-sub">Display website icons in tabs</div>
            </div>
            <button class="toggle" id="toggle-favicons" aria-pressed="true"></button>
          </div>
          <div class="setting-row">
            <div><div class="setting-label">UI font size</div></div>
            <select class="select-input" id="font-size">
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      `;
    },
    init() {
      loadThemes();
      setupToggle('toggle-favicons', 'favicons', 'on');
      const fontSel = document.getElementById('font-size');
      fontSel.value = load('font_size', 'medium');
      fontSel.addEventListener('change', () => {
        save('font_size', fontSel.value);
        const sizes = { small: '12px', medium: '13px', large: '15px' };
        document.documentElement.style.fontSize = sizes[fontSel.value] || '13px';
        try { window.parent.postMessage({ type: 'font_size', value: fontSel.value }, '*'); } catch(e) {}
      });
    }
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: 'shield',
    render() {
      return `
        <div class="section-title">Privacy &amp; Security</div>
        <div class="group">
          <div class="group-label">Tracking Protection</div>
          <div class="setting-row">
            <div>
              <div class="setting-label"><span id="tracker-status-dot" class="status-dot"></span>Block trackers</div>
              <div class="setting-sub">Prevent cross-site tracking requests</div>
            </div>
            <button class="toggle" id="toggle-tracker" aria-pressed="true"></button>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label"><span id="dnt-status-dot" class="status-dot off"></span>Do Not Track</div>
              <div class="setting-sub">Send DNT header to websites</div>
            </div>
            <button class="toggle" id="toggle-dnt" aria-pressed="false"></button>
          </div>
        </div>
        <div class="group">
          <div class="group-label">Cookies</div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Block third-party cookies</div>
              <div class="setting-sub">Prevent tracking cookies from other sites</div>
            </div>
            <button class="toggle" id="toggle-3p-cookies" aria-pressed="true"></button>
          </div>
        </div>
        <div class="group">
          <div class="group-label">Browsing Data</div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Clear browsing data</div>
              <div class="setting-sub">Remove cookies, cache &amp; history</div>
            </div>
            <button class="btn-danger" id="btn-clear">Clear Data</button>
          </div>
          <div class="setting-row">
            <div>
              <div class="setting-label">Clear on exit</div>
              <div class="setting-sub">Automatically clear data when browser closes</div>
            </div>
            <button class="toggle" id="toggle-clear-exit" aria-pressed="false"></button>
          </div>
        </div>
      `;
    },
    init() {
      setupToggle('toggle-tracker',    'block_trackers', 'on');
      setupToggle('toggle-dnt',        'dnt',            'off');
      setupToggle('toggle-3p-cookies', 'block_3p',       'on');
      setupToggle('toggle-clear-exit', 'clear_exit',     'off');
      updatePrivacyStatus();

      document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('Clear all Heavenly browsing data? This cannot be undone.')) {
          try {
            Object.keys(localStorage)
              .filter(k => k.startsWith('heavenly_'))
              .forEach(k => localStorage.removeItem(k));
          } catch(e) {}
          try { window.parent.postMessage({ type: 'clear_data' }, '*'); } catch(e) {}
          alert('Browsing data cleared.');
          // Re-apply default theme after clear
          applyThemeById('dark');
        }
      });
    }
  },
  {
    id: 'about',
    label: 'About',
    icon: 'info',
    render() {
      return `
        <div class="section-title">About</div>
        <div class="about-block">
          <div class="about-title">Heavenly</div>
          <div class="about-ver">Version 1.0.0 · heavenly-official.github.io</div>
          <div class="about-links">
            <button class="about-link" id="link-github">GitHub</button>
            <button class="about-link" id="link-newtab">New Tab</button>
            <button class="about-link" id="link-games">Games</button>
            <button class="about-link" id="link-premium">Premium</button>
          </div>
        </div>
      `;
    },
    init() {
      document.getElementById('link-github').addEventListener('click', () => navigate('https://github.com/Heavenly-Official/heavenly-official.github.io'));
      document.getElementById('link-newtab').addEventListener('click', () => navigate('newtab'));
      document.getElementById('link-games').addEventListener('click', () => navigate('heavenly://games'));
      document.getElementById('link-premium').addEventListener('click', () => navigate('heavenly://premium'));
    }
  }
];

// ── Build sidebar & panels ─────────────────────────────
const sidebar = document.getElementById('sidebar');
const panel   = document.getElementById('panel');

SECTIONS.forEach((s, i) => {
  const btn = document.createElement('button');
  btn.className = 'nav-item' + (i === 0 ? ' active' : '');
  btn.dataset.id = s.id;
  btn.innerHTML = `<i data-lucide="${s.icon}"></i>${s.label}`;
  btn.addEventListener('click', () => showSection(s.id));
  sidebar.appendChild(btn);
});

SECTIONS.forEach((s, i) => {
  const div = document.createElement('div');
  div.className = 'section' + (i === 0 ? ' active' : '');
  div.id = 'section-' + s.id;
  div.innerHTML = s.render();
  panel.appendChild(div);
});

SECTIONS.forEach(s => s.init());

function showSection(id) {
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const sec = document.getElementById('section-' + id);
  if (sec) sec.classList.add('active');
  const navBtn = sidebar.querySelector(`[data-id="${id}"]`);
  if (navBtn) navBtn.classList.add('active');
}

lucide.createIcons();
