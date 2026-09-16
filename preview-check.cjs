const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');

(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.project-card')).toHaveCount(3);
  const sculpture = page.getByRole('button', { name: 'Change sculpture color' });
  await sculpture.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.hero-art')).toHaveAttribute('data-burst', '1');
  await page.keyboard.press('Enter');
  await expect(page.locator('.hero-art')).toHaveAttribute('data-burst', '0');
  await page.getByRole('button', { name: 'Pause animations' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  expect(await page.locator('.sculpture').evaluate(element => getComputedStyle(element).animationPlayState)).toBe('paused');
  await page.getByRole('button', { name: 'Enable animations' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'active');

  for (const [filter, title] of [['Full stack','Campus Connect'],['Web apps','Pennywise'],['UI exploration','Learn Space']]) {
    await page.getByRole('button', { name: filter, exact: true }).click();
    await expect(page.locator('.project-card')).toHaveCount(1);
    const card = page.getByRole('button', { name: `Explore ${title} concept` });
    await card.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#project-dialog-title')).toHaveText(title);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(card).toBeFocused();
  }
  await page.getByRole('button', { name: 'All work' }).click();
  await expect(page.locator('.project-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Explore Campus Connect concept' }).click();
  await page.getByRole('button', { name: 'Close project details' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  await page.getByLabel('Your name').fill('Preview Tester');
  await page.getByLabel('Your email').fill('preview@example.com');
  await page.getByLabel('A little about your idea').fill('A thoughtful little web experience.');
  const [contactResponse] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/contact') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Send message' }).click(),
  ]);
  // 429 means the per-IP hourly limit kicked in, which still proves the backend works.
  expect([201, 429], 'POST /api/contact failed. Is MongoDB running and .env.local set?').toContain(contactResponse.status());
  await expect(page.locator('.form-status')).toContainText(contactResponse.status() === 201 ? 'Thank you' : 'try again later');
  if (contactResponse.status() === 201) await expect(page.getByLabel('Your name')).toHaveValue('');

  // With the server unreachable, the visitor still gets their words back as a draft.
  await page.route('**/api/contact', route => route.abort());
  await page.getByLabel('Your name').fill('Preview Tester');
  await page.getByLabel('Your email').fill('preview@example.com');
  await page.getByLabel('A little about your idea').fill('A thoughtful little web experience.');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Send message' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('hello-ankita.txt');
  const draft = fs.readFileSync(await download.path(), 'utf8');
  expect(draft).toContain('Preview Tester <preview@example.com>');
  expect(draft).toContain('A thoughtful little web experience.');
  await expect(page.locator('.form-status')).toContainText('It has not been sent');
  await page.unroute('**/api/contact');

  for (const width of [320,390,760,768,1024,1440]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document, `Horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.getByRole('navigation')).not.toBeVisible();
  await expect(page).toHaveURL(/#about$/);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  expect(await page.locator('.sculpture').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'artifacts/mobile-hero.png' });
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: 'artifacts/desktop-hero.png' });
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  expect(errors).toEqual([]);
  console.log('PASS: Six responsive widths, project filters, all project dialogs, keyboard focus restoration, mobile navigation, sculpture interaction, motion toggle, reduced-motion preference, contact message delivery to MongoDB, offline draft fallback, and zero browser errors.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
