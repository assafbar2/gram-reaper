import { GOOGLE_CLIENT_ID, isAuthConfigured } from './auth.js'

// Standalone sign-in page served to unauthenticated visitors instead of the app
// bundle, so a stranger never receives the SPA, its routes, or its asset graph.
// Self-contained: no imports from dist/, only Google's own GSI script.
export function renderLoginPage(): string {
  if (!isAuthConfigured()) {
    return page(`
      <h1>Not configured</h1>
      <p class="msg">This deployment is missing its sign-in configuration.
      Set <code>GOOGLE_CLIENT_ID</code>, <code>ALLOWED_EMAILS</code>, and
      <code>SESSION_SECRET</code>, then redeploy.</p>
    `)
  }

  return page(`
    <h1>Gram Reaper</h1>
    <p class="tag">Harvest your daily protein.</p>
    <div id="sign-in">
      <div id="g_id_onload"
           data-client_id="${escapeAttr(GOOGLE_CLIENT_ID)}"
           data-callback="onCredential"
           data-auto_prompt="false"></div>
      <div class="g_id_signin"
           data-type="standard"
           data-theme="filled_black"
           data-text="signin_with"
           data-shape="pill"
           data-size="large"></div>
    </div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <script>
      function onCredential(response) {
        var msg = document.getElementById('msg');
        msg.textContent = 'Signing in…';
        fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ credential: response.credential })
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (r.ok) { window.location.reload(); return; }
            msg.textContent = j.error || 'Sign-in failed.';
          });
        }).catch(function () {
          msg.textContent = 'Network error. Try again.';
        });
      }
    </script>
  `)
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function page(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Gram Reaper — Sign in</title>
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
  .tag { margin: 0 0 1.5rem; color: #2D1F00; font-size: 0.875rem; font-weight: 500; }
  .msg { margin: 0.5rem 0 0; min-height: 1.25rem; color: #2D1F00; font-size: 0.8125rem; font-weight: 500; }
  code {
    font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;
    background: #E8AF00; padding: 0.1rem 0.3rem; border-radius: 0.25rem;
  }
  #sign-in { min-height: 44px; }
</style>
</head>
<body>
${body}
</body>
</html>
`
}
