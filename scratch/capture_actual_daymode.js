import http from 'http';
import fs from 'fs';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function captureDay() {
  const tabs = await getJson('http://127.0.0.1:9222/json');
  const tab = tabs.find(t => t.url && t.url.includes('8080'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  ws.onopen = () => {
    // Unlock terminal and toggle Day Mode
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          sessionStorage.removeItem('cs_terminal_locked');
          if (typeof unlockTerminal === 'function') unlockTerminal();
          if (window.navigateTo) window.navigateTo('dashboard');
          const btn = document.getElementById('btnThemeToggle');
          if (btn && !document.body.classList.contains('theme-light')) btn.click();
        `
      }
    }));

    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 2,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    }, 1200);
  };

  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id === 2 && msg.result && msg.result.data) {
      const buffer = Buffer.from(msg.result.data, 'base64');
      fs.writeFileSync('C:/Users/nahid/.gemini/antigravity-ide/brain/d39e2c57-6cb9-4ebf-aa04-3e26af6138bf/.tempmediaStorage/spa_actual_daymode.png', buffer);
      console.log('Saved spa_actual_daymode.png');

      // Click again to return to night mode
      ws.send(JSON.stringify({
        id: 3,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            const btn = document.getElementById('btnThemeToggle');
            if (btn && document.body.classList.contains('theme-light')) btn.click();
          `
        }
      }));
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 300);
    }
  };
}

captureDay();
