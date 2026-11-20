import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  await page.goto('http://localhost:8080/index.html?unlock=1#dashboard', { waitUntil: 'networkidle2' });

  await new Promise(r => setTimeout(r, 1000));

  const wrapperHtml = await page.evaluate(() => {
    const pw = document.getElementById('pageWrapper');
    return {
      childrenCount: pw ? pw.children.length : -1,
      innerHTMLSnippet: pw ? pw.innerHTML.substring(0, 300) : null,
      bodyClass: document.body.className
    };
  });
  console.log('PAGE WRAPPER STATE:', wrapperHtml);

  // Take dark mode screenshot
  await page.screenshot({ path: 'scratch/test_dark.png', fullPage: false });
  console.log('Saved scratch/test_dark.png');

  // Click theme toggle
  await page.click('#btnThemeToggle');
  await new Promise(r => setTimeout(r, 500));

  const afterClick = await page.evaluate(() => {
    return {
      bodyClass: document.body.className,
      themeInStorage: localStorage.getItem('climatesphere_theme')
    };
  });
  console.log('AFTER CLICK:', afterClick);

  // Take light mode screenshot
  await page.screenshot({ path: 'scratch/test_light.png', fullPage: false });
  console.log('Saved scratch/test_light.png');

  await browser.close();
})();
