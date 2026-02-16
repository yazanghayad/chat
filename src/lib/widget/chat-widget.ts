/**
 * Embeddable Chat Widget — Standalone vanilla JS + inline CSS
 *
 * Usage:
 *   <script
 *     src="https://your-domain.com/widget/chat-widget.js"
 *     data-api-key="tenant-api-key"
 *     data-api-url="https://your-domain.com"
 *     data-title="Support"
 *     data-color="#6366f1"
 *     data-position="right"
 *   ></script>
 *
 * The script renders a floating bubble and an expandable chat panel.
 * It communicates via the /api/chat/stream endpoint using SSE.
 */
(function () {
  'use strict';

  // ── Read configuration from script tag ─────────────────────────────────
  const scriptTag = document.currentScript as HTMLScriptElement;
  const API_KEY = scriptTag?.getAttribute('data-api-key') ?? '';
  const API_URL = (
    scriptTag?.getAttribute('data-api-url') ?? window.location.origin
  ).replace(/\/$/, '');
  const TITLE = scriptTag?.getAttribute('data-title') ?? 'Chat with us';
  const COLOR = scriptTag?.getAttribute('data-color') ?? '#6366f1';
  const POSITION = scriptTag?.getAttribute('data-position') ?? 'right'; // 'left' | 'right'

  if (!API_KEY) {
    console.warn('[ChatWidget] Missing data-api-key attribute');
    return;
  }

  // ── Types ──────────────────────────────────────────────────────────────
  interface Message {
    role: 'user' | 'assistant';
    content: string;
  }

  // ── State ──────────────────────────────────────────────────────────────
  let open = false;
  let conversationId: string | null = null;
  let messages: Message[] = [];
  let streaming = false;
  let userId = getOrCreateUserId();

  function getOrCreateUserId(): string {
    const key = '__chat_widget_uid';
    let uid = localStorage.getItem(key);
    if (!uid) {
      uid = 'anon_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(key, uid);
    }
    return uid;
  }

  // ── Inject styles ─────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cw-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }

    #cw-bubble {
      position: fixed; bottom: 20px; ${POSITION}: 20px;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${COLOR}; color: #fff; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99999;
      transition: transform 0.2s;
    }
    #cw-bubble:hover { transform: scale(1.08); }
    #cw-bubble svg { width: 24px; height: 24px; fill: #fff; }

    #cw-panel {
      position: fixed; bottom: 88px; ${POSITION}: 20px;
      width: 380px; max-width: calc(100vw - 40px);
      height: 520px; max-height: calc(100vh - 108px);
      border-radius: 12px; background: #fff;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      display: none; flex-direction: column;
      z-index: 99999; overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    #cw-panel.open { display: flex; }

    #cw-header {
      background: ${COLOR}; color: #fff;
      padding: 14px 16px; font-weight: 600; font-size: 15px;
      display: flex; align-items: center; justify-content: space-between;
    }
    #cw-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 4px; line-height: 1; }

    #cw-messages {
      flex: 1; overflow-y: auto; padding: 12px; display: flex;
      flex-direction: column; gap: 8px;
    }

    .cw-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.45; word-break: break-word; }
    .cw-msg.user { align-self: flex-end; background: ${COLOR}; color: #fff; border-bottom-right-radius: 4px; }
    .cw-msg.assistant { align-self: flex-start; background: #f3f4f6; color: #111; border-bottom-left-radius: 4px; }
    .cw-msg.assistant.streaming::after { content: '▋'; animation: cw-blink 1s infinite; }

    @keyframes cw-blink { 50% { opacity: 0; } }

    .cw-empty { text-align: center; color: #9ca3af; font-size: 13px; margin-top: 40px; }

    #cw-input-area {
      border-top: 1px solid #e5e7eb; padding: 10px 12px;
      display: flex; gap: 8px; align-items: center;
    }
    #cw-input {
      flex: 1; border: 1px solid #d1d5db; border-radius: 8px;
      padding: 8px 12px; font-size: 14px; outline: none;
      resize: none; min-height: 38px; max-height: 100px;
      line-height: 1.4;
    }
    #cw-input:focus { border-color: ${COLOR}; box-shadow: 0 0 0 2px ${COLOR}22; }
    #cw-send {
      width: 38px; height: 38px; border-radius: 8px;
      background: ${COLOR}; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #cw-send:disabled { opacity: 0.5; cursor: default; }
    #cw-send svg { width: 18px; height: 18px; fill: #fff; }

    #cw-powered { text-align: center; font-size: 10px; color: #9ca3af; padding: 4px; }
  `;
  document.head.appendChild(style);

  // ── Build DOM ─────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'cw-root';
  root.innerHTML = `
    <button id="cw-bubble" aria-label="Open chat">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
    </button>
    <div id="cw-panel">
      <div id="cw-header">
        <span>${TITLE}</span>
        <button id="cw-close">&times;</button>
      </div>
      <div id="cw-messages">
        <div class="cw-empty">Send a message to get started</div>
      </div>
      <div id="cw-input-area">
        <textarea id="cw-input" rows="1" placeholder="Type a message…"></textarea>
        <button id="cw-send" aria-label="Send" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div id="cw-powered">Powered by Fin.ai</div>
    </div>
  `;
  document.body.appendChild(root);

  // ── Element refs ──────────────────────────────────────────────────────
  const bubble = document.getElementById('cw-bubble')!;
  const panel = document.getElementById('cw-panel')!;
  const closeBtn = document.getElementById('cw-close')!;
  const msgContainer = document.getElementById('cw-messages')!;
  const input = document.getElementById('cw-input') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('cw-send') as HTMLButtonElement;

  // ── Event handlers ────────────────────────────────────────────────────
  bubble.addEventListener('click', () => toggle());
  closeBtn.addEventListener('click', () => toggle());

  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim() || streaming;
    // Auto-resize
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  sendBtn.addEventListener('click', () => send());

  // ── Core functions ────────────────────────────────────────────────────
  function toggle() {
    open = !open;
    panel.classList.toggle('open', open);
    if (open) input.focus();
  }

  function render() {
    if (messages.length === 0) {
      msgContainer.innerHTML =
        '<div class="cw-empty">Send a message to get started</div>';
      return;
    }
    msgContainer.innerHTML = messages
      .map(
        (m, i) =>
          `<div class="cw-msg ${m.role}${i === messages.length - 1 && m.role === 'assistant' && streaming ? ' streaming' : ''}">${escapeHtml(m.content)}</div>`
      )
      .join('');
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  async function send() {
    const text = input.value.trim();
    if (!text || streaming) return;

    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    streaming = true;

    messages.push({ role: 'user', content: text });
    messages.push({ role: 'assistant', content: '' });
    render();

    try {
      const res = await fetch(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          message: text,
          conversationId,
          userId,
          channel: 'web'
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        messages[messages.length - 1].content =
          err.error ?? 'Something went wrong.';
        streaming = false;
        render();
        return;
      }

      // Parse SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;

          try {
            const data = JSON.parse(raw);

            if (data.type === 'delta') {
              messages[messages.length - 1].content += data.content;
              render();
            } else if (data.type === 'done') {
              conversationId = data.conversationId ?? conversationId;
            } else if (data.type === 'escalated') {
              messages[messages.length - 1].content =
                data.message ??
                "I've connected you with a human agent. They'll be in touch shortly.";
              conversationId = data.conversationId ?? conversationId;
            } else if (data.type === 'blocked') {
              messages[messages.length - 1].content =
                data.message ?? 'That request was blocked by our policies.';
            } else if (data.type === 'error') {
              messages[messages.length - 1].content =
                data.message ?? 'An error occurred. Please try again.';
            }
          } catch {
            /* ignore malformed SSE lines */
          }
        }
      }
    } catch (err) {
      messages[messages.length - 1].content =
        'Unable to connect. Please check your internet and try again.';
    } finally {
      streaming = false;
      render();
      sendBtn.disabled = false;
    }
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
