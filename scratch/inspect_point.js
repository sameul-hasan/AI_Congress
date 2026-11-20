import http from 'http';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function inspectPoint() {
  const tabs = await getJson('http://127.0.0.1:9222/json');
  const tab = tabs.find(t => t.url && t.url.includes('8080'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const el = document.elementFromPoint(350, 300);
          const webglCanvas = document.getElementById('webgl-canvas');
          const heroCanvas = document.getElementById('hero-canvas');
          const hero3DStage = document.getElementById('hero3DStage');
          const heroTitle = document.getElementById('heroTitle');
          return JSON.stringify({
            topElement: el ? { tag: el.tagName, id: el.id, class: el.className } : null,
            heroTitleZIndex: window.getComputedStyle(heroTitle).zIndex,
            heroTextColZIndex: window.getComputedStyle(heroTitle.parentElement).zIndex,
            webglCanvas: webglCanvas ? {
              zIndex: window.getComputedStyle(webglCanvas).zIndex,
              position: window.getComputedStyle(webglCanvas).position,
              pointerEvents: window.getComputedStyle(webglCanvas).pointerEvents
            } : null,
            bodyChildren: Array.from(document.body.children).slice(0, 10).map(c => ({
              tag: c.tagName,
              id: c.id,
              class: c.className,
              zIndex: window.getComputedStyle(c).zIndex,
              position: window.getComputedStyle(c).position
            }))
          });
        })()`
      }
    }));
  };
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id === 1) {
      console.log('POINT INSPECTION:', JSON.stringify(JSON.parse(msg.result.result.value), null, 2));
      ws.close();
      process.exit(0);
    }
  };
}

inspectPoint();
