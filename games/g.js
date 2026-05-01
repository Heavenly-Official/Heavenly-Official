const GAMES = [
  { name: '2048',          icon: 'grid-2x2',      tag: 'Puzzle',     url: 'https://play2048.co/' },
  { name: 'Chess',         icon: 'crown',         tag: 'Strategy',   url: 'https://www.chess.com/play/online' },
  { name: 'Wordle',        icon: 'square-pen',    tag: 'Word',       url: 'https://www.nytimes.com/games/wordle/index.html' },
  { name: 'Snake',         icon: 'move-diagonal', tag: 'Arcade',     url: 'https://playsnake.org/' },
  { name: 'Tetris',        icon: 'layout-grid',   tag: 'Arcade',     url: 'https://tetris.com/play-tetris' },
  { name: 'Minesweeper',   icon: 'bomb',          tag: 'Puzzle',     url: 'https://minesweeper.online/' },
  { name: 'Sudoku',        icon: 'hash',          tag: 'Puzzle',     url: 'https://sudoku.com/' },
  { name: 'Pac-Man',       icon: 'circle',        tag: 'Arcade',     url: 'https://www.google.com/logos/2010/pacman10-i.html' },
  { name: 'Flappy Bird',   icon: 'bird',          tag: 'Arcade',     url: 'https://flappybird.io/' },
  { name: 'Geometry Dash', icon: 'triangle',      tag: 'Platformer', url: 'https://www.geometrydash.io/game' },
  { name: 'Slope',         icon: 'trending-down', tag: 'Action',     url: 'https://slope-game.github.io/' },
  { name: 'Drift Boss',    icon: 'car',           tag: 'Racing',     url: 'https://driftboss.io/' },
];

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

render(GAMES);

document.getElementById('search').addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  render(q ? GAMES.filter(g =>
    g.name.toLowerCase().includes(q) || g.tag.toLowerCase().includes(q)
  ) : GAMES);
});
