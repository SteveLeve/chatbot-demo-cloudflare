import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Testing http://localhost:8787...');
  const response = await page.goto('http://localhost:8787/', { waitUntil: 'networkidle' });

  console.log(`Status: ${response.status()}`);
  console.log('Content-Type:', response.headers()['content-type']);

  const content = await page.content();
  console.log('\n=== Page HTML (first 500 chars) ===');
  console.log(content.substring(0, 500));

  const bodyText = await page.locator('body').textContent();
  console.log('\n=== Body Text ===');
  console.log(bodyText ? bodyText.substring(0, 300) : 'No body text');

  await browser.close();
})();
