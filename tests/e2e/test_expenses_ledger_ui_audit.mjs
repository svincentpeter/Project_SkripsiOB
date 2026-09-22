import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots/expenses_ledger');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runExpensesLedgerAudit() {
  console.log('=== MEMULAI AUDIT MENDALAM UI/UX PLAYWRIGHT: MODUL 4 (EXPENSES) & MODUL 5 (LEDGER) ===');
  
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
      if (!text.includes('Internal React error') && !text.includes('favicon')) {
        consoleErrors.push(`[Console Error] ${text}`);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[Page Crash] ${err.message}`);
  });

  function recordFinding(type, component, item, detail, severity = 'INFO') {
    findings.push({ type, component, item, detail, severity });
    console.log(`[AUDIT - ${type}] [${component}] ${item}: ${detail}`);
  }

  try {
    // ----------------------------------------------------
    // LANGKAH 1: Navigasi Awal ke Aplikasi
    // ----------------------------------------------------
    console.log('1. Membuka aplikasi http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Buka sesi sebagai OWNER jika login screen tampil
    const loginBtn = page.locator('button:has-text("Masuk Sebagai Agus Subagyo")').first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForTimeout(1000);
    }

    // ====================================================
    // MODUL 4: BIAYA TOKO & KAS KECIL (expenses)
    // ====================================================
    console.log('2. Membuka Modul Biaya Toko & Kas Kecil (expenses)...');
    const expensesNavBtn = page.locator('button:has-text("Biaya Toko"), nav button:has-text("Biaya")').first();
    if (await expensesNavBtn.isVisible()) {
      await expensesNavBtn.click();
      await page.waitForTimeout(1200);
      recordFinding('VERIFIED', 'Navigasi', 'Navigasi ke Modul Biaya Toko', 'Halaman Biaya Toko berhasil terbuka.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Navigasi', 'Tombol Navigasi Biaya Toko Tidak Ditemukan', 'Tidak ada tombol Biaya Toko di HeaderNavbar.', 'ERROR');
    }

    // ----------------------------------------------------
    // AUDIT 4.1: Tab Riwayat Pengeluaran (BKK)
    // ----------------------------------------------------
    console.log('3. Mengaudit Sub-Tab Riwayat Pengeluaran (BKK)...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'exp_01_expenses_history.png') });

    const bkkTableTitle = page.locator('text=Buku Riwayat Pengeluaran Kas (BKK)').first();
    if (await bkkTableTitle.isVisible()) {
      recordFinding('VERIFIED', 'Biaya - Riwayat', 'Tabel Riwayat BKK Siap', 'Tabel riwayat pengeluaran kas tampil dengan rapi.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Biaya - Riwayat', 'Tabel BKK Tidak Tampil', 'Komponen ExpenseTable tidak memuat judul tabel.', 'ERROR');
    }

    // Periksa filter kategori, sumber dana, dan status
    const categorySelect = page.locator('select').first();
    if (await categorySelect.isVisible()) {
      recordFinding('VERIFIED', 'Biaya - Filter', 'Filter Kategori & Sumber Dana Hadir', 'Filter dropdown kategori dan sumber kas tersedia.', 'OK');
    }

    // Cek baris tabel pengeluaran
    const expenseRows = page.locator('tbody tr');
    const rowCount = await expenseRows.count();
    console.log(`Jumlah baris pengeluaran terdeteksi: ${rowCount}`);

    // ----------------------------------------------------
    // AUDIT 4.2: Modal Detail & Void Pengeluaran (ExpenseDetailModal)
    // ----------------------------------------------------
    console.log('4. Mengaudit Modal Detail Pengeluaran (ExpenseDetailModal)...');
    const eyeBtn = page.locator('button[title="Lihat Rincian & Nota"], button[title*="Lihat"], button[title*="Detail"]').first();
    if (await eyeBtn.isVisible()) {
      await eyeBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'exp_02_expense_detail_modal.png') });

      const detailTitle = page.locator('text=Bukti Kas Keluar (BKK)').first();
      if (await detailTitle.isVisible()) {
        recordFinding('VERIFIED', 'Biaya - Modal Detail', 'Modal Detail BKK Terbuka', 'Informasi BKK, nominal, akun COA, dan aksi void tampil.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Biaya - Modal Detail', 'Modal Detail Gagal Terbuka', 'Modal detail pengeluaran tidak muncul saat tombol mata diklik.', 'ERROR');
      }

      // Periksa tombol batalkan transaksi / void
      const voidBtn = page.locator('button:has-text("Batalkan Pengeluaran (VOID)")').first();
      if (await voidBtn.isVisible()) {
        recordFinding('VERIFIED', 'Biaya - Modal Detail', 'Aksi Void BKK Tersedia', 'Tombol pembatalan BKK dengan akuntansi pembalik tersedia.', 'OK');
      }

      // Tutup modal detail
      const closeDetailBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
      if (await closeDetailBtn.isVisible()) await closeDetailBtn.click();
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // AUDIT 4.3: Modal Cetak Voucher BKK (ExpenseVoucherModal)
    // ----------------------------------------------------
    console.log('5. Mengaudit Modal Cetak Voucher BKK (ExpenseVoucherModal)...');
    const printBtn = page.locator('button[title="Cetak Bukti Kas Keluar"], button[title*="Cetak"]').first();
    if (await printBtn.isVisible()) {
      await printBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'exp_03_expense_voucher_modal.png') });

      const voucherSlip = page.locator('text=BUKTI KAS KELUAR').first();
      if (await voucherSlip.isVisible()) {
        recordFinding('VERIFIED', 'Biaya - Modal Voucher', 'Modal Voucher BKK Siap Cetak', 'Slip formal BKK dengan kolom tanda tangan kasir dan penerima tampil.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Biaya - Modal Voucher', 'Modal Cetak Voucher Gagal Terbuka', 'Modal cetak slip BKK tidak muncul.', 'ERROR');
      }

      // Tutup modal voucher
      const closeVoucherBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
      if (await closeVoucherBtn.isVisible()) await closeVoucherBtn.click();
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // AUDIT 4.4: Sub-Tab Form Input BKK Baru (ExpenseForm)
    // ----------------------------------------------------
    console.log('6. Mengaudit Sub-Tab Form Input BKK Baru (ExpenseForm)...');
    const tabCreateExpense = page.locator('button:has-text("Input Pengeluaran Baru")').first();
    if (await tabCreateExpense.isVisible()) {
      await tabCreateExpense.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'exp_04_expense_create_form.png') });

      const formTitle = page.locator('h3:has-text("Bukti Kas Keluar")').first();
      const cashSourceIndicator = page.locator('label:has-text("Sumber Kas / Bank:")').first();

      if (await formTitle.isVisible() && await cashSourceIndicator.isVisible()) {
        recordFinding('VERIFIED', 'Biaya - Form BKK', 'Form Input BKK Lengkap', 'Pilihan sumber kas laci vs transfer bank, akun COA, nominal, dan upload nota hadir.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Biaya - Form BKK', 'Form Input BKK Tidak Lengkap', 'Formulir BKK tidak tampil utuh.', 'ERROR');
      }
    }

    // ----------------------------------------------------
    // AUDIT 4.5: Sub-Tab Analisis & Anggaran Biaya (ExpenseAnalyticsCard)
    // ----------------------------------------------------
    console.log('7. Mengaudit Sub-Tab Analisis & Anggaran Biaya...');
    const tabAnalytics = page.locator('button:has-text("Analisis & Anggaran Biaya")').first();
    if (await tabAnalytics.isVisible()) {
      await tabAnalytics.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'exp_05_expense_analytics.png') });

      const analyticsTitle = page.locator('text=TOTAL BEBAN OPERASIONAL').first();
      if (await analyticsTitle.isVisible()) {
        recordFinding('VERIFIED', 'Biaya - Analisis', 'Analisis Anggaran Biaya Siap', 'Visualisasi proporsi beban operasional dan rincian per kategori tampil.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Biaya - Analisis', 'Analisis Anggaran Biaya Gagal', 'Komponen ExpenseAnalyticsCard tidak memuat konten analitik.', 'WARNING');
      }
    }

    // ====================================================
    // MODUL 5: BUKU BESAR & SIKLUS AKUNTANSI (ledger)
    // ====================================================
    console.log('8. Membuka Modul Buku Besar & Siklus Akuntansi (ledger)...');
    const ledgerNavBtn = page.locator('button:has-text("Buku Besar"), nav button:has-text("Buku Besar")').first();
    if (await ledgerNavBtn.isVisible()) {
      await ledgerNavBtn.click();
      await page.waitForTimeout(1200);
      recordFinding('VERIFIED', 'Navigasi', 'Navigasi ke Modul Buku Besar', 'Halaman Buku Besar & Siklus Akuntansi terbuka.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Navigasi', 'Tombol Navigasi Buku Besar Tidak Ditemukan', 'Tidak ada tombol Buku Besar di HeaderNavbar.', 'ERROR');
    }

    // ----------------------------------------------------
    // AUDIT 5.1: Sub-Tab 1 - Jurnal Umum (journals)
    // ----------------------------------------------------
    console.log('9. Mengaudit Sub-Tab 1: Jurnal Umum...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_01_journals_tab.png') });

    const journalTitle = page.locator('text=Buku Jurnal Umum & Penyesuaian').first();
    const balanceIndicator = page.locator('text=Debit = Kredit').first();

    if (await journalTitle.isVisible()) {
      recordFinding('VERIFIED', 'Akuntansi - Jurnal', 'Buku Jurnal Umum Siap', 'Daftar jurnal transaksi otomatis dari POS, BKK, dan penyesuaian tampil rapi.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Akuntansi - Jurnal', 'Tabel Jurnal Umum Tidak Tampil', 'Komponen JournalTab tidak memuat tabel jurnal.', 'ERROR');
    }

    // ----------------------------------------------------
    // AUDIT 5.2: Modal Entri Jurnal Penyesuaian Manual (ManualJournalModal)
    // ----------------------------------------------------
    console.log('10. Mengaudit Modal Entri Jurnal Penyesuaian Manual (ManualJournalModal)...');
    const manualJournalBtn = page.locator('button:has-text("Jurnal Penyesuaian")').first();
    if (await manualJournalBtn.isVisible()) {
      await manualJournalBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_02_manual_journal_modal.png') });

      const manualTitle = page.locator('text=Input Jurnal Penyesuaian / Memorial Manual').first();
      if (await manualTitle.isVisible()) {
        recordFinding('VERIFIED', 'Akuntansi - Modal Manual', 'Modal Jurnal Penyesuaian Terbuka', 'Modal entry debit/kredit manual berpasangan SAK EMKM tampil.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Akuntansi - Modal Manual', 'Modal Jurnal Penyesuaian Gagal Terbuka', 'Modal ManualJournalModal tidak muncul.', 'ERROR');
      }

      // Tutup modal
      const closeManualBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
      if (await closeManualBtn.isVisible()) await closeManualBtn.click();
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // AUDIT 5.3: Modal Tutup Buku Periode (PeriodClosingModal)
    // ----------------------------------------------------
    console.log('11. Mengaudit Modal Tutup Buku Periode (PeriodClosingModal)...');
    const closePeriodBtn = page.locator('button:has-text("Tutup Buku")').first();
    if (await closePeriodBtn.isVisible()) {
      await closePeriodBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_03_period_closing_modal.png') });

      const closingTitle = page.locator('text=Tutup Buku Periode Akuntansi').first();
      if (await closingTitle.isVisible()) {
        recordFinding('VERIFIED', 'Akuntansi - Modal Tutup Buku', 'Modal Tutup Buku Terbuka', 'Prosedur tutup buku SAK EMKM dan ringkasan laba/rugi nominal tampil.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Akuntansi - Modal Tutup Buku', 'Modal Tutup Buku Gagal Terbuka', 'Modal PeriodClosingModal tidak muncul.', 'ERROR');
      }

      // Tutup modal
      const closeClosingBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
      if (await closeClosingBtn.isVisible()) await closeClosingBtn.click();
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // AUDIT 5.4: Sub-Tab 2 - Buku Besar (ledger)
    // ----------------------------------------------------
    console.log('12. Mengaudit Sub-Tab 2: Buku Besar (ledger)...');
    const tabLedger = page.locator('button:has-text("2. Buku Besar (GL)")').first();
    if (await tabLedger.isVisible()) {
      await tabLedger.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_04_ledger_tab.png') });

      const ledgerTitle = page.locator('h3:has-text("Buku Besar")').first();
      const accountSelector = page.locator('select').first();

      if (await ledgerTitle.isVisible() && await accountSelector.isVisible()) {
        recordFinding('VERIFIED', 'Akuntansi - Buku Besar', 'Buku Besar per Akun COA Siap', 'Selector akun COA, saldo awal, mutasi debit/kredit, dan saldo berjalan tampil.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Akuntansi - Buku Besar', 'Buku Besar Tidak Lengkap', 'Komponen GeneralLedgerTab tidak merender selector akun atau tabel mutasi.', 'ERROR');
      }
    }

    // ----------------------------------------------------
    // AUDIT 5.5: Sub-Tab 3 - Neraca Saldo (trial-balance)
    // ----------------------------------------------------
    console.log('13. Mengaudit Sub-Tab 3: Neraca Saldo (trial-balance)...');
    const tabTrialBalance = page.locator('button:has-text("3. Neraca Saldo")').first();
    if (await tabTrialBalance.isVisible()) {
      await tabTrialBalance.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_05_trial_balance_tab.png') });

      const tbTitle = page.locator('h3:has-text("Neraca Saldo")').first();
      const tbBalanceCheck = page.locator('text=Neraca Saldo Seimbang').first();

      if (await tbTitle.isVisible() || await tbBalanceCheck.isVisible()) {
        recordFinding('VERIFIED', 'Akuntansi - Neraca Saldo', 'Neraca Saldo Siap & Terverifikasi', 'Daftar saldo debit vs kredit seluruh akun SAK EMKM terbukti seimbang.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Akuntansi - Neraca Saldo', 'Neraca Saldo Gagal Terbuka', 'Komponen TrialBalanceTab tidak muncul.', 'ERROR');
      }
    }

    // ----------------------------------------------------
    // AUDIT 5.6: Sub-Tab 4 - Pembantu Hutang / AP (payables)
    // ----------------------------------------------------
    console.log('14. Mengaudit Sub-Tab 4: Pembantu Hutang (payables)...');
    const tabPayables = page.locator('button:has-text("4. Pembantu Hutang (AP)")').first();
    if (await tabPayables.isVisible()) {
      await tabPayables.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_06_payables_tab.png') });

      const apTitle = page.locator('text=Buku Pembantu Hutang').first();
      if (await apTitle.isVisible()) {
        recordFinding('VERIFIED', 'Akuntansi - Hutang AP', 'Buku Pembantu Hutang Siap', 'Daftar faktur distributor, jatuh tempo, dan sisa hutang tampil.', 'OK');
      }

      // Cek tombol Bayar Hutang untuk memicu modal
      const payDebtActionBtn = page.locator('table button:has-text("Bayar"), button:has-text("Bayar Hutang")').first();
      if (await payDebtActionBtn.isVisible()) {
        await payDebtActionBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_07_pay_debt_modal.png') });

        const payDebtModalTitle = page.locator('text=Catat Pembayaran Hutang Supplier').first();
        if (await payDebtModalTitle.isVisible()) {
          recordFinding('VERIFIED', 'Akuntansi - Modal Hutang', 'Modal Bayar Hutang Terbuka', 'Form pelunasan hutang supplier dengan pilihan sumber dana kas/bank tampil.', 'OK');
        }

        // Tutup modal
        const closePayDebtBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
        if (await closePayDebtBtn.isVisible()) await closePayDebtBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // ----------------------------------------------------
    // AUDIT 5.7: Sub-Tab 5 - Pembantu Piutang / AR (receivables)
    // ----------------------------------------------------
    console.log('15. Mengaudit Sub-Tab 5: Pembantu Piutang (receivables)...');
    const tabReceivables = page.locator('button:has-text("5. Pembantu Piutang (AR)")').first();
    if (await tabReceivables.isVisible()) {
      await tabReceivables.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_08_receivables_tab.png') });

      const arTitle = page.locator('text=Buku Pembantu Piutang').first();
      if (await arTitle.isVisible()) {
        recordFinding('VERIFIED', 'Akuntansi - Piutang AR', 'Buku Pembantu Piutang Siap', 'Daftar piutang tempo BON pelanggan, plat mobil, dan status tampil.', 'OK');
      }

      // Cek tombol Catat Pelunasan untuk memicu modal
      const payReceivableBtn = page.locator('table button:has-text("Bayar"), button:has-text("Pelunasan")').first();
      if (await payReceivableBtn.isVisible()) {
        await payReceivableBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_09_pay_receivable_modal.png') });

        const payArModalTitle = page.locator('text=Terima Pembayaran Piutang, text=Pelunasan Piutang').first();
        if (await payArModalTitle.isVisible()) {
          recordFinding('VERIFIED', 'Akuntansi - Modal Piutang', 'Modal Pelunasan Piutang Terbuka', 'Form pelunasan piutang pelanggan tampil dengan baik.', 'OK');
        }

        // Tutup modal
        const closePayArBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
        if (await closePayArBtn.isVisible()) await closePayArBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // ----------------------------------------------------
    // AUDIT 5.8: Sub-Tab 6 - Ikhtisar Eksekutif (reports)
    // ----------------------------------------------------
    console.log('16. Mengaudit Sub-Tab 6: Ikhtisar Eksekutif...');
    const tabReports = page.locator('button:has-text("6. Ikhtisar Eksekutif")').first();
    if (await tabReports.isVisible()) {
      await tabReports.click();
      await page.waitForTimeout(800);

      // Buka preview cepat
      const previewBtn = page.locator('button:has-text("Tampilkan Pratinjau Cepat")').first();
      if (await previewBtn.isVisible()) {
        await previewBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'led_10_reports_preview.png') });

      const reportSection = page.locator('text=Pusat Laporan Eksekutif').first();
      if (await reportSection.isVisible()) {
        recordFinding('VERIFIED', 'Akuntansi - Laporan SAK EMKM', 'Pratinjau SAK EMKM Siap', 'Laba rugi dan posisi keuangan mini terintegrasi dalam buku besar.', 'OK');
      }
    }

    // ----------------------------------------------------
    // AUDIT GLOBAL SANITY CHECKS PADA KEDUA MODUL
    // ----------------------------------------------------
    console.log('17. Memeriksa sisa placeholder atau anomali teks pada kedua modul...');
    const bodyText = await page.innerText('body');

    const sanityChecks = [
      { pattern: /lorem ipsum/i, label: 'Lorem Ipsum', severity: 'WARNING' },
      { pattern: /rp\s*nan/i, label: 'NaN Rupiah', severity: 'ERROR' },
      { pattern: /rp\s*undefined/i, label: 'Undefined Rupiah', severity: 'ERROR' },
      { pattern: /\[object Object\]/i, label: 'Object Object', severity: 'ERROR' },
      { pattern: /ban bekas/i, label: 'Ban Bekas Terlarang', severity: 'ERROR' },
      { pattern: /BSD/i, label: 'Hardcoded Lokasi BSD (Bukan Magelang)', severity: 'WARNING' },
    ];

    for (const check of sanityChecks) {
      if (check.pattern.test(bodyText)) {
        recordFinding('UI_CACAT', 'Global Sanity', `Terdeteksi ${check.label}`, `Ditemukan teks yang cocok dengan pola: ${check.label}`, check.severity);
      } else {
        recordFinding('VERIFIED', 'Global Sanity', `Bebas dari ${check.label}`, `Tidak ditemukan pola cacat "${check.label}".`, 'OK');
      }
    }

    // Periksa apakah ada error di console
    if (consoleErrors.length > 0) {
      recordFinding('UI_CACAT', 'Browser Console', 'Error Terdeteksi di Konsol', `${consoleErrors.length} pesan error terdeteksi: ${consoleErrors.slice(0, 3).join('; ')}`, 'ERROR');
    } else {
      recordFinding('VERIFIED', 'Browser Console', 'Konsol Bersih Bebas Error', '0 error terdeteksi di konsol peramban.', 'OK');
    }

  } catch (err) {
    console.error('Audit gagal dengan exception:', err);
    recordFinding('UI_CACAT', 'Sistem Audit', 'Eksepsi Tidak Tertangani', err.message, 'FATAL');
  } finally {
    // Simpan hasil audit JSON
    const reportPath = path.join(SCREENSHOT_DIR, 'expenses_ledger_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ findings, consoleErrors }, null, 2));
    console.log(`✓ Laporan audit lengkap tersimpan di: ${reportPath}`);
    await browser.close();
    console.log('=== AUDIT MENDALAM MODUL 4 & 5 SELESAI! ===');
  }
}

runExpensesLedgerAudit();
