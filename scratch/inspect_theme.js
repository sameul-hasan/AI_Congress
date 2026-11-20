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

async function inspectTheme() {
  const tabs = await getJson('http://127.0.0.1:9222/json');
  const tab = tabs.find(t => t.url && t.url.includes('8080'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `JSON.stringify({
          url: location.href,
          bodyClass: document.body.className,
          savedTheme: localStorage.getItem('climatesphere_theme'),
          btnExists: !!document.getElementById('btnThemeToggle'),
          btnText: document.getElementById('btnThemeToggle') ? document.getElementById('btnThemeToggle').innerText : null
        })`
      }
    }));
  };

  ws.onmessage = e => {
    console.log('THEME INSPECT:', JSON.parse(e.data).result.result.value);
    ws.close();
    process.exit(0);
  };
}

inspectTheme();
