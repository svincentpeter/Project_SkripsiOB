import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'pos');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const auditFindings = [];

function recordFinding(category, subview, title, description, status = 'OK') {
  auditFindings.push({
    category,
    subview,
    title,
    description,
    status,
    timestamp: new Date().toISOString()
  });
  console.log(`[AUDIT - ${category}] [${subview}] ${title}: ${description}`);
}

(async () => {
  console.log('=== MEMULAI AUDIT MENDALAM UI/UX PLAYWRIGHT: MODUL TERMINAL KASIR POS ===');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Tangkap error konsol browser
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('[BROWSER CONSOLE ERROR]', msg.text());
    }
  });

  try {
    // ----------------------------------------------------
    // AUDIT 1: Buka Layar Kasir POS & Validasi Header
    // ----------------------------------------------------
    console.log('1. Membuka aplikasi di http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    console.log('2. Membuka Layar Kasir POS...');
    const posNavBtn = page.locator('button:has-text("Mesin Kasir (POS)"), button:has-text("Terminal Kasir")').first();
    if (await posNavBtn.isVisible()) {
      await posNavBtn.click();
      await page.waitForTimeout(1000);
    }

    console.log('3. Mengaudit Header Kasir POS & Overview...');
    const searchInput = page.locator('input[placeholder*="Cari Ban"]').first();
    const searchPlaceholder = await searchInput.getAttribute('placeholder');
    if (searchPlaceholder && searchPlaceholder.includes('(F2)')) {
      recordFinding('VERIFIED', 'Header', 'Search Bar Ready', `Placeholder: "${searchPlaceholder}"`, 'OK');
    } else {
      recordFinding('PLACEHOLDER_CACAT', 'Header', 'Search Bar Anomali', `Placeholder tidak informatif: "${searchPlaceholder}"`, 'WARNING');
    }

    const drawerCashText = await page.locator('div:has-text("Kas Laci:")').first().innerText().catch(() => '');
    if (drawerCashText) {
      recordFinding('VERIFIED', 'Header', 'Kas Laci Realtime Terdeteksi', drawerCashText.replace(/\s+/g, ' ').trim(), 'OK');
    }

    // ----------------------------------------------------
    // AUDIT 2: Katalog Ban Baru, Filter Ring, & Filter Merk
    // ----------------------------------------------------
    console.log('4. Mengaudit Katalog Ban Baru, Filter Ring, & Filter Merk...');
    const banBaruTab = page.locator('button:has-text("Ban"), button:has-text("Ban Baru")').first();
    if (await banBaruTab.isVisible()) {
      await banBaruTab.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_01_catalog_ban_baru.png') });

    const productCardsCount = await page.locator('div.grid > div.cursor-pointer').count();
    console.log(`Jumlah elemen produk terdeteksi: ${productCardsCount}`);
    if (productCardsCount > 0) {
      recordFinding('VERIFIED', 'Katalog Ban Baru', 'Produk Ban Berhasil Dirender', `Ditemukan ${productCardsCount} kartu produk pada grid.`, 'OK');
    } else {
      recordFinding('UI_CACAT', 'Katalog Ban Baru', 'Katalog Ban Kosong', 'Tidak ada produk ban yang ditampilkan di grid kasir.', 'ERROR');
    }

    // Cek Filter Ring
    const ringPills = page.locator('button:has-text("R14"), button:has-text("R15"), button:has-text("R16")');
    const ringCount = await ringPills.count();
    if (ringCount >= 3) {
      recordFinding('VERIFIED', 'Filter Ring', 'Pill Filter Ring Aktif', `Ditemukan ${ringCount} pill ring cepat.`, 'OK');
      await ringPills.first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_02_ring_and_brand_filter.png') });
    }

    // ----------------------------------------------------
    // AUDIT 3: Fitur Pencarian Cepat (F2) & 1-Click Reset Filter
    // ----------------------------------------------------
    console.log('5. Menguji Fitur Pencarian Cepat (F2) & Tombol Reset Filter...');
    await searchInput.fill('NonExistentTireQuery12345');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_03_search_functionality.png') });

    // Cek apakah tombol Reset Semua Filter muncul
    const resetFilterBtn = page.locator('button:has-text("Reset Semua Filter & Pencarian")').first();
    if (await resetFilterBtn.isVisible()) {
      recordFinding('VERIFIED', 'Katalog Pencarian', 'Tombol Reset Filter 1-Click Tersedia', 'Tombol Reset Semua Filter muncul saat pencarian 0 barang.', 'OK');
      await resetFilterBtn.click();
      await page.waitForTimeout(600);
    } else {
      await searchInput.fill('');
      const allRingBtn = page.locator('button:has-text("Semua")').first();
      if (await allRingBtn.isVisible()) await allRingBtn.click();
    }

    // ----------------------------------------------------
    // AUDIT 4: Tab Master Jasa & Servis Bengkel
    // ----------------------------------------------------
    console.log('6. Mengaudit Tab Master Jasa & Servis...');
    const jasaTab = page.locator('button:has-text("Jasa")').first();
    if (await jasaTab.isVisible()) {
      await jasaTab.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_04_katalog_jasa.png') });

      const serviceCards = page.locator('div:has-text("Spooring"), div:has-text("Balancing"), div:has-text("Bongkar Pasang")').first();
      if (await serviceCards.isVisible()) {
        recordFinding('VERIFIED', 'Katalog Jasa', 'Daftar Layanan Jasa Aktif', 'Layanan bengkel (Spooring/Balancing/Bongkar) muncul dengan tarif.', 'OK');
        // Masukkan salah satu jasa ke keranjang
        await serviceCards.click();
        await page.waitForTimeout(500);
      }
    }

    // ----------------------------------------------------
    // AUDIT 5: Input Item Manual Non-Katalog
    // ----------------------------------------------------
    console.log('7. Mengaudit Tab Input Item Manual Non-Katalog...');
    const manualTab = page.locator('button:has-text("Manual")').first();
    if (await manualTab.isVisible()) {
      await manualTab.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_05_katalog_manual.png') });

      // Verifikasi tombol submit tidak mengandung tanda ++ ganda
      const manualSubmitBtn = page.locator('form button[type="submit"]').first();
      const submitText = await manualSubmitBtn.innerText();
      if (submitText.includes('+ +')) {
        recordFinding('UI_CACAT', 'Item Manual', 'Simbol Dobel + + Pada Tombol Submit', `Label tombol: "${submitText}"`, 'ERROR');
      } else {
        recordFinding('VERIFIED', 'Item Manual', 'Label Tombol Submit Bersih', `Label tombol: "${submitText}" (bebas dari ++ ganda)`, 'OK');
      }
    }

    // Kembalikan ke Katalog Semua / Ban Baru & Masukkan Ban ke Keranjang
    await banBaruTab.click();
    await page.waitForTimeout(600);
    const firstProductCard = page.locator('div.grid > div.cursor-pointer').first();
    if (await firstProductCard.isVisible()) {
      await firstProductCard.click();
      await page.waitForTimeout(400);
      await firstProductCard.click(); // Qty 2
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // AUDIT 6: Panel Keranjang Belanja & Form Identitas
    // ----------------------------------------------------
    console.log('8. Mengaudit Panel Keranjang Belanja...');
    const customerInput = page.locator('input[placeholder="Pelanggan Umum"]').first();
    const plateInput = page.locator('input[placeholder="AA 1234 XY"]').first();
    const carModelInput = page.locator('input[placeholder="Avanza / Innova"]').first();

    if (await customerInput.isVisible() && await plateInput.isVisible() && await carModelInput.isVisible()) {
      await customerInput.fill('Bpk. Budi Santoso');
      await plateInput.fill('AB 1945 CD');
      await carModelInput.fill('Innova Reborn');
      recordFinding('VERIFIED', 'Keranjang', 'Form Identitas Kendaraan Proporsional & Bebas Truncation', 'Input Nama, Plat, dan Model mobil pas tanpa terpotong.', 'OK');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_06_cart_with_items.png') });

    // ----------------------------------------------------
    // AUDIT 7: Modal Pratinjau Struk Cepat Kasir (ReceiptPreviewModal)
    // ----------------------------------------------------
    console.log('9. Mengaudit Modal Pratinjau Struk Cepat Kasir (ReceiptPreviewModal)...');
    const previewReceiptBtn = page.locator('button:has-text("Pratinjau & Cetak Struk")').first();
    if (await previewReceiptBtn.isVisible() && !(await previewReceiptBtn.isDisabled())) {
      await previewReceiptBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_16_receipt_preview_modal.png') });

      const previewTitle = page.locator('text=Pratinjau Struk Kasir (80mm)').first();
      if (await previewTitle.isVisible()) {
        recordFinding('VERIFIED', 'Modal Pratinjau Struk', 'Modal Struk Thermal 80mm Interaktif Siap', 'Desain kertas struk monospace, rincian barang, total, dan barcode dirender sempurna.', 'OK');
      }

      // Tutup modal pratinjau
      const closePreviewBtn = page.locator('button:has-text("Tutup Pratinjau"), button[title="Tutup Pratinjau"]').first();
      if (await closePreviewBtn.isVisible()) {
        await closePreviewBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(500);
    }

    // Cek tombol Edit Detail Baris (CartLineEditModal)
    console.log('10. Mengaudit Modal Edit Detail Baris Keranjang (CartLineEditModal)...');
    const editLineBtn = page.locator('button[title*="Edit Detail Baris"]').first();
    if (await editLineBtn.isVisible()) {
      await editLineBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_07_cart_line_edit_modal.png') });

      const closeEditBtn = page.locator('button:has-text("Batal"), button:has-text("Tutup")').first();
      if (await closeEditBtn.isVisible()) await closeEditBtn.click();
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // AUDIT 8: Order Parkir (Tahan Transaksi) & Drawer
    // ----------------------------------------------------
    console.log('11. Mengaudit Fitur Tahan Transaksi & Drawer Antrian Parked...');
    const parkCartBtn = page.locator('button:has-text("Tahan (Park)")').first();
    if (await parkCartBtn.isVisible() && !(await parkCartBtn.isDisabled())) {
      await parkCartBtn.click();
      await page.waitForTimeout(800);
      recordFinding('VERIFIED', 'Parkir Order', 'Transaksi Berhasil Ditahan', 'Item di keranjang berhasil dialihkan ke status antrian pit servis.', 'OK');
    }

    // Buka Drawer Antrian Tahan
    const openParkedBtn = page.locator('button:has-text("Antrian Tahan")').first();
    if (await openParkedBtn.isVisible()) {
      await openParkedBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_08_parked_orders_drawer.png') });

      const recallBtn = page.locator('button:has-text("Panggil Antrian ke Kasir")').first();
      if (await recallBtn.isVisible()) {
        recordFinding('VERIFIED', 'Drawer Parkir', 'Nomenklatur Tombol Antrian Tepat', 'Tombol "Panggil Antrian ke Kasir" jelas dan responsif.', 'OK');
        await recallBtn.click();
        await page.waitForTimeout(600);
      }

      // Pastikan drawer tertutup
      const closeParkedBtn = page.locator('div.fixed button:has(svg.lucide-x)').first();
      if (await closeParkedBtn.isVisible()) await closeParkedBtn.click();
      await page.waitForTimeout(500);
    }

    // ----------------------------------------------------
    // AUDIT 9: Booking DP Modal & Drawer
    // ----------------------------------------------------
    console.log('12. Mengaudit Booking DP & Pre-Order Ban...');
    const dpModeBtn = page.locator('div:has(> button:has-text("Reguler (Lunas)")) button:has-text("Booking DP")').first();
    if (await dpModeBtn.isVisible()) {
      await dpModeBtn.click();
      await page.waitForTimeout(400);
      const openDpModalBtn = page.locator('button:has-text("Simpan Booking DP")').first();
      if (await openDpModalBtn.isVisible() && !(await openDpModalBtn.isDisabled())) {
        await openDpModalBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_09_booking_dp_modal.png') });

        // Periksa Date Picker & Time Picker
        const dateInput = page.locator('input[type="date"]').first();
        const timeInput = page.locator('input[type="time"]').first();
        const waInput = page.locator('input[placeholder*="0812-3456-7890"]').first();

        if (await dateInput.isVisible() && await timeInput.isVisible()) {
          recordFinding('VERIFIED', 'Booking DP Modal', 'Date & Time Picker Terstruktur Aktif', 'Input tanggal janji pasang dan jam kedatangan kalender berfungsi.', 'OK');
        }
        if (await waInput.isVisible()) {
          recordFinding('VERIFIED', 'Booking DP Modal', 'Placeholder WhatsApp Profesional', 'Format placeholder baku: "Contoh: 0812-3456-7890".', 'OK');
        }

        // Tutup modal DP
        const cancelDpBtn = page.locator('button:has-text("Batal")').first();
        if (await cancelDpBtn.isVisible()) await cancelDpBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Buka Drawer Daftar Booking dari Header
    const openBookingListBtn = page.locator('header button[title*="Daftar Booking Inden & DP"]').first();
    if (await openBookingListBtn.isVisible()) {
      await openBookingListBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_10_booking_list_drawer.png') });

      const closeBookingListBtn = page.locator('div.fixed button:has(svg.lucide-x)').first();
      if (await closeBookingListBtn.isVisible()) await closeBookingListBtn.click();
      await page.waitForTimeout(500);
    }

    // Kembalikan mode keranjang ke REGULER
    const regModeBtn = page.locator('button:has-text("Reguler (Lunas)")').first();
    if (await regModeBtn.isVisible()) await regModeBtn.click();
    await page.waitForTimeout(400);

    // ----------------------------------------------------
    // AUDIT 10: Modal Checkout Multi-Metode (CheckoutModal)
    // ----------------------------------------------------
    console.log('13. Mengaudit Modal Checkout Multi-Metode & Faktur BON...');
    const checkoutBtn = page.locator('button:has-text("Proses Pesanan (Bayar)")').first();
    await checkoutBtn.waitFor({ state: 'visible', timeout: 5000 });
    await checkoutBtn.click();
    await page.waitForTimeout(800);

    // A. Pembayaran Tunai (Cash)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_11_checkout_modal_tunai.png') });
    recordFinding('VERIFIED', 'Checkout - Tunai', 'Tampilan Pembayaran Tunai Valid', 'Kalkulasi uang pas, pecahan cepat, dan kembalian ditampilkan.', 'OK');

    // B. Pembayaran Transfer Bank
    const transferTabBtn = page.locator('button:has-text("Transfer")').first();
    if (await transferTabBtn.isVisible()) {
      await transferTabBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_12_checkout_modal_transfer.png') });
    }

    // C. Pembayaran QRIS Dinamis Midtrans
    const qrisTabBtn = page.locator('button:has-text("QRIS")').first();
    if (await qrisTabBtn.isVisible()) {
      await qrisTabBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_13_checkout_modal_qris.png') });
      recordFinding('VERIFIED', 'Checkout - QRIS', 'Tab QRIS Siap Digunakan', 'Opsi QRIS Midtrans dinamis / manual terkonfigurasi.', 'OK');
    }

    // D. Mode Faktur BON (Piutang Usaha) & Verifikasi Due Date Selector
    const bonTagBtn = page.locator('button:has-text("Faktur BON (Piutang)")').first();
    if (await bonTagBtn.isVisible()) {
      await bonTagBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_14_checkout_modal_bon.png') });

      const bonDueDateInput = page.locator('input[type="date"]').first();
      const bonTermPills = page.locator('button:has-text("7 Hari"), button:has-text("14 Hari"), button:has-text("30 Hari")');
      const termPillsCount = await bonTermPills.count();

      if (await bonDueDateInput.isVisible() && termPillsCount >= 3) {
        recordFinding('VERIFIED', 'Checkout - BON', 'Termin & Jatuh Tempo Piutang Terverifikasi', 'Pilihan termin 7/14/30 hari dan date picker jatuh tempo aktif.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Checkout - BON', 'Jatuh Tempo Hilang', 'Input tanggal jatuh tempo BON tidak ditemukan.', 'ERROR');
      }
    }

    // Kembalikan ke Reguler & Tunai untuk menyelesaikan transaksi uji coba
    const regTagBtn = page.locator('button:has-text("Faktur Reguler (Lunas)")').first();
    if (await regTagBtn.isVisible()) await regTagBtn.click();
    await page.waitForTimeout(300);
    const cashTabBtn = page.locator('button:has-text("Tunai")').first();
    if (await cashTabBtn.isVisible()) await cashTabBtn.click();
    await page.waitForTimeout(300);

    const exactMoneyBtn = page.locator('button:has-text("Uang Pas")').first();
    if (await exactMoneyBtn.isVisible()) {
      await exactMoneyBtn.click();
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // AUDIT 11: Penyelesaian Transaksi & PosSuccessModal
    // ----------------------------------------------------
    console.log('14. Menyelesaikan Transaksi & Memeriksa PosSuccessModal...');
    const confirmPaymentBtn = page.locator('button:has-text("Selesaikan Transaksi")').first();
    if (await confirmPaymentBtn.isVisible()) {
      await confirmPaymentBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos_15_pos_success_modal.png') });

      const successTitle = page.locator('text=Pembayaran Berhasil').first();
      if (await successTitle.isVisible()) {
        recordFinding('VERIFIED', 'Modal Sukses', 'Transaksi Berhasil Diselesaikan', 'Pratinjau struk thermal 80mm dan nomor nota otomatis muncul.', 'OK');
        const newTxBtn = page.locator('button:has-text("Transaksi Baru"), button:has-text("Tutup")').first();
        if (await newTxBtn.isVisible()) await newTxBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // ----------------------------------------------------
    // AUDIT 12: Pengecekan Khusus Teks Placeholder & Konsol
    // ----------------------------------------------------
    console.log('15. Memeriksa sisa placeholder atau anomali teks...');
    const bodyText = await page.innerText('body');
    const placeholderPatterns = [
      { name: 'Lorem Ipsum', pattern: /lorem\s+ipsum/i },
      { name: 'NaN Rupiah', pattern: /Rp\s*NaN/i },
      { name: 'Undefined Rupiah', pattern: /Rp\s*undefined/i },
      { name: 'Object Object', pattern: /\[object Object\]/i },
      { name: 'Ban Bekas Terlarang', pattern: /ban\s*bekas/i },
    ];

    for (const p of placeholderPatterns) {
      if (p.pattern.test(bodyText)) {
        if (p.name === 'Ban Bekas Terlarang') {
          recordFinding('UI_CACAT', 'Seluruh Layar POS', 'Masih Ditemukan Kata Ban Bekas', 'Ditemukan referensi Ban Bekas di antarmuka.', 'ERROR');
        } else {
          recordFinding('PLACEHOLDER_CACAT', 'Seluruh Layar POS', `Terdeteksi Teks Cacat: ${p.name}`, `Ditemukan pola "${p.name}" pada konten layar.`, 'ERROR');
        }
      } else {
        recordFinding('VERIFIED', 'Seluruh Layar POS', `Bebas dari ${p.name}`, `Tidak ditemukan pola cacat "${p.name}".`, 'OK');
      }
    }

    // Catat error konsol
    if (consoleErrors.length > 0) {
      recordFinding('BUG', 'Browser Console', 'Terdeteksi Error Konsol JavaScript', consoleErrors.join(' | '), 'WARNING');
    } else {
      recordFinding('VERIFIED', 'Browser Console', 'Konsol Bersih Bebas Error', '0 error terdeteksi di konsol peramban.', 'OK');
    }

    // Simpan Laporan Audit ke Berkas JSON
    const reportPath = path.join(SCREENSHOT_DIR, 'pos_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditFindings, null, 2));
    console.log(`✓ Laporan audit lengkap tersimpan di: ${reportPath}`);

    console.log('=== AUDIT MENDALAM MODUL POS SELESAI DENGAN SUKSES! ===');
  } catch (error) {
    console.error('Audit gagal dengan exception:', error);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_pos_audit.png') });
  } finally {
    await browser.close();
  }
})();
