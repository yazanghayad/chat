'use strict';
(() => {
  (function () {
    'use strict';
    let s = document.currentScript,
      x = s?.getAttribute('data-api-key') ?? '',
      T = (s?.getAttribute('data-api-url') ?? window.location.origin).replace(
        /\/$/,
        ''
      ),
      L = s?.getAttribute('data-title') ?? 'Chat with us',
      a = s?.getAttribute('data-color') ?? '#6366f1',
      m = s?.getAttribute('data-position') ?? 'right';
    if (!x) {
      console.warn('[ChatWidget] Missing data-api-key attribute');
      return;
    }
    let d = !1,
      c = null,
      e = [],
      r = !1,
      $ = z();
    function z() {
      let t = '__chat_widget_uid',
        n = localStorage.getItem(t);
      return (
        n ||
          ((n = 'anon_' + Math.random().toString(36).slice(2, 10)),
          localStorage.setItem(t, n)),
        n
      );
    }
    let w = document.createElement('style');
    (w.textContent = `
    #cw-root * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }

    #cw-bubble {
      position: fixed; bottom: 20px; ${m}: 20px;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${a}; color: #fff; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99999;
      transition: transform 0.2s;
    }
    #cw-bubble:hover { transform: scale(1.08); }
    #cw-bubble svg { width: 24px; height: 24px; fill: #fff; }

    #cw-panel {
      position: fixed; bottom: 88px; ${m}: 20px;
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
      background: ${a}; color: #fff;
      padding: 14px 16px; font-weight: 600; font-size: 15px;
      display: flex; align-items: center; justify-content: space-between;
    }
    #cw-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 4px; line-height: 1; }

    #cw-messages {
      flex: 1; overflow-y: auto; padding: 12px; display: flex;
      flex-direction: column; gap: 8px;
    }

    .cw-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.45; word-break: break-word; }
    .cw-msg.user { align-self: flex-end; background: ${a}; color: #fff; border-bottom-right-radius: 4px; }
    .cw-msg.assistant { align-self: flex-start; background: #f3f4f6; color: #111; border-bottom-left-radius: 4px; }
    .cw-msg.assistant.streaming::after { content: '\u258B'; animation: cw-blink 1s infinite; }

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
    #cw-input:focus { border-color: ${a}; box-shadow: 0 0 0 2px ${a}22; }
    #cw-send {
      width: 38px; height: 38px; border-radius: 8px;
      background: ${a}; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #cw-send:disabled { opacity: 0.5; cursor: default; }
    #cw-send svg { width: 18px; height: 18px; fill: #fff; }

    #cw-powered { text-align: center; font-size: 10px; color: #9ca3af; padding: 4px; }
  `),
      document.head.appendChild(w);
    let u = document.createElement('div');
    (u.id = 'cw-root'),
      (u.innerHTML = `
    <button id="cw-bubble" aria-label="Open chat">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
    </button>
    <div id="cw-panel">
      <div id="cw-header">
        <span>${L}</span>
        <button id="cw-close">&times;</button>
      </div>
      <div id="cw-messages">
        <div class="cw-empty">Send a message to get started</div>
      </div>
      <div id="cw-input-area">
        <textarea id="cw-input" rows="1" placeholder="Type a message\u2026"></textarea>
        <button id="cw-send" aria-label="Send" disabled>
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div id="cw-powered">Powered by Fin.ai</div>
    </div>
  `),
      document.body.appendChild(u);
    let M = document.getElementById('cw-bubble'),
      S = document.getElementById('cw-panel'),
      B = document.getElementById('cw-close'),
      l = document.getElementById('cw-messages'),
      o = document.getElementById('cw-input'),
      p = document.getElementById('cw-send');
    M.addEventListener('click', () => y()),
      B.addEventListener('click', () => y()),
      o.addEventListener('input', () => {
        (p.disabled = !o.value.trim() || r),
          (o.style.height = 'auto'),
          (o.style.height = Math.min(o.scrollHeight, 100) + 'px');
      }),
      o.addEventListener('keydown', (t) => {
        t.key === 'Enter' && !t.shiftKey && (t.preventDefault(), v());
      }),
      p.addEventListener('click', () => v());
    function y() {
      (d = !d), S.classList.toggle('open', d), d && o.focus();
    }
    function g() {
      if (e.length === 0) {
        l.innerHTML =
          '<div class="cw-empty">Send a message to get started</div>';
        return;
      }
      (l.innerHTML = e
        .map(
          (t, n) =>
            `<div class="cw-msg ${t.role}${n === e.length - 1 && t.role === 'assistant' && r ? ' streaming' : ''}">${H(t.content)}</div>`
        )
        .join('')),
        (l.scrollTop = l.scrollHeight);
    }
    async function v() {
      let t = o.value.trim();
      if (!(!t || r)) {
        (o.value = ''),
          (o.style.height = 'auto'),
          (p.disabled = !0),
          (r = !0),
          e.push({ role: 'user', content: t }),
          e.push({ role: 'assistant', content: '' }),
          g();
        try {
          let n = await fetch(`${T}/api/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${x}`
            },
            body: JSON.stringify({
              message: t,
              conversationId: c,
              userId: $,
              channel: 'web'
            })
          });
          if (!n.ok) {
            let h = await n.json().catch(() => ({ error: 'Request failed' }));
            (e[e.length - 1].content = h.error ?? 'Something went wrong.'),
              (r = !1),
              g();
            return;
          }
          let k = n.body?.getReader(),
            A = new TextDecoder(),
            f = '';
          if (!k) throw new Error('No response body');
          for (;;) {
            let { done: h, value: O } = await k.read();
            if (h) break;
            f += A.decode(O, { stream: !0 });
            let E = f.split(`
`);
            f = E.pop() ?? '';
            for (let I of E) {
              if (!I.startsWith('data: ')) continue;
              let b = I.slice(6).trim();
              if (!(!b || b === '[DONE]'))
                try {
                  let i = JSON.parse(b);
                  i.type === 'delta'
                    ? ((e[e.length - 1].content += i.content), g())
                    : i.type === 'done'
                      ? (c = i.conversationId ?? c)
                      : i.type === 'escalated'
                        ? ((e[e.length - 1].content =
                            i.message ??
                            "I've connected you with a human agent. They'll be in touch shortly."),
                          (c = i.conversationId ?? c))
                        : i.type === 'blocked'
                          ? (e[e.length - 1].content =
                              i.message ??
                              'That request was blocked by our policies.')
                          : i.type === 'error' &&
                            (e[e.length - 1].content =
                              i.message ??
                              'An error occurred. Please try again.');
                } catch {}
            }
          }
        } catch {
          e[e.length - 1].content =
            'Unable to connect. Please check your internet and try again.';
        } finally {
          (r = !1), g(), (p.disabled = !1);
        }
      }
    }
    function H(t) {
      return t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  })();
})();
