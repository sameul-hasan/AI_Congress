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

async function captureScroll() {
  const tabs = await getJson('http://127.0.0.1:9222/json');
  const tab = tabs.find(t => t.url && t.url.includes('8080'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.onopen = () => {
    // Scroll to showcase section
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          window.scrollTo(0, 1100);
        `
      }
    }));
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 2,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    }, 800);
  };
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id === 2 && msg.result && msg.result.data) {
      const buffer = Buffer.from(msg.result.data, 'base64');
      fs.writeFileSync('C:/Users/nahid/.gemini/antigravity-ide/brain/d39e2c57-6cb9-4ebf-aa04-3e26af6138bf/.tempmediaStorage/landing_section2.png', buffer);
      console.log('Saved landing_section2.png');
      ws.close();
      process.exit(0);
    }
  };
}

captureScroll();
