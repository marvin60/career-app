const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingEl = document.getElementById('typing-indicator');
const restartBtn = document.getElementById('restart-btn');
const reflectBtn = document.getElementById('reflect-btn');
const promptsEl = document.getElementById('prompts');

(async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const user = await res.json();
    document.getElementById('user-name').textContent = user.name;
    const photo = document.getElementById('user-photo');
    if (user.photo) { photo.src = user.photo; photo.style.display = 'block'; }
  } catch {
    window.location.href = '/login';
  }
})();

const history = [];
const STORAGE_KEY = 'career_chat_history';

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

function addMessage(role, text) {
  const div = document.createElement('div');
  div.classList.add('message', role);
  div.textContent = text;
  messagesEl.insertBefore(div, typingEl);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function splitIntoBubbles(text) {
  if (text.length <= 200) return [text];

  const paras = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  if (paras.length >= 2) {
    return paras.length <= 3 ? paras : mergeInto(paras, 3);
  }

  const sentences = text.replace(/([.!?])\s+/g, '$1\x00').split('\x00').filter(Boolean);
  if (sentences.length < 3) return [text];
  return mergeInto(sentences, 3);
}

function mergeInto(parts, n) {
  const result = [];
  const size = Math.ceil(parts.length / n);
  for (let i = 0; i < n; i++) {
    const chunk = parts.slice(i * size, (i + 1) * size).join(' ').trim();
    if (chunk) result.push(chunk);
  }
  return result;
}

async function showBubbles(bubbles) {
  addMessage('assistant', bubbles[0]);
  for (let i = 1; i < bubbles.length; i++) {
    await delay(300);
    showTyping();
    await delay(700);
    hideTyping();
    addMessage('assistant', bubbles[i]);
  }
}

function showTyping() {
  typingEl.classList.add('visible');
  typingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function hideTyping() {
  typingEl.classList.remove('visible');
}

async function handleSend() {
  const text = inputEl.value.trim();
  if (!text) return;

  promptsEl.style.display = 'none';
  addMessage('user', text);
  history.push({ role: 'user', content: text });
  inputEl.value = '';
  inputEl.focus();
  sendBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });

    const data = await res.json();
    hideTyping();

    if (data.error) {
      addMessage('assistant', 'Error: ' + data.error);
    } else {
      await showBubbles(splitIntoBubbles(data.content));
      history.push({ role: 'assistant', content: data.content });
      saveHistory();
    }
  } catch {
    hideTyping();
    addMessage('assistant', 'Could not reach the server.');
  } finally {
    sendBtn.disabled = false;
    restartBtn.classList.add('visible');
    if (history.length >= 4) {
      reflectBtn.classList.add('visible');
    }
  }
}

async function handleReflect() {
  if (history.length < 4) return;

  reflectBtn.disabled = true;
  showTyping();

  try {
    const res = await fetch('/api/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });

    const data = await res.json();
    hideTyping();

    const card = document.createElement('div');
    card.classList.add('reflection-card');
    const label = document.createElement('div');
    label.classList.add('reflection-label');
    label.textContent = 'What I noticed';
    card.appendChild(label);
    const body = document.createElement('div');
    body.textContent = data.error ? 'Could not generate reflection.' : data.content;
    card.appendChild(body);
    messagesEl.insertBefore(card, typingEl);
    card.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } catch {
    hideTyping();
  } finally {
    reflectBtn.disabled = false;
  }
}

restartBtn.addEventListener('click', () => {
  history.length = 0;
  clearHistory();
  messagesEl.querySelectorAll('.message, .reflection-card').forEach(m => m.remove());
  hideTyping();
  restartBtn.classList.remove('visible');
  reflectBtn.classList.remove('visible');
  promptsEl.style.display = 'flex';
  inputEl.value = '';
  inputEl.focus();
});

reflectBtn.addEventListener('click', handleReflect);

(function restoreSession() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  let parsed;
  try { parsed = JSON.parse(saved); } catch { return; }
  if (!Array.isArray(parsed) || parsed.length === 0) return;

  parsed.forEach(msg => {
    history.push(msg);
    addMessage(msg.role, msg.content);
  });

  promptsEl.style.display = 'none';
  restartBtn.classList.add('visible');
  if (history.length >= 4) reflectBtn.classList.add('visible');
})();

sendBtn.addEventListener('click', handleSend);

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
