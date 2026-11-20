import http from 'http';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  } );
}

async function inspectBrowser() {
  try {
    const tabs = await getJson('http://127.0.0.1:9222/json');
    const tab = tabs.find(t => t.url && t.url.includes('8080'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      // Reload page
      setTimeout(() => {
        ws.send(JSON.stringify({ id: 3, method: 'Page.reload' }));
      }, 500);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION THROWN:', JSON.stringify(msg.params.exceptionDetails, null, 2));
      } else if (msg.method === 'Console.messageAdded') {
        console.log('CONSOLE LOG:', msg.params.message.level, msg.params.message.text);
      }
    };

    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 4000);
  } catch (err) {
    console.error('CDP error:', err.message);
  }
}

inspectBrowser();
