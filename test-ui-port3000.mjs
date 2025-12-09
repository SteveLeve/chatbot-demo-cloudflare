import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Testing http://localhost:3000...');
  try {
    const response = await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    console.log(`Status: ${response.status()}`);
    console.log('Content-Type:', response.headers()['content-type']);

    const content = await page.content();
    console.log('\n=== Page HTML (first 800 chars) ===');
    console.log(content.substring(0, 800));

    const title = await page.title();
    console.log('\n=== Page Title ===');
    console.log(title);

    const hasRoot = await page.evaluate(() => !!document.getElementById('root'));
    console.log('\n=== Has #root element ===');
    console.log(hasRoot);

    const bodyText = await page.locator('body').textContent();
    console.log('\n=== Body Content Summary ===');
    console.log(bodyText ? bodyText.substring(0, 500) : 'No body text');

  } catch (err) {
    console.error('Error:', err.message);
  }

  await browser.close();
})();
