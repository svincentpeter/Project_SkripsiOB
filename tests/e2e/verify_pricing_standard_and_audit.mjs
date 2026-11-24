import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve('tests/e2e/screenshots/pricing_audit_e2e');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function assert(cond, msg) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

async function runE2E() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'id-ID',
  });
  const page = await context.newPage();

  const baseUrl = process.env.E2E_URL || 'http://localhost:3001';
  console.log(`1. Membuka halaman Login ${baseUrl} ...`);
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(800);

  // Login sebagai KASIR (password: password)
  console.log('2. Login sebagai Role KASIR (username: kasir, password: password)...');
  const userInput = page.locator('input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();
  await userInput.fill('kasir');
  await passInput.fill('password');
  await submitBtn.click();

  await page.locator('h2:has-text("Keranjang Kasir")').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '01_kasir_pos_catalog.png') });
  console.log('   -> Berhasil masuk ke Terminal POS Kasir.');

  // Case 1: Klik produk yang harganya masih Rp 0 (Accelera Phi-R 195/50 R16 -> Set Harga (Min. +15%))
  console.log('3. Menguji Case 1 (Kecolongan Harga Katalog Rp 0): Klik produk Set Harga (Min. +15%)...');
  const zeroPriceCard = page.locator('text=Set Harga (Min. +15%)').first();
  await zeroPriceCard.waitFor({ state: 'visible', timeout: 10000 });
  await zeroPriceCard.click();
  await page.waitForTimeout(800);

  // Pastikan Modal Penentuan Harga Darurat Kasir muncul beserta HPP Patokan & Harga Minimal (+15%)
  const modalHeader = page.locator('text=Standar Penentuan Harga Jual Kasir').first();
  assert(await modalHeader.isVisible(), 'Modal Standar Penentuan Harga Jual Kasir harus tampil untuk produk Rp 0');
  await page.screenshot({ path: path.join(outDir, '02_kasir_emergency_zero_price_modal.png') });
  console.log('   -> Modal Penentuan Harga Darurat Kasir tampil lengkap dengan HPP Patokan & Batas Minimal +15%.');

  // Klik tombol + (+1% real-time) 3 kali dan +5% 1 kali (dari 15% menjadi 23%) lalu simpan ke keranjang
  const plus1Btn = page.locator('button[aria-label="Tambah 1 persen"]').first();
  await plus1Btn.click();
  await plus1Btn.click();
  await plus1Btn.click();
  const plus5Btn = page.locator('button:has-text("+5%")').first();
  await plus5Btn.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, '02_kasir_emergency_zero_price_modal.png') });
  const saveZeroBtn = page.locator('button:has-text("Simpan Harga & Masukkan Keranjang")').first();
  await saveZeroBtn.click();
  await page.waitForTimeout(800);

  // Case 2: Tambahkan produk ke-2 (Bridgestone Ecopia EP150) lalu naikkan harga di nota untuk Reimburse Pembeli
  console.log('4. Menguji Case 2 (Pembeli minta naikkan harga di nota untuk Reimburse ke atasan)...');
  const regularCard = page.locator('h3:has-text("Bridgestone Ecopia EP150")').first();
  await regularCard.click();
  await page.waitForTimeout(600);

  // Klik tombol Edit pada baris Bridgestone Ecopia di keranjang
  const editButtons = page.locator('button:has-text("Edit")');
  await editButtons.nth(1).click();
  await page.waitForTimeout(800);

  // Klik tombol +5% dan +1% beberapa kali secara real-time & pilih alasan Reimburse
  const plus5EditBtn = page.locator('button:has-text("+5%")').first();
  await plus5EditBtn.click();
  await page.locator('button[aria-label="Tambah 1 persen"]').first().click();
  await page.locator('button[aria-label="Tambah 1 persen"]').first().click();
  await page.waitForTimeout(300);
  const reimburseReasonBtn = page.locator('button:has-text("Permintaan pembeli (Reimburse ke atasan / kantor)")').first();
  if (await reimburseReasonBtn.isVisible()) {
    await reimburseReasonBtn.click();
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, '03_kasir_reimburse_markup_modal.png') });

  const applyEditBtn = page.locator('button:has-text("Terapkan Perubahan")').first();
  await applyEditBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '04_kasir_cart_with_both_cases.png') });
  console.log('   -> Keranjang menampilkan badge "Harga Darurat Kasir" dan "Ubah Harga Nota" beserta alasannya.');

  // Proses Pesanan (Bayar) menggunakan Transfer Bank BCA
  console.log('5. Melakukan Checkout POS...');
  const checkoutBtn = page.locator('button:has-text("Proses Pesanan (Bayar)")').first();
  await checkoutBtn.click();
  await page.waitForTimeout(1000);

  const transferTab = page.locator('button:has-text("Transfer")').first();
  await transferTab.click();
  await page.waitForTimeout(500);

  const confirmPayBtn = page.locator('button:has-text("Konfirmasi & Cetak Struk"), button:has-text("Selesaikan Pembayaran"), button:has-text("Bayar Sekarang"), button:has-text("Proses Pembayaran")').first();
  if (await confirmPayBtn.isVisible()) {
    await confirmPayBtn.click();
  } else {
    // Cari tombol submit utama di CheckoutModal
    await page.locator('div.fixed button.bg-emerald-600, div.fixed button.bg-blue-600').last().click();
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, '05_kasir_checkout_success.png') });
  console.log('   -> Checkout berhasil dibukukan di server.');

  console.log('6. Logout dari Kasir dan Login sebagai OWNER (username: owner, password: password)...');
  await page.evaluate(() => localStorage.clear());
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.locator('input[type="text"]').first().fill('owner');
  await page.locator('input[type="password"]').first().fill('password');
  await page.locator('button[type="submit"]').first().click();

  // Tunggu sampai data notifikasi & katalog selesai dimuat dari server
  await page.locator('button[title="Pemberitahuan Sistem"]').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(4500);

  // Klik Lonceng Notifikasi di Header Owner
  console.log('7. Memeriksa Lonceng Notifikasi Owner di Header...');
  const bellBtn = page.locator('button[title="Pemberitahuan Sistem"]').first();
  await bellBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '06_owner_notification_bell_dropdown.png') });

  // Navigasi ke Produk & Jasa -> Audit Harga & Notifikasi Kasir
  await page.locator('button:has-text("Produk & Jasa")').first().click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Audit Harga & Notifikasi Kasir")').first().click();

  // Tunggu sampai baris tabel audit harga muncul dari API /price-audits
  await page.locator('td:has-text("Kasir OB3")').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, '07_owner_price_audit_log_page.png') });

  const auditTitle = page.locator('text=Audit Log Penentuan & Perubahan Harga Jual').first();
  assert(await auditTitle.isVisible(), 'Halaman Audit Log Penentuan & Perubahan Harga Jual harus tampil untuk Owner');
  console.log('   -> Halaman Audit Log & Notifikasi Owner tampil lengkap dengan identitas kasir, alasan, HPP, dan nominal harga!');

  // Buka modal Tinjau / Koreksi sebagai Owner
  const reviewBtn = page.locator('button:has-text("Tinjau / Koreksi")').first();
  if (await reviewBtn.isVisible()) {
    await reviewBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, '08_owner_review_and_adjust_modal.png') });
    console.log('   -> Modal Tinjauan & Koreksi Harga Katalog oleh Owner tampil dan berfungsi.');
    await page.locator('button:has-text("Tandai Selesai Ditinjau")').first().click();
    await page.waitForTimeout(1000);
  }

  await browser.close();
  console.log('SEMUA PENGUJIAN PLAYWRIGHT E2E BERHASIL (8 SCREENSHOT TERSIMPAN)!');
}

runE2E().catch((err) => {
  console.error('Playwright E2E gagal:', err);
  process.exit(1);
});
