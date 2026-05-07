const FALLBACK_GAMES = [
  { name: '2048', icon: 'grid-2x2', tag: 'Puzzle', url: 'https://play2048.co/' },
  { name: 'Chess', icon: 'crown', tag: 'Strategy', url: 'https://www.chess.com/play/online' },
  { name: 'Wordle', icon: 'square-pen', tag: 'Word', url: 'https://www.nytimes.com/games/wordle/index.html' },
];

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
  return {
    name: (game && game.name) ? game.name : 'Untitled Game',
    icon: (game && game.icon) ? game.icon : 'gamepad-2',
    tag: (game && game.tag) ? game.tag : 'Hydra',
    url: game && game.url ? game.url : '',
  };
}

async function loadGames() {
  const grid = document.getElementById('games-grid');
  grid.innerHTML = '<div class="empty">Loading games…</div>';

  try {
    const res = await fetch('hydra-games.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load Hydra catalog');

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Hydra catalog is empty');

    games = data.map(normalizeGame).filter(g => g.url);
    render(games);
  } catch (e) {
    games = FALLBACK_GAMES;
    render(games);
  }
}

loadGames();
