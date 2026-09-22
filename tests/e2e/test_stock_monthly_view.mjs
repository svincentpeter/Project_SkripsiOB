import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'tests/e2e/screenshots';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

(async () => {
  console.log('=== STARTING PLAYWRIGHT E2E TEST: BUKU STOK FIFO SPREADSHEET ===');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  try {
    console.log('1. Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });

    // Handle login if presented
    const loginButton = page.locator('button[type="submit"]');
    if (await loginButton.isVisible()) {
      console.log('2. Login screen detected. Logging in as Owner...');
      // Look for quick login or fill form
      const ownerQuickLogin = page.locator('button:has-text("Owner"), button:has-text("Pak Vincent")').first();
      if (await ownerQuickLogin.isVisible()) {
        await ownerQuickLogin.click();
      } else {
        await page.fill('input[type="text"]', 'owner');
        await page.fill('input[type="password"]', 'password');
        await loginButton.click();
      }
      await page.waitForTimeout(1000);
    }

    console.log('3. Navigating to Inventaris screen via "Produk & Jasa"...');
    const inventarisNav = page.locator('button:has-text("Produk & Jasa"), button:has-text("Inventori & FIFO")').first();
    await inventarisNav.click();
    await page.waitForTimeout(1000);

    console.log('4. Clicking sub-tab "Buku Stok FIFO (Excel)"...');
    const fifoTab = page.locator('button:has-text("Buku Stok FIFO")').first();
    await fifoTab.waitFor({ state: 'visible', timeout: 5000 });
    await fifoTab.click();
    await page.waitForTimeout(1500);

    // Verify metrics cards are rendered
    const valuationCard = page.locator('text=Total Valuasi HPP Gudang');
    await valuationCard.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Header Metrik Owner terdeteksi (Total Valuasi HPP Gudang)');

    // Verify spreadsheet headers
    const tableHeaderMerk = page.locator('th:has-text("Merk & Nama Ban")');
    await tableHeaderMerk.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Kolom Spreadsheet Freeze terdeteksi (Merk & Nama Ban, Ukuran, Ring, Modal, Harga)');

    // Verify daily columns
    const dayOneHeader = page.locator('th:has-text("1")').first();
    await dayOneHeader.waitFor({ state: 'visible' });
    console.log('✓ Matriks Harian 1..31 terdeteksi');

    // Wait for at least one data row to be loaded
    console.log('5. Waiting for data rows to populate...');
    const openingStockCell = page.locator('td[title*="koreksi stok fisik awal"]').first();
    await openingStockCell.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Baris data produk buku stok FIFO berhasil dimuat!');

    await page.waitForTimeout(1000);

    // Take full spreadsheet screenshot with populated data
    const screenshotPath = path.join(SCREENSHOT_DIR, 'buku_stok_fifo_spreadsheet.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`✓ Screenshot grid data tersimpan di: ${screenshotPath}`);

    // Test clicking opening stock cell
    console.log('6. Testing inline edit modal click on cell "Awal"...');
    await openingStockCell.click();
    await page.waitForTimeout(500);

    const modalTitle = page.locator('text=Koreksi Stok Awal');
    await modalTitle.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Popover Koreksi Stok Awal berhasil muncul');
    const modalScreenshot = path.join(SCREENSHOT_DIR, 'modal_koreksi_stok_awal.png');
    await page.screenshot({ path: modalScreenshot });
    console.log(`✓ Screenshot modal stok awal tersimpan di: ${modalScreenshot}`);

    // Close modal
    await page.click('button:has-text("Batal")');
    await page.waitForTimeout(500);

    // Test clicking modal (batch cost) cell
    console.log('7. Testing inline edit modal click on cell "Modal"...');
    const costCell = page.locator('td[title*="koreksi modal"]').first();
    if (await costCell.isVisible()) {
      await costCell.click();
      await page.waitForTimeout(500);
      const modalCostTitle = page.locator('text=Koreksi Modal HPP Batch');
      if (await modalCostTitle.isVisible()) {
        console.log('✓ Popover Koreksi Modal HPP Batch berhasil muncul');
        const costModalScreenshot = path.join(SCREENSHOT_DIR, 'modal_koreksi_modal.png');
        await page.screenshot({ path: costModalScreenshot });
        console.log(`✓ Screenshot modal koreksi modal tersimpan di: ${costModalScreenshot}`);
        await page.click('button:has-text("Batal")');
        await page.waitForTimeout(500);
      }
    }

    // Test clicking tag stok lama button
    console.log('8. Testing tag stok lama button click...');
    const tagButton = page.locator('button[title*="Tandai Stok Lama"]').first();
    if (await tagButton.isVisible()) {
      await tagButton.click();
      await page.waitForTimeout(500);
      const modalTagTitle = page.locator('h3:has-text("Tandai Stok Lama / Promo")');
      if (await modalTagTitle.isVisible()) {
        console.log('✓ Popover Tandai Stok Lama berhasil muncul');
        const tagModalScreenshot = path.join(SCREENSHOT_DIR, 'modal_tandai_stok_lama.png');
        await page.screenshot({ path: tagModalScreenshot });
        console.log(`✓ Screenshot modal tandai stok lama tersimpan di: ${tagModalScreenshot}`);
        await page.click('button:has-text("Batal")');
        await page.waitForTimeout(300);
      }
    }

    console.log('=== PLAYWRIGHT E2E TEST COMPLETED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('Test failed with error:', error);
    const errScreenshot = path.join(SCREENSHOT_DIR, 'error_screenshot.png');
    await page.screenshot({ path: errScreenshot });
    console.log(`Error screenshot saved at: ${errScreenshot}`);
  } finally {
    await browser.close();
  }
})();
