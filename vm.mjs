import { chromium } from 'playwright';
const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
const p = b.contexts()[0].pages()[0];
await p.mouse.click(960, 500);
await p.waitForTimeout(4000);
await p.screenshot({ path: '/tmp/vm0.png' });
console.log('ok', p.url());
