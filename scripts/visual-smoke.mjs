/**
 * Visual QA runs only inside GitHub Actions, not in the shipped web app.
 * Takes exact stills across entrance beats on desktop and portrait, verifies
 * the native timeline reacts to click and that we can still reach Pixi.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const url = 'http://127.0.0.1:4173/Lijiang_Pen_Transfer/';
const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' });
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
let browser;

async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch { /* server still starting */ }
    await pause(250);
  }
  throw new Error('Vite preview did not become ready');
}

function emitScreenshot(path, label) {
  // JPEG is kept very small so this diagnostic can also be read from CI logs.
  // The same images are attached as a downloadable workflow artifact.
  console.log('VISUAL_BEGIN_' + label);
  console.log(readFileSync(path).toString('base64'));
  console.log('VISUAL_END_' + label);
}

try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader', '--disable-features=IsolateOrigins'],
  });
  mkdirSync('visual-qa', { recursive: true });

  for (const variant of [
    { device: 'desktop', width: 1280, height: 720, chapters: ['观山', '穿洞', '靠岸', '入画'] },
    { device: 'portrait', width: 390, height: 844, chapters: ['观山', '穿洞', '靠岸'] },
  ]) {
    const context = await browser.newContext({
      viewport: { width: variant.width, height: variant.height },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(msg.text());
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /入画启程/ }).click();
    await page.locator('canvas.elephant-canvas').waitFor({ timeout: 20000 });
    await pause(650);

    for (const label of variant.chapters) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await pause(230);
      const slider = page.getByRole('slider', { name: /拖动象鼻山序章进度/ });
      if (!(await slider.isVisible())) throw new Error('Missing draggable timeline');
      const pos = await slider.getAttribute('value');
      const path = 'visual-qa/' + variant.device + '-' + label + '.jpg';
      await page.screenshot({ path, type: 'jpeg', quality: 43 });
      emitScreenshot(path, variant.device + '_' + label);
      console.log('VISUAL_STATUS ' + variant.device + ' ' + label + ' slider=' + pos);
    }
    const slider = page.getByRole('slider', { name: /拖动象鼻山序章进度/ });
    const rect = await slider.boundingBox();
    if (!rect) throw new Error('Timeline is not hit-testable');
    const trackY = rect.y + rect.height / 2;
    await page.mouse.move(rect.x + rect.width * 0.12, trackY);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * 0.77, trackY, { steps: 12 });
    await page.mouse.up();
    await pause(100);
    const dragged = Number(await slider.inputValue());
    if (dragged < 550 || dragged > 950) throw new Error('Pointer dragging failed: ' + dragged);
    console.log('DRAG_POINTER_OK ' + variant.device + ' ' + dragged);

    await slider.focus();
    await slider.press('Home');
    await slider.press('ArrowRight');
    await pause(100);
    const keyboard = Number(await slider.inputValue());
    if (keyboard < 1 || keyboard > 30) throw new Error('Keyboard seeking failed: ' + keyboard);
    console.log('DRAG_KEYBOARD_OK ' + variant.device + ' ' + keyboard);

    await page.getByRole('button', { name: /跳过序章/ }).click();
    await page.locator('.scroll-canvas').waitFor({ timeout: 30000 });
    console.log('PIXIJOURNEY_OK ' + variant.device);
    if (variant.device === 'desktop') {
      await page.locator('.scene-loading').waitFor({ state: 'hidden', timeout: 30000 });
      await page.getByRole('button', { name: /玻璃桥/ }).click();
      await page.locator('.scene-finale-link').click();
      await page.locator('canvas.elephant-canvas').waitFor({ timeout: 20000 });
      await page.getByRole('button', { name: '题诗', exact: true }).click();
      await pause(250);
      const path = 'visual-qa/desktop-卷尾.jpg';
      await page.screenshot({ path, type: 'jpeg', quality: 45 });
      emitScreenshot(path, 'desktop_卷尾');
      await page.getByRole('button', { name: '返回画卷' }).click();
      await page.locator('.scroll-canvas').waitFor({ timeout: 30000 });
      console.log('FINALE_RETURN_OK');
    }
    if (pageErrors.length) console.warn('BROWSER_WARNINGS ' + JSON.stringify(pageErrors.slice(0, 12)));
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
