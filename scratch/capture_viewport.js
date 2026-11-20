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

async function captureViewport() {
  const tabs = await getJson('http://127.0.0.1:9222/json');
  const tab = tabs.find(t => t.url && t.url.includes('8080'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Emulation.setDeviceMetricsOverride',
      params: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        mobile: false
      }
    }));
    
    // Force preloader dismiss immediately if still waiting
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            const p = document.getElementById('preloader');
            if (p) p.classList.add('loaded');
            if (typeof triggerHeroEntrance === 'function') triggerHeroEntrance();
            const targets = ['#heroEyebrow', '#heroTitle', '#heroDesc', '#heroCtas', '#heroTrust', '.hfc-card'];
            if (typeof gsap !== 'undefined') gsap.set(targets, { opacity: 1, y: 0, scale: 1 });
          `
        }
      }));
    }, 1500);

    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 3,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    }, 2500);
  };
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id === 3 && msg.result && msg.result.data) {
      const buffer = Buffer.from(msg.result.data, 'base64');
      fs.writeFileSync('C:/Users/nahid/.gemini/antigravity-ide/brain/d39e2c57-6cb9-4ebf-aa04-3e26af6138bf/.tempmediaStorage/landing_1080p.png', buffer);
      console.log('Saved landing_1080p.png');
      ws.close();
      process.exit(0);
    }
  };
}

captureViewport();
