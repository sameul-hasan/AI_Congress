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

const modules = ['cems', 'compliance', 'calibration', 'ai', 'admin'];

async function run() {
  const tabs = await getJson('http://127.0.0.1:9222/json');
  const tab = tabs.find(t => t.url && t.url.includes('8080'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let idx = 0;

  function nextModule() {
    if (idx >= modules.length) {
      console.log('All modules captured.');
      ws.close();
      process.exit(0);
      return;
    }

    const mod = modules[idx];
    console.log(`Navigating to ${mod}...`);
    ws.send(JSON.stringify({
      id: 100 + idx,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          window.location.href = 'http://localhost:8080/#${mod}';
          if (window.navigateTo) window.navigateTo('${mod}');
        `
      }
    }));

    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 200 + idx,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    }, 800);
  }

  ws.onopen = () => {
    // Navigate to index first
    ws.send(JSON.stringify({
      id: 1,
      method: 'Page.navigate',
      params: { url: 'http://localhost:8080/?unlock=1' }
    }));
    setTimeout(() => {
      nextModule();
    }, 1500);
  };

  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id >= 200 && msg.id < 300) {
      const mod = modules[idx];
      const buffer = Buffer.from(msg.result.data, 'base64');
      const filename = `C:/Users/nahid/.gemini/antigravity-ide/brain/d39e2c57-6cb9-4ebf-aa04-3e26af6138bf/.tempmediaStorage/spa_${mod}.png`;
      fs.writeFileSync(filename, buffer);
      console.log(`Saved spa_${mod}.png`);
      idx++;
      setTimeout(nextModule, 300);
    }
  };
}

run();
