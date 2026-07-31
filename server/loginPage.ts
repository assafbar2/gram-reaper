import { accessCodeLength, isAuthConfigured } from './auth.js'

// Standalone sign-in page served to unauthenticated visitors instead of the app
// bundle, so a stranger never receives the SPA, its routes, or its asset graph.
// Self-contained — no imports from dist/.
export function renderLoginPage(): string {
  if (!isAuthConfigured()) {
    return page(`
      <h1>Not configured</h1>
      <p class="msg">This deployment is missing its access code. Set
      <code>APP_ACCESS_CODE</code> and <code>SESSION_SECRET</code>, then redeploy.</p>
    `)
  }

  const len = accessCodeLength()

  return page(`
    <h1>Gram Reaper</h1>
    <p class="tag">Enter your access code</p>
    <form id="f" autocomplete="off" novalidate>
      <input id="code" inputmode="numeric" autocomplete="one-time-code"
             maxlength="${len}" aria-label="Access code" spellcheck="false">
      <button type="submit" id="go">Unlock</button>
    </form>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <script>
      var f = document.getElementById('f');
      var input = document.getElementById('code');
      var go = document.getElementById('go');
      var msg = document.getElementById('msg');
      var expected = ${len};
      input.focus();

      input.addEventListener('input', function () {
        // Digits only, and auto-submit once the expected length is reached.
        input.value = input.value.replace(/\\D/g, '').slice(0, expected);
        msg.textContent = '';
        if (input.value.length === expected) f.requestSubmit();
      });

      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!input.value) return;
        go.disabled = true;
        msg.textContent = 'Checking…';
        fetch('/api/auth/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ code: input.value })
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (r.ok) { window.location.reload(); return; }
            msg.textContent = j.error || 'Incorrect code.';
            input.value = '';
            go.disabled = false;
            input.focus();
          });
        }).catch(function () {
          msg.textContent = 'Network error. Try again.';
          go.disabled = false;
        });
      });
    </script>
  `)
}

function page(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Gram Reaper — Locked</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100dvh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.75rem; padding: 2rem 1.5rem;
    background: #F5C518; color: #000;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    font-weight: 600; text-align: center;
  }
  h1 { margin: 0; font-size: 1.75rem; letter-spacing: -0.02em; }
  .tag { margin: 0 0 1.25rem; color: #2D1F00; font-size: 0.875rem; font-weight: 500; }
  form { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; max-width: 15rem; }
  input {
    font-family: 'JetBrains Mono', monospace; font-size: 1.75rem; font-weight: 600;
    letter-spacing: 0.5em; text-indent: 0.5em; text-align: center;
    padding: 0.75rem 0.5rem; width: 100%;
    border: 2px solid #1A1400; border-radius: 0.75rem;
    background: #E8AF00; color: #000; outline-offset: 3px;
  }
  button {
    font-family: inherit; font-size: 0.9375rem; font-weight: 600;
    padding: 0.75rem 1rem; width: 100%;
    border: 0; border-radius: 0.75rem;
    background: #1A1400; color: #F5C518; cursor: pointer;
  }
  button:disabled { opacity: 0.6; cursor: default; }
  .msg { margin: 0.5rem 0 0; min-height: 1.25rem; color: #2D1F00; font-size: 0.8125rem; font-weight: 500; }
  code {
    font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;
    background: #E8AF00; padding: 0.1rem 0.3rem; border-radius: 0.25rem;
  }
</style>
</head>
<body>
${body}
</body>
</html>
`
}
