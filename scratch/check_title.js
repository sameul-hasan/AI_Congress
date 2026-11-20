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

async function checkTitle() {
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
          return JSON.stringify({
            innerText: el.innerText,
            innerHTML: el.innerHTML,
            computedColor: window.getComputedStyle(el).color,
            computedOpacity: window.getComputedStyle(el).opacity,
            computedFontFamily: window.getComputedStyle(el).fontFamily,
            computedFontSize: window.getComputedStyle(el).fontSize,
            parentOpacity: window.getComputedStyle(el.parentElement).opacity
          });
        })()`
      }
    }));
  };
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id === 1) {
      console.log('HERO TITLE DETAILS:', msg.result.result.value);
      ws.close();
      process.exit(0);
    }
  };
}

checkTitle();
