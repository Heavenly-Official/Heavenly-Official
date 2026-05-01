'use strict';

const MODELS = [
  { id: 'heavenly',  name: 'Heavenly AI',     provider: 'Built-in',    pollinationsId: 'openai' },
  { id: 'gpt4o',     name: 'GPT-4o',          provider: 'OpenAI',      pollinationsId: 'openai' },
  { id: 'gemini',    name: 'Gemini Pro',       provider: 'Google',      pollinationsId: 'openai' },
  { id: 'claude',    name: 'Claude 3.5',       provider: 'Anthropic',   pollinationsId: 'openai-large' },
  { id: 'llama',     name: 'Llama 3',          provider: 'Meta',        pollinationsId: 'llama' },
  { id: 'mistral',   name: 'Mistral Large',    provider: 'Mistral AI',  pollinationsId: 'mistral' },
];

const STARTER_PROMPTS = [
  'What can you help me with?',
  'Write a short poem',
  'Explain quantum computing',
  'Help me brainstorm ideas',
];

const MAX_CONVERSATIONS = 40;

let conversations = [];
let activeConvId   = null;
let isStreaming     = false;

// Screenshare state
let screenStream    = null;
let pendingScreenshot = null; // base64 data URL captured on send

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

// Screenshare elements
const screenshareBtn     = document.getElementById('screenshare-btn');
const screensharePreview = document.getElementById('screenshare-preview');
const screenshareVideo   = document.getElementById('screenshare-video');
const screenshareStopBtn = document.getElementById('screenshare-stop-btn');

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

// ── Screenshare ───────────────────────────────────────
function startScreenshare() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    alert('Screen sharing is not supported in this browser.');
    return;
  }
  navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    .then(stream => {
      screenStream = stream;
      screenshareVideo.srcObject = stream;
      screensharePreview.classList.add('visible');
      screenshareBtn.classList.add('active');
      stream.getVideoTracks()[0].addEventListener('ended', stopScreenshare);
    })
    .catch(() => {});
}

function stopScreenshare() {
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
  }
  screenshareVideo.srcObject = null;
  screensharePreview.classList.remove('visible');
  screenshareBtn.classList.remove('active');
  pendingScreenshot = null;
}

function captureScreenFrame() {
  if (!screenStream) return null;
  const video = screenshareVideo;
  const canvas = document.createElement('canvas');
  canvas.width  = video.videoWidth  || 1280;
  canvas.height = video.videoHeight || 720;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

screenshareBtn.addEventListener('click', () => {
  if (screenStream) { stopScreenshare(); } else { startScreenshare(); }
});
screenshareStopBtn.addEventListener('click', stopScreenshare);

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
  saveJSON('conversations', conversations.slice(0, MAX_CONVERSATIONS));
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
    conv.messages.forEach(m => appendMessageDOM(m.role, m.content, m.screenshot || null, false));
    scrollToBottom();
  }
}

function showWelcome() {
  messagesInner.innerHTML = '';
  welcomeScreen.style.display = 'flex';
  messagesInner.parentElement.style.display = 'none';
}

// ── Render messages ───────────────────────────────────
function appendMessageDOM(role, content, screenshot, scroll) {
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

  if (screenshot) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'msg-screenshot';
    const img = document.createElement('img');
    img.src = screenshot;
    img.alt = 'Screenshot';
    imgWrap.appendChild(img);
    contentEl.appendChild(imgWrap);
  }

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

  // Capture screenshot if screensharing
  const screenshot = screenStream ? captureScreenFrame() : null;

  conv.messages.push({ role: 'user', content: text, screenshot: screenshot || undefined });
  saveConversations();
  appendMessageDOM('user', text, screenshot, true);

  chatTextarea.value = '';
  autoResize();
  sendBtn.disabled = true;
  isStreaming = true;

  showTypingIndicator();

  try {
    const reply = await fetchAI(conv.messages, load('model', 'heavenly'));
    removeTypingIndicator();
    conv.messages.push({ role: 'ai', content: reply });
    saveConversations();
    appendMessageDOM('ai', reply, null, true);
  } catch(err) {
    removeTypingIndicator();
    const errMsg = 'Sorry, I couldn\'t reach the AI right now. Please try again.';
    appendMessageDOM('ai', errMsg, null, true);
  }

  isStreaming = false;
  sendBtn.disabled = false;
  chatTextarea.focus();
}

async function fetchAI(messages, modelId) {
  const m = MODELS.find(x => x.id === modelId) || MODELS[0];
  const pollinationsModel = m.pollinationsId;

  // Check if the latest user message has a screenshot
  const lastMsg = messages[messages.length - 1];
  const hasImage = lastMsg && lastMsg.role === 'user' && lastMsg.screenshot;

  if (hasImage) {
    // Use the Pollinations chat completions API (supports vision)
    const apiMessages = messages.slice(-6).map(msg => {
      if (msg.role === 'user' && msg.screenshot) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: msg.screenshot } }
          ]
        };
      }
      return { role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content };
    });

    const response = await fetch('https://api.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: apiMessages }),
      signal: AbortSignal.timeout(40000)
    });
    if (!response.ok) throw new Error('API error ' + response.status);
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  // Text-only: use simple text endpoint
  const history = messages.slice(-6).map(msg =>
    (msg.role === 'user' ? 'User: ' : 'Assistant: ') + msg.content
  ).join('\n');

  const seed = Math.floor(Math.random() * 1000000);
  const url = `https://text.pollinations.ai/${encodeURIComponent(history)}?model=${pollinationsModel}&seed=${seed}&json=false`;
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
