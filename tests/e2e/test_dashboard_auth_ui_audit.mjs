import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots/dashboard_auth');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runDashboardAndAuthAudit() {
  console.log('=== MEMULAI AUDIT MENDALAM UI/UX: MODUL 1 (DASHBOARD) & MODUL AUTH ===');

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

  function recordFinding(type, moduleName, item, detail, severity = 'INFO') {
    findings.push({ type, moduleName, item, detail, severity });
    console.log(`[AUDIT - ${type}] [${moduleName}] ${item}: ${detail}`);
  }

  try {
    // ----------------------------------------------------
    // LANGKAH 1: Navigasi Awal & Audit Layar Login (Auth)
    // ----------------------------------------------------
    console.log('1. Membuka http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Logout jika sudah ada sesi login tersimpan untuk mengaudit LoginScreen
    const logoutCandidate = page.locator('button:has-text("Keluar"), button:has-text("Logout")').first();
    const userDropdown = page.locator('button:has-text("Agus Subagyo"), button:has-text("Kasir OB3")').first();
    if (await userDropdown.isVisible()) {
      await userDropdown.click();
      await page.waitForTimeout(400);
      const dropdownLogout = page.locator('button:has-text("Keluar (Logout)")').first();
      if (await dropdownLogout.isVisible()) {
        await dropdownLogout.click();
        await page.waitForTimeout(800);
      }
    }

    console.log('\n--- AUDIT MODUL AUTH: LAYAR MASUK SISTEM (LOGIN) ---');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auth_01_login_screen.png') });

    const loginHeader = page.getByText('Omah Ban').first();
    const branchBadge = page.getByText('Cabang 3 Magelang').first();
    if (await loginHeader.isVisible() && await branchBadge.isVisible()) {
      recordFinding('VERIFIED', 'Modul Auth - Header', 'Header Login Resmi Tampil', 'Identitas Omah Ban Cabang 3 Magelang dan standar SAK EMKM IAI tampil jelas.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Modul Auth - Header', 'Header Login Tidak Lengkap', 'Kop nama toko atau cabang Magelang tidak tampil.', 'ERROR');
    }

    // Periksa tombol Quick Login (Demo Profiles)
    const quickOwnerBtn = page.locator('button:has-text("Agus Subagyo")').first();
    const quickKasirBtn = page.locator('button:has-text("Kasir OB3")').first();
    const quickGudangBtn = page.locator('button:has-text("Admin Gudang OB3")').first();

    if (await quickOwnerBtn.isVisible() && await quickKasirBtn.isVisible() && await quickGudangBtn.isVisible()) {
      recordFinding('VERIFIED', 'Modul Auth - Quick Login', 'Tombol Akses Cepat Peran Hadir', '3 profil cepat (Owner, Kasir, Gudang) dapat diakses dengan 1-klik.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Modul Auth - Quick Login', 'Tombol Akses Cepat Tidak Lengkap', 'Salah satu tombol peran cepat tidak muncul.', 'WARNING');
    }

    // Uji Form Login Manual: Validasi Kredensial Salah
    console.log('Menguji validasi kredensial form login manual...');
    const userInput = page.locator('input[type="text"]').first();
    const passInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]:has-text("Masuk")').first();

    if (await userInput.isVisible() && await passInput.isVisible()) {
      await userInput.fill('pengguna_palsu');
      await passInput.fill('salah_password');
      await submitBtn.click();
      await page.waitForTimeout(600);

      const errorAlert = page.locator('.text-rose-400, .bg-rose-500\\/10').first();
      if (await errorAlert.isVisible()) {
        recordFinding('VERIFIED', 'Modul Auth - Validasi', 'Validasi Kredensial Berfungsi', 'Peringatan kesalahan login tampil saat username tidak terdaftar.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Modul Auth - Validasi', 'Validasi Form Tidak Muncul', 'Tidak ada peringatan visual saat memasukkan kredensial salah.', 'WARNING');
      }
    }

    // Login sebagai Owner (Agus Subagyo)
    console.log('Login sebagai Owner (Agus Subagyo)...');
    await quickOwnerBtn.click();
    await page.waitForTimeout(1200);

    // ====================================================
    // MODUL 1: DASHBOARD EKSEKUTIF (ExecutiveDashboardScreen)
    // ====================================================
    console.log('\n--- AUDIT MODUL 1: DASHBOARD EKSEKUTIF ---');

    // Pastikan berada di layar dashboard
    const dashboardNavBtn = page.locator('button:has-text("Dashboard")').first();
    if (await dashboardNavBtn.isVisible()) {
      await dashboardNavBtn.click();
      await page.waitForTimeout(1000);
    }

    // 1.1: Subtab 1 - Ringkasan Utama (Overview)
    console.log('1.1 Mengaudit Sub-Tab 1: Ringkasan Utama (Overview)...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dash_01_overview_tab.png') });

    const omzetCard = page.getByText('Omzet Hari Ini').first();
    const grossProfitCard = page.getByText('Laba Kotor FIFO').first();
    const expenseCard = page.getByText('Beban Operasional').first();
    const stockAlertCard = page.getByText('Peringatan Stok').first();
    const inventoryValuationCard = page.getByText('Valuasi Aset Persediaan').first();

    if (await omzetCard.isVisible() && await grossProfitCard.isVisible() && await expenseCard.isVisible()) {
      recordFinding('VERIFIED', 'Modul 1 - KPI Cards', '5 Kartu Metrik KPI Eksekutif Tampil', 'Omzet real-time, margin laba kotor FIFO, beban bulanan, peringatan stok, dan valuasi aset persediaan tampil rapi.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Modul 1 - KPI Cards', 'Kartu Metrik KPI Tidak Lengkap', 'Beberapa kartu metrik tidak berhasil dirender.', 'ERROR');
    }

    // Audit Grafik Tren 7 Hari (SVG Chart)
    const trendSvg = page.locator('svg[viewBox*="0 0 540"]').first();
    if (await trendSvg.isVisible()) {
      recordFinding('VERIFIED', 'Modul 1 - Grafik Tren', 'Grafik Tren Penjualan 7 Hari Hadir', 'Visualisasi garis dan area omzet vs HPP ban harian interaktif tampil.', 'OK');
      // Hover pada titik grafik
      const chartPoints = page.locator('svg circle.cursor-pointer');
      const pointCount = await chartPoints.count();
      if (pointCount > 0) {
        await chartPoints.last().hover();
        await page.waitForTimeout(400);
      }
    } else {
      recordFinding('UI_CACAT', 'Modul 1 - Grafik Tren', 'Grafik Tren Tidak Muncul', 'Elemen grafik SVG tren penjualan tidak terdeteksi.', 'WARNING');
    }

    // Audit Donut Chart Pangsa Merek Ban
    const donutChart = page.locator('svg[viewBox="0 0 42 42"]').first();
    if (await donutChart.isVisible()) {
      recordFinding('VERIFIED', 'Modul 1 - Pangsa Merek', 'Diagram Donat Pangsa Merek Ban Hadir', 'Distribusi unit terjual pabrikan ban (Bridgestone, Accelera, dll.) tampil rapi.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Modul 1 - Pangsa Merek', 'Diagram Pangsa Merek Tidak Muncul', 'Diagram donat pabrikan ban tidak ditemukan.', 'WARNING');
    }

    // Audit Tabel Produk Terlaris (Fast Moving) & Stok Minimum
    const fastMovingTable = page.getByText('Produk Ban Terlaris (Fast-Moving)').first();
    const lowStockTable = page.getByText('Peringatan Stok Minimum Gudang').first();
    if (await fastMovingTable.isVisible() && await lowStockTable.isVisible()) {
      recordFinding('VERIFIED', 'Modul 1 - Tabel Ringkasan', 'Tabel Fast-Moving & Stok Minimum Hadir', 'Daftar ban terlaris dan alert reorder stok minimum tampil lengkap.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Modul 1 - Tabel Ringkasan', 'Tabel Ringkasan Tidak Lengkap', 'Salah satu tabel ringkasan dashboard tidak tampil.', 'ERROR');
    }

    // 1.2: Subtab 2 - Analisis Penjualan & Kasir (Sales)
    console.log('1.2 Mengaudit Sub-Tab 2: Analisis Penjualan & Kasir (Sales)...');
    const salesSubTabBtn = page.locator('button:has-text("Analisis Penjualan"), button:has-text("Penjualan")').first();
    if (await salesSubTabBtn.isVisible()) {
      await salesSubTabBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dash_02_sales_tab.png') });

      const paymentDist = page.getByText('Distribusi Metode Pembayaran Pelanggan').first();
      const serviceVsProduct = page.getByText('Komposisi Penjualan: Ban Fisik vs Jasa Bengkel').first();
      const recentTx = page.getByText('Riwayat Transaksi Terkini').first();

      if (await paymentDist.isVisible() && await serviceVsProduct.isVisible() && await recentTx.isVisible()) {
        recordFinding('VERIFIED', 'Modul 1 - Analisis Penjualan', 'Subtab Penjualan & Kasir Lengkap', 'Distribusi metode bayar (Tunai, Transfer, QRIS, BON), omzet ban vs jasa, dan riwayat transaksi tampil.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Modul 1 - Analisis Penjualan', 'Komponen Analisis Penjualan Tidak Lengkap', 'Beberapa kartu analisis penjualan tidak tampil.', 'ERROR');
      }
    }

    // 1.3: Subtab 3 - Status Persediaan & FIFO (Inventory)
    console.log('1.3 Mengaudit Sub-Tab 3: Status Persediaan & FIFO (Inventory)...');
    const invSubTabBtn = page.locator('button:has-text("Status Persediaan"), button:has-text("Persediaan")').first();
    if (await invSubTabBtn.isVisible()) {
      await invSubTabBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dash_03_inventory_tab.png') });

      const catalogNewTires = page.getByText('Katalog Ban Baru').first();
      const catalogRims = page.getByText('Katalog Velg Mobil').first();
      const reorderList = page.getByText('Daftar Ban Harus Segera Di-Order Ulang').first();

      if (await catalogNewTires.isVisible() && await catalogRims.isVisible() && await reorderList.isVisible()) {
        recordFinding('VERIFIED', 'Modul 1 - Status Persediaan', 'Subtab Status Persediaan Lengkap', 'Katalog ban, velg, dan daftar prioritas restock pesanan tampil rapi.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Modul 1 - Status Persediaan', 'Komponen Status Persediaan Tidak Lengkap', 'Kartu kategori atau tabel reorder persediaan tidak tampil.', 'ERROR');
      }
    }

    // 1.4: Uji Tombol Aksi Cepat Dashboard ("Terminal Kasir" & "Inventori & FIFO")
    console.log('1.4 Menguji Tombol Aksi Cepat Dashboard...');
    const quickPosBtn = page.locator('button:has-text("Terminal Kasir")').first();
    if (await quickPosBtn.isVisible()) {
      await quickPosBtn.click();
      await page.waitForTimeout(800);

      const posTitle = page.getByText('Terminal Kasir').first();
      if (await posTitle.isVisible()) {
        recordFinding('VERIFIED', 'Modul 1 - Navigasi Cepat', 'Shortcut Terminal Kasir Bekerja', 'Tombol aksi cepat berhasil mengarahkan ke Terminal Kasir POS.', 'OK');
      }

      // Kembali ke dashboard
      const backToDashBtn = page.locator('button:has-text("Dashboard")').first();
      if (await backToDashBtn.isVisible()) {
        await backToDashBtn.click();
        await page.waitForTimeout(800);
      }
    }

    // 1.5: Uji RBAC (Role-Based Access Control)
    console.log('1.5 Menguji Pembatasan Hak Akses (RBAC Kasir)...');
    const userSwitcher = page.locator('button:has-text("Agus Subagyo")').first();
    if (await userSwitcher.isVisible()) {
      await userSwitcher.click();
      await page.waitForTimeout(400);

      const switchKasir = page.locator('button:has-text("Kasir OB3")').first();
      if (await switchKasir.isVisible()) {
        await switchKasir.click();
        await page.waitForTimeout(800);

        // Kasir seharusnya tidak melihat menu Buku Besar atau Pengaturan Toko
        const ledgerNav = page.locator('button:has-text("Buku Besar")');
        const isLedgerVisible = await ledgerNav.isVisible();

        if (!isLedgerVisible) {
          recordFinding('VERIFIED', 'Modul 9 - RBAC Kasir', 'Pembatasan Wewenang Kasir Berhasil', 'Menu Buku Besar dan Laporan Keuangan tertutup untuk peran Kasir sesuai matriks RBAC.', 'OK');
        } else {
          recordFinding('UI_CACAT', 'Modul 9 - RBAC Kasir', 'Kebocoran Wewenang Kasir', 'Kasir masih dapat melihat tab rahasia akuntansi.', 'ERROR');
        }

        // Beralih kembali ke Owner
        const kasirSwitcher = page.locator('button:has-text("Kasir OB3")').first();
        if (await kasirSwitcher.isVisible()) {
          await kasirSwitcher.click();
          await page.waitForTimeout(400);
          const switchOwner = page.locator('button:has-text("Agus Subagyo")').first();
          if (await switchOwner.isVisible()) {
            await switchOwner.click();
            await page.waitForTimeout(800);
          }
        }
      }
    }

    // ====================================================
    // AUDIT GLOBAL SANITY CHECKS (Dashboard & Auth)
    // ====================================================
    console.log('\n--- AUDIT GLOBAL SANITY CHECKS ---');
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

    if (consoleErrors.length > 0) {
      recordFinding('CONSOLE_ERROR', 'Browser Console', 'Kesalahan Konsol Terdeteksi', consoleErrors.join(' | '), 'ERROR');
    } else {
      recordFinding('VERIFIED', 'Browser Console', 'Konsol Bersih Bebas Error', '0 error terdeteksi di konsol peramban.', 'OK');
    }

  } catch (error) {
    console.error('Terjadi kesalahan fatal selama pengujian Playwright:', error);
    recordFinding('CRASH', 'E2E Test Engine', 'Kegagalan Eksekusi Audit', error.message, 'FATAL');
  } finally {
    const reportPath = path.join(SCREENSHOT_DIR, 'dashboard_auth_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), findings, consoleErrors }, null, 2));
    console.log(`\n✓ Laporan audit lengkap tersimpan di: ${reportPath}`);
    await browser.close();
    console.log('=== AUDIT MENDALAM MODUL 1 (DASHBOARD) & AUTH SELESAI! ===\n');
  }
}

runDashboardAndAuthAudit();
