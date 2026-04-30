'use strict';

const MODELS = [
  { id: 'heavenly',  name: 'Heavenly AI',     provider: 'Built-in',    endpoint: 'pollinations' },
  { id: 'gpt4o',     name: 'GPT-4o',          provider: 'OpenAI',      endpoint: 'pollinations' },
  { id: 'gemini',    name: 'Gemini Pro',       provider: 'Google',      endpoint: 'pollinations' },
  { id: 'claude',    name: 'Claude 3.5',       provider: 'Anthropic',   endpoint: 'pollinations' },
  { id: 'llama',     name: 'Llama 3',          provider: 'Meta',        endpoint: 'pollinations' },
  { id: 'mistral',   name: 'Mistral Large',    provider: 'Mistral AI',  endpoint: 'pollinations' },
];

const STARTER_PROMPTS = [
  'What can you help me with?',
  'Write a short poem',
  'Explain quantum computing',
  'Help me brainstorm ideas',
];

let conversations = [];
let activeConvId   = null;
let isStreaming     = false;

function load(key, def) {
  try { return localStorage.getItem('heavenly_ai_' + key) ?? def; } catch(e) { return def; }
}
function save(key, val) {
  try { localStorage.setItem('heavenly_ai_' + key, val); } catch(e) {}
}
function loadJSON(key, def) {
  try { return JSON.parse(localStorage.getItem('heavenly_ai_' + key)) ?? def; } catch(e) { return def; }
}
function saveJSON(key, val) {
  try { localStorage.setItem('heavenly_ai_' + key, JSON.stringify(val)); } catch(e) {}
}

// ── Init DOM ──────────────────────────────────────────
const historyList   = document.getElementById('history-list');
const modelSelector = document.getElementById('model-selector');
const messagesInner = document.getElementById('messages-inner');
const welcomeScreen = document.getElementById('welcome-screen');
const chatTextarea  = document.getElementById('chat-textarea');
const sendBtn       = document.getElementById('send-btn');
const settingsPanel = document.getElementById('settings-panel');
const chatModelName = document.getElementById('chat-model-name');

// ── Model selector ────────────────────────────────────
MODELS.forEach(m => {
  const opt = document.createElement('option');
  opt.value = m.id;
  opt.textContent = m.name;
  modelSelector.appendChild(opt);
});
modelSelector.value = load('model', 'heavenly');
modelSelector.addEventListener('change', () => {
  save('model', modelSelector.value);
  updateModelHeader();
});

function updateModelHeader() {
  const m = MODELS.find(x => x.id === modelSelector.value) || MODELS[0];
  if (chatModelName) chatModelName.textContent = m.name + ' · ' + m.provider;
}
updateModelHeader();

