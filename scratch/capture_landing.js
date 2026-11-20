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

async function captureLanding() {
  try {
    const tabs = await getJson('http://127.0.0.1:9222/json');
    let tab = tabs.find(t => t.url && t.url.includes('8080'));
    if (!tab) {
      console.log('No tab found for 8080');
      process.exit(1);
    }
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 3500);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 2 && msg.result && msg.result.data) {
        const buffer = Buffer.from(msg.result.data, 'base64');
        const artifactPath = 'C:/Users/nahid/.gemini/antigravity-ide/brain/d39e2c57-6cb9-4ebf-aa04-3e26af6138bf/.tempmediaStorage/landing_screen.png';
        fs.writeFileSync(artifactPath, buffer);
        console.log('Landing screenshot saved to', artifactPath);
        ws.close();
        process.exit(0);
      }
    };
  } catch (err) {
    console.error('Capture error:', err.message);
  }
}

captureLanding();
