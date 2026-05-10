const FALLBACK_GAMES = [
  { name: '2048', icon: 'grid-2x2', tag: 'Puzzle', url: 'https://play2048.co/' },
  { name: 'Chess', icon: 'crown', tag: 'Strategy', url: 'https://www.chess.com/play/online' },
  { name: 'Wordle', icon: 'square-pen', tag: 'Word', url: 'https://www.nytimes.com/games/wordle/index.html' },
];

const jsonUrl = 'https://cdn.jsdelivr.net/gh/sea-bean-unblocked/for-a-friedn-@main/1.json';
const source1URL = 'https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Folder-1@main/';
const source2URL = 'https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Folder-2@main/';
const source3URL = 'https://cdn.jsdelivr.net/gh/sea-bean-unblocked/Folder-3@main';

let games = [];

function navigate(url) {
  try { window.parent.postMessage({ type: 'navigate', url }, '*'); } catch(e) {}
}

function render(list) {
  const grid = document.getElementById('games-grid');
  if (!list.length) {
    grid.innerHTML = '<div class="empty">No games found.</div>';
    return;
  }
  grid.innerHTML = '';
  list.forEach(g => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <div class="game-icon"><i data-lucide="${g.icon}"></i></div>
      <div class="game-name">${g.name}</div>
      <div class="game-tag">${g.tag}</div>
    `;
    card.addEventListener('click', () => navigate(g.url));
    grid.appendChild(card);
  });
  lucide.createIcons();
}

document.getElementById('search').addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  render(q ? games.filter(g =>
    g.name.toLowerCase().includes(q) || g.tag.toLowerCase().includes(q)
  ) : games);
});

function normalizeGame(game) {
  const normalizedURL = resolveGameURL(game);
  return {
    name: game?.name || 'Untitled Game',
    icon: game?.icon || 'gamepad-2',
    tag: game?.tag || 'Hydra',
    url: normalizedURL,
  };
}

function normalizeBaseURL(url) {
  if (!url) return '';
  return url.endsWith('/') ? url : `${url}/`;
}

function pickSourceURL(game) {
  const bases = [source1URL, source2URL, source3URL].map(normalizeBaseURL);
  const sourceValue = game?.source ?? game?.folder ?? game?.sourceIndex ?? game?.src;

  if (sourceValue === 1 || sourceValue === '1' || sourceValue === 'source1') return bases[0];
  if (sourceValue === 2 || sourceValue === '2' || sourceValue === 'source2') return bases[1];
  if (sourceValue === 3 || sourceValue === '3' || sourceValue === 'source3') return bases[2];

  return bases[0];
}

function resolveGameURL(game) {
  const raw = (game?.url || game?.path || game?.file || game?.href || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = pickSourceURL(game);
  return `${base}${raw.replace(/^\/+/, '')}`;
}

function flattenCatalog(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  if (Array.isArray(data.games)) return data.games;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;

  const all = [];
  Object.entries(data).forEach(([key, value]) => {
    if (!Array.isArray(value)) return;
    let inferredSource;
    if (key.includes('3')) inferredSource = 3;
    else if (key.includes('2')) inferredSource = 2;
    else if (key.includes('1')) inferredSource = 1;
    value.forEach(item => {
      if (item && typeof item === 'object' && inferredSource && item.source == null) {
        all.push({ ...item, source: inferredSource });
      } else {
        all.push(item);
      }
    });
  });
  return all;
}

async function loadGames() {
  const grid = document.getElementById('games-grid');
  grid.innerHTML = '<div class="empty">Loading games…</div>';

  try {
    const res = await fetch(jsonUrl);
    if (!res.ok) throw new Error('Failed to load remote catalog');

    const data = await res.json();
    const parsed = flattenCatalog(data);
    if (!parsed.length) throw new Error('Remote catalog is empty');

    games = parsed.map(normalizeGame).filter(g => g.url);
    render(games);
  } catch (e) {
    try {
      const localRes = await fetch('hydra-games.json');
      if (!localRes.ok) throw new Error('Failed to load local Hydra catalog');
      const localData = await localRes.json();
      const parsedLocal = flattenCatalog(localData);
      games = parsedLocal.map(normalizeGame).filter(g => g.url);
      if (!games.length) throw new Error('Local Hydra catalog is empty');
      render(games);
      return;
    } catch (_) {
      games = FALLBACK_GAMES;
      render(games);
    }
  }
}

loadGames();
