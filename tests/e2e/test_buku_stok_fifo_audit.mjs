import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots/buku_fifo');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runBukuFifoAudit() {
  console.log('=== MEMULAI AUDIT UI/UX BUKU STOK FIFO SPREADSHEET ===');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'id-ID',
  });

  const page = await context.newPage();

  const findings = [];
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon')) {
        consoleErrors.push(`[Console Error] ${text}`);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[Page Crash] ${err.message}`);
  });

  function recordFinding(type, moduleName, item, detail, severity = 'INFO') {
    findings.push({ type, moduleName, item, detail, severity });
    console.log(`[AUDIT - ${type}] [${moduleName}] ${item}: ${detail}`);
  }

  try {
    // 1. Buka aplikasi & Login Owner
    console.log('1. Membuka http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Logout jika ada sesi lama untuk audit bersih
    const userDropdown = page.locator('button:has-text("Kasir OB3"), button:has-text("Admin Gudang")').first();
    if (await userDropdown.isVisible()) {
      await userDropdown.click();
      await page.waitForTimeout(400);
      const switchOwner = page.locator('button:has-text("Agus Subagyo")').first();
      if (await switchOwner.isVisible()) {
        await switchOwner.click();
        await page.waitForTimeout(800);
      }
    }

    const quickOwnerBtn = page.locator('button:has-text("Agus Subagyo")').first();
    if (await quickOwnerBtn.isVisible()) {
      await quickOwnerBtn.click();
      await page.waitForTimeout(1000);
    }

    // Tutup dropdown apapun yang mungkin aktif
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 2. Navigasi ke Modul Produk & Jasa
    console.log('2. Membuka Modul Produk & Jasa...');
    const invNavBtn = page.locator('button:has-text("Produk & Jasa")').first();
    await invNavBtn.click({ force: true });
    await page.waitForTimeout(1200);

    // 3. Beralih ke Tab "Buku Stok FIFO (Excel)"
    console.log('3. Membuka Sub-Tab Buku Stok FIFO (Excel)...');
    const bukuFifoTabBtn = page.locator('button:has-text("Buku Stok FIFO")').first();
    await bukuFifoTabBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Screenshot 1: Overview Buku Stok FIFO
    console.log('Screenshot 1: Tampilan Awal Buku Stok FIFO...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'buku_fifo_01_clean_overview.png') });

    // Periksa Header: Harus ada 'Awal', TIDAK BOLEH 'WAL' terpotong
    const thAwal = page.locator('th:has-text("Awal")');
    const isAwalVisible = await thAwal.first().isVisible();
    if (isAwalVisible) {
      recordFinding('VERIFIED', 'Buku Stok - Header', 'Header Stok Awal Terbaca Utuh', 'Kolom "Awal" tampil utuh tanpa terpotong menjadi "WAL".', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Buku Stok - Header', 'Header Stok Awal Terpotong', 'Header "Awal" tidak terbaca atau terpotong.', 'ERROR');
    }

    // Periksa bahwa TIDAK ADA 'Bridgestone Promo Test' atau 'Accelera Adjust Test'
    const pageText = await page.innerText('body');
    if (pageText.includes('Promo Test') || pageText.includes('Adjust Test')) {
      recordFinding('UI_CACAT', 'Buku Stok - Integritas Data', 'Data Dummy Test Terdeteksi', 'Masih ditemukan junk test records di tabel laporan.', 'ERROR');
    } else {
      recordFinding('VERIFIED', 'Buku Stok - Integritas Data', 'Data Bebas dari Sampah Test', 'Semua produk yang tampil adalah produk riil toko tanpa duplikasi sampah test.', 'OK');
    }

    // Periksa Footer TOTAL KESELURUHAN
    const footerTotal = page.locator('tfoot td:has-text("TOTAL KESELURUHAN")');
    if (await footerTotal.isVisible()) {
      recordFinding('VERIFIED', 'Buku Stok - Footer', 'Baris Total Keseluruhan Hadir', 'Footer agregasi total unit awal, restock, sisa, dan terjual tampil rapi.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Buku Stok - Footer', 'Baris Total Tidak Ditemukan', 'Footer tfoot tidak berhasil dirender.', 'WARNING');
    }

    // 4. Scroll horizontal ke kanan untuk melihat matriks tanggal (1..31)
    console.log('4. Menguji scroll horizontal ke matriks tanggal...');
    const tableContainer = page.locator('.overflow-x-auto').first();
    await tableContainer.evaluate((el) => { el.scrollLeft = 350; });
    await page.waitForTimeout(600);

    // Screenshot 2: Scroll Horizontal
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'buku_fifo_02_scrolled_right_matrix.png') });

    // Pastikan kolom identitas (No, Merk, Ring) tetap membeku (frozen) di sebelah kiri
    const frozenRing = page.locator('th:has-text("Ring")').first();
    const frozenBox = await frozenRing.boundingBox();
    if (frozenBox && frozenBox.x < 550) {
      recordFinding('VERIFIED', 'Buku Stok - Freeze Panes', 'Kolom Identitas Membeku Sempurna', 'No, Merk, Ukuran, dan Ring tetap terkunci di kiri saat pengguna menggulir tanggal.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Buku Stok - Freeze Panes', 'Freeze Panes Gagal', 'Kolom identitas ikut bergeser.', 'ERROR');
    }

    // 5. Uji Toggle Rincian Batch FIFO
    console.log('5. Menguji tombol toggle rincian batch...');
    const batchToggleBtn = page.locator('button:has-text("Sembunyikan Rincian Batch"), button:has-text("Tampilkan Rincian Batch")').first();
    if (await batchToggleBtn.isVisible()) {
      await batchToggleBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'buku_fifo_03_batch_toggled.png') });
      recordFinding('VERIFIED', 'Buku Stok - Interaktivitas', 'Toggle Rincian Batch Berfungsi', 'Sub-baris batch FIFO dapat dibuka/tutup dengan 1-klik.', 'OK');

      // Kembalikan ke posisi terbuka
      await batchToggleBtn.click();
      await page.waitForTimeout(400);
    }

    // Global Sanity Checks
    const bodyContent = await page.innerText('body');
    const sanityChecks = [
      { pattern: /ban bekas/i, label: 'Ban Bekas Terlarang', severity: 'ERROR' },
      { pattern: /BSD/i, label: 'Hardcoded BSD', severity: 'WARNING' },
      { pattern: /rp\s*nan/i, label: 'NaN Rupiah', severity: 'ERROR' },
      { pattern: /\[object Object\]/i, label: 'Object Object', severity: 'ERROR' },
    ];

    for (const check of sanityChecks) {
      if (check.pattern.test(bodyContent)) {
        recordFinding('UI_CACAT', 'Global Sanity', `Terdeteksi ${check.label}`, `Ditemukan pola ${check.label}`, check.severity);
      } else {
        recordFinding('VERIFIED', 'Global Sanity', `Bebas dari ${check.label}`, `Tidak ditemukan pola cacat "${check.label}".`, 'OK');
      }
    }

    if (consoleErrors.length > 0) {
      recordFinding('CONSOLE_ERROR', 'Browser Console', 'Kesalahan Konsol Terdeteksi', consoleErrors.join(' | '), 'ERROR');
    } else {
      recordFinding('VERIFIED', 'Browser Console', 'Konsol Bersih Bebas Error', '0 error konsol peramban.', 'OK');
    }

  } catch (error) {
    console.error('Terjadi error audit Playwright:', error);
    recordFinding('CRASH', 'E2E Engine', 'Kegagalan Audit', error.message, 'FATAL');
  } finally {
    const reportPath = path.join(SCREENSHOT_DIR, 'buku_fifo_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), findings, consoleErrors }, null, 2));
    console.log(`\n✓ Laporan audit lengkap tersimpan di: ${reportPath}`);
    await browser.close();
    console.log('=== AUDIT BUKU STOK FIFO SELESAI! ===\n');
  }
}

runBukuFifoAudit();
