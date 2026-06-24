const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

const history = [];

function addMessage(role, text) {
  const div = document.createElement('div');
  div.classList.add('message', role);
  div.textContent = text;
  messagesEl.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

async function handleSend() {
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage('user', text);
  history.push({ role: 'user', content: text });
  inputEl.value = '';
  inputEl.focus();
  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });

    const data = await res.json();

    if (data.error) {
      addMessage('assistant', 'Error: ' + data.error);
    } else {
      addMessage('assistant', data.content);
      history.push({ role: 'assistant', content: data.content });
    }
  } catch {
    addMessage('assistant', 'Could not reach the server.');
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', handleSend);

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