// ── Settings panel ────────────────────────────────────
function buildModelCards() {
  const container = document.getElementById('model-cards');
  if (!container) return;
  container.innerHTML = '';
  const selected = load('model', 'heavenly');
  MODELS.forEach(m => {
    const card = document.createElement('div');
    card.className = 'model-card' + (m.id === selected ? ' selected' : '');
    card.dataset.id = m.id;
    card.innerHTML = `
      <div class="model-radio"><div class="model-radio-dot"></div></div>
      <div>
        <div class="model-name">${m.name}</div>
        <div class="model-provider">${m.provider}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      container.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      save('model', m.id);
      modelSelector.value = m.id;
      updateModelHeader();
    });
    container.appendChild(card);
  });
}
buildModelCards();

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
  });
}
setupToggle('toggle-stream', 'stream', 'on');
setupToggle('toggle-safe',   'safe',   'on');

const langSel = document.getElementById('lang-select');
if (langSel) {
  langSel.value = load('lang', 'en');
  langSel.addEventListener('change', () => save('lang', langSel.value));
}

document.getElementById('settings-btn').addEventListener('click', () => {
  settingsPanel.classList.toggle('open');
});
document.getElementById('close-settings').addEventListener('click', () => {
  settingsPanel.classList.remove('open');
});

// ── Conversations ─────────────────────────────────────
function loadConversations() {
  conversations = loadJSON('conversations', []);
}
function saveConversations() {
  saveJSON('conversations', conversations.slice(0, 40));
}

function newConversation() {
  const conv = { id: Date.now(), title: 'New Chat', messages: [] };
  conversations.unshift(conv);
  activeConvId = conv.id;
  saveConversations();
  renderHistory();
  showWelcome();
  return conv;
}

function getActiveConv() {
  return conversations.find(c => c.id === activeConvId) || null;
}

function renderHistory() {
  historyList.innerHTML = '';
  conversations.forEach(conv => {
    const div = document.createElement('div');
    div.className = 'history-item' + (conv.id === activeConvId ? ' active' : '');
    div.textContent = conv.title;
    div.addEventListener('click', () => loadConversation(conv.id));
    historyList.appendChild(div);
  });
}

function loadConversation(id) {
  activeConvId = id;
  const conv = getActiveConv();
  if (!conv) return;
  renderHistory();
  messagesInner.innerHTML = '';
  welcomeScreen.style.display = 'none';
  messagesInner.parentElement.style.display = '';
  if (conv.messages.length === 0) {
    showWelcome();
  } else {
    conv.messages.forEach(m => appendMessageDOM(m.role, m.content, false));
    scrollToBottom();
  }
}

function showWelcome() {
  messagesInner.innerHTML = '';
  welcomeScreen.style.display = 'flex';
  messagesInner.parentElement.style.display = 'none';
}

// ── Render messages ───────────────────────────────────
function appendMessageDOM(role, content, scroll = true) {
  welcomeScreen.style.display = 'none';
  messagesInner.parentElement.style.display = '';

  const div = document.createElement('div');
  div.className = 'message ' + role;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  if (role === 'user') {
    avatar.innerHTML = '<i data-lucide="user"></i>';
  } else {
    avatar.innerHTML = '<i data-lucide="sparkles"></i>';
  }

  const contentEl = document.createElement('div');
  contentEl.className = 'msg-content';
  contentEl.innerHTML = formatContent(content);

  div.appendChild(avatar);
  div.appendChild(contentEl);
  messagesInner.appendChild(div);

  lucide.createIcons({ nodes: [avatar] });
  if (scroll) scrollToBottom();
  return contentEl;
}

function showTypingIndicator() {
  welcomeScreen.style.display = 'none';
  messagesInner.parentElement.style.display = '';

  const div = document.createElement('div');
  div.className = 'message ai';
  div.id = 'typing-indicator';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.innerHTML = '<i data-lucide="sparkles"></i>';

  const indicator = document.createElement('div');
  indicator.className = 'msg-content';
  indicator.innerHTML = `<div class="typing-indicator">
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  </div>`;

  div.appendChild(avatar);
  div.appendChild(indicator);
  messagesInner.appendChild(div);
  lucide.createIcons({ nodes: [avatar] });
  scrollToBottom();
  return div;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

function formatContent(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function scrollToBottom() {
  const area = document.getElementById('messages-area');
  if (area) area.scrollTop = area.scrollHeight;
}

// ── Send message ──────────────────────────────────────
async function sendMessage(text) {
  text = text.trim();
  if (!text || isStreaming) return;

  let conv = getActiveConv();
  if (!conv) conv = newConversation();

  if (conv.messages.length === 0) {
    conv.title = text.length > 36 ? text.slice(0, 36) + '…' : text;
    renderHistory();
  }

  conv.messages.push({ role: 'user', content: text });
  saveConversations();
  appendMessageDOM('user', text);

  chatTextarea.value = '';
  autoResize();
  sendBtn.disabled = true;
  isStreaming = true;

  const typingEl = showTypingIndicator();

  try {
    const reply = await fetchAI(conv.messages, load('model', 'heavenly'));
    removeTypingIndicator();
    conv.messages.push({ role: 'ai', content: reply });
    saveConversations();
    appendMessageDOM('ai', reply);
  } catch(err) {
    removeTypingIndicator();
    const errMsg = 'Sorry, I couldn\'t reach the AI right now. Please try again.';
    appendMessageDOM('ai', errMsg);
  }

  isStreaming = false;
  sendBtn.disabled = false;
  chatTextarea.focus();
}

async function fetchAI(messages, modelId) {
  const lastMsg = messages[messages.length - 1].content;
  const history = messages.slice(-6).map(m =>
    (m.role === 'user' ? 'User: ' : 'Assistant: ') + m.content
  ).join('\n');

  const prompt = encodeURIComponent(history);
  const pollinationsModel = {
    heavenly: 'openai',
    gpt4o:    'openai',
    gemini:   'openai',
    claude:   'openai-large',
    llama:    'llama',
    mistral:  'mistral',
  }[modelId] || 'openai';

  const url = `https://text.pollinations.ai/${prompt}?model=${pollinationsModel}&seed=42&json=false`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('API error ' + response.status);
  return (await response.text()).trim();
}

// ── Input handling ────────────────────────────────────
function autoResize() {
  chatTextarea.style.height = 'auto';
  chatTextarea.style.height = Math.min(chatTextarea.scrollHeight, 180) + 'px';
}

chatTextarea.addEventListener('input', autoResize);

chatTextarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatTextarea.value);
  }
});

sendBtn.addEventListener('click', () => sendMessage(chatTextarea.value));

// ── Starter prompts ───────────────────────────────────
const promptsContainer = document.getElementById('welcome-prompts');
STARTER_PROMPTS.forEach(p => {
  const btn = document.createElement('button');
  btn.className = 'prompt-chip';
  btn.textContent = p;
  btn.addEventListener('click', () => {
    chatTextarea.value = p;
    sendMessage(p);
  });
  promptsContainer.appendChild(btn);
});

// ── New chat button ───────────────────────────────────
document.getElementById('new-chat-btn').addEventListener('click', () => {
  newConversation();
  renderHistory();
});

// ── Init ──────────────────────────────────────────────
loadConversations();
if (conversations.length === 0) {
  newConversation();
} else {
  activeConvId = conversations[0].id;
  loadConversation(activeConvId);
}
renderHistory();
