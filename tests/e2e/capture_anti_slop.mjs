import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve('tests/e2e/screenshots/anti_slop_new_design');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'id-ID'
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  // 1. Capture new login screen
  await page.screenshot({ path: path.join(outDir, '01_new_login_screen.png') });
  console.log('Saved 01_new_login_screen.png');

  // Click login
  const userInput = page.locator('input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]:has-text("Masuk")').first();

  if (await userInput.isVisible()) {
    console.log('Submitting login with owner...');
    await userInput.fill('owner');
    await passInput.fill('password');
    await submitBtn.click();
    await page.waitForTimeout(2500);
  }

  // 2. Capture new dashboard screen with unified command deck & bottom telemetry
  await page.screenshot({ path: path.join(outDir, '02_new_dashboard_screen.png') });
  console.log('Saved 02_new_dashboard_screen.png');

  // 3. Open POS Screen
  const posBtn = page.locator('button:has-text("Buka Kasir"), button:has-text("Kasir POS")').first();
  if (await posBtn.isVisible()) {
    console.log('Opening POS Terminal...');
    await posBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, '03_new_pos_screen.png') });
    console.log('Saved 03_new_pos_screen.png');
  }

  // 4. Return to Dashboard and navigate to Laporan Keuangan
  const dashBtn = page.locator('button:has-text("Dashboard")').first();
  if (await dashBtn.isVisible()) {
    await dashBtn.click();
    await page.waitForTimeout(1000);
  }

  const finBtn = page.locator('button:has-text("Laporan SAK")').first();
  if (await finBtn.isVisible()) {
    console.log('Opening Laporan SAK EMKM...');
    await finBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, '04_new_financial_screen.png') });
    console.log('Saved 04_new_financial_screen.png');
  }

  await browser.close();
  console.log('Done capturing all new design screens!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
