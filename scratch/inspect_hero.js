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

async function inspectHero() {
  const tabs = await getJson('http://127.0.0.1:9222/json');
  const tab = tabs.find(t => t.url && t.url.includes('8080'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const el = document.getElementById('heroTitle');
          const rect = el ? el.getBoundingClientRect() : null;
          const cs = el ? window.getComputedStyle(el) : null;
          const pre = document.getElementById('preloader');
          return JSON.stringify({
            preloaderClass: pre ? pre.className : null,
            preloaderDisplay: pre ? window.getComputedStyle(pre).display : null,
            found: !!el,
            rect,
            opacity: cs ? cs.opacity : null,
            visibility: cs ? cs.visibility : null,
            display: cs ? cs.display : null,
            color: cs ? cs.color : null
          });
        })()`
      }
    }));
  };
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id === 1) {
      console.log('HERO STATE:', msg.result.result.value);
      ws.close();
      process.exit(0);
    }
  };
}

inspectHero();
