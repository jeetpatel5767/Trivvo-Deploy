// Captures every screen of the live Trivvo app at phone size, for use in the promo video.
//
//   node capture-screens.mjs <out-dir> [usdc|prefix|chip]
//
// usdc   -> the app exactly as deployed
// prefix -> amounts shown as ₹150 (default; see inr-swap.js)
// chip   -> amounts shown as 150 [INR]
//
// Deep links 404 on the Vercel deploy (no SPA rewrite), so this loads "/" once and moves
// between screens client-side. Needs Playwright; in the cloud box it is preinstalled globally.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const BASE = 'https://trivvo-deploy.vercel.app';
const OUT = process.argv[2];
const MODE = process.argv[3] || 'prefix';
const HERE = path.dirname(fileURLToPath(import.meta.url));

const ROUTES = [
  ['01-login', '/login'],
  ['02-hunts', '/hunts'],
  ['03-hunt-detail', '/hunt/demo-1'],
  ['04-map', '/map/demo-1'],
  ['05-scan', '/scan'],
  ['06-arrival-reward', '/arrival-reward'],
  ['07-tasks', '/tasks/demo-1'],
  ['08-reward-confirm', '/reward-confirm'],
  ['09-profile', '/profile'],
  ['10-vendor-dashboard', '/vendor/dashboard'],
  ['11-vendor-create-hunt', '/vendor/create-hunt'],
  ['12-vendor-qr', '/vendor/qr/demo-1'],
  ['13-vendor-fund', '/vendor/fund/demo-1'],
  ['14-vendor-hunt-manage', '/vendor/hunt-manage/demo-1'],
  ['15-vendor-participants', '/vendor/participants/demo-1'],
  ['16-vendor-verify-task', '/vendor/verify-task'],
  ['17-vendor-analytics', '/vendor/analytics'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3, // 1170 x 2532, an iPhone-size frame
  isMobile: true,
  hasTouch: true,
});
if (MODE !== 'usdc') {
  await ctx.addInitScript(`window.__INR_STYLE = '${MODE}';`);
  await ctx.addInitScript({ path: path.join(HERE, 'inr-swap.js') });
}
const page = await ctx.newPage();

const go = (p) =>
  page.evaluate((p) => {
    history.pushState({}, '', p);
    dispatchEvent(new PopStateEvent('popstate'));
  }, p);

// The proxy in the cloud box sometimes drops a request; retry rather than give up.
async function shot(file, opts = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      return await page.screenshot({ path: file, timeout: 15000, ...opts });
    } catch (e) {
      console.log('retry', file, e.message.split('\n')[0]);
    }
  }
}

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await shot(`${OUT}/00-splash.png`);
await page.waitForTimeout(2200);

for (const [name, route] of ROUTES) {
  await go(route);
  await page.waitForTimeout(2200); // lets the reward count-up settle
  await shot(`${OUT}/${name}.png`);
  await shot(`${OUT}/${name}-full.png`, { fullPage: true });
  console.log(name);

  // Chapter 02 of the storyboard needs the checklist mid-way, so tick each task in turn.
  if (route.startsWith('/tasks/')) {
    const tasks = ['Find the hidden menu board', 'Order a special item', 'Take a photo with the barista'];
    for (const [i, t] of tasks.entries()) {
      await page.getByText(t).first().click();
      await page.waitForTimeout(700);
      await shot(`${OUT}/${name}-${i + 1}of3.png`);
    }
  }
}

await browser.close();
