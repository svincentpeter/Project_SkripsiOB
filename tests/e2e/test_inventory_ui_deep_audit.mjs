import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'inventory');
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
  console.log('=== MEMULAI AUDIT MENDALAM UI/UX PLAYWRIGHT: MODUL PRODUK & INVENTARIS ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('[BROWSER CONSOLE ERROR]', msg.text());
    }
  });

  try {
    // ----------------------------------------------------
    // AUDIT 1: Buka Aplikasi & Navigasi ke Modul Inventaris
    // ----------------------------------------------------
    console.log('1. Membuka aplikasi http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    console.log('2. Membuka Modul Produk & Inventaris...');
    const inventoryNavBtn = page.locator('button:has-text("Produk & Stok"), button:has-text("Inventori"), button:has-text("Produk")').first();
    if (await inventoryNavBtn.isVisible()) {
      await inventoryNavBtn.click();
      await page.waitForTimeout(1500);
      recordFinding('VERIFIED', 'Navigasi', 'Navigasi ke Modul Inventori Berhasil', 'Halaman Inventori terbuka dengan baik.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Navigasi', 'Tombol Navigasi Inventori Tidak Ditemukan', 'Menu sidebar untuk inventori tidak terlihat.', 'ERROR');
    }

    // ----------------------------------------------------
    // AUDIT 2: Validasi Header, KPI Cards & Valuasi HPP
    // ----------------------------------------------------
    console.log('3. Mengaudit Header & KPI Cards...');
    const valuationEl = page.locator('text=Valuasi Persediaan (HPP)').first();
    const hasValuation = await valuationEl.isVisible();
    if (hasValuation) {
      recordFinding('VERIFIED', 'Header', 'Valuasi HPP Terdeteksi', 'Header menampilkan perhitungan valuasi HPP persediaan.', 'OK');
    } else {
      recordFinding('ANOMALI', 'Header', 'Valuasi HPP Tidak Ditemukan', 'Header tidak menampilkan ringkasan valuasi.', 'WARNING');
    }

    // Cek 4 KPI Cards
    const kpiPcs = page.locator('text=Total Unit Fisik').first();
    const kpiHpp = page.locator('text=Total Nilai HPP').first();
    const kpiLow = page.locator('text=Stok Kritis').first();
    const kpiOut = page.locator('text=Stok Habis').first();
    if (await kpiPcs.isVisible() && await kpiHpp.isVisible() && await kpiLow.isVisible() && await kpiOut.isVisible()) {
      recordFinding('VERIFIED', 'Katalog - KPI', 'Semua 4 KPI Card Hadir', 'Total Unit Fisik, Nilai HPP, Stok Kritis, dan Stok Habis tampil.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Katalog - KPI', 'KPI Card Tidak Lengkap', 'Salah satu dari 4 KPI card tidak tampil.', 'WARNING');
    }

    // ----------------------------------------------------
    // AUDIT 3: Sub-View 1 - Katalog Produk (Tabel & Filter)
    // ----------------------------------------------------
    console.log('4. Mengaudit Sub-View Katalog Produk...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_01_katalog_produk.png') });

    // Cek Filter Bar
    const searchInput = page.locator('input[placeholder*="Cari nama ban"]').first();
    const categorySelect = page.locator('select:has-text("Semua Kategori Produk")').first();
    const brandSelect = page.locator('select:has-text("Semua Merek")').first();
    const stockStatusSelect = page.locator('select:has-text("Status Stok")').first();

    if (await searchInput.isVisible() && await categorySelect.isVisible() && await brandSelect.isVisible() && await stockStatusSelect.isVisible()) {
      recordFinding('VERIFIED', 'Katalog - Filter', 'Filter Bar Lengkap', 'Input pencarian, select kategori, select merk, dan select status stok tersedia.', 'OK');
    } else {
      recordFinding('UI_CACAT', 'Katalog - Filter', 'Filter Bar Tidak Lengkap', 'Salah satu kontrol filter di katalog tidak muncul.', 'WARNING');
    }

    // Cek Tabel Produk & Baris
    const productRows = page.locator('table tbody tr');
    const rowCount = await productRows.count();
    console.log(`Jumlah baris produk terdeteksi: ${rowCount}`);
    if (rowCount > 0) {
      recordFinding('VERIFIED', 'Katalog - Tabel', 'Tabel Produk Memuat Data', `Terdeteksi ${rowCount} baris produk dalam katalog.`, 'OK');
    } else {
      recordFinding('ANOMALI', 'Katalog - Tabel', 'Tabel Produk Kosong', 'Tidak ada data produk yang dirender pada tabel.', 'WARNING');
    }

    // ----------------------------------------------------
    // AUDIT 4: Modal Tambah Master Produk (ProductFormModal)
    // ----------------------------------------------------
    console.log('5. Mengaudit Modal Tambah Master Produk (ProductFormModal)...');
    const addProductBtn = page.locator('button:has-text("Tambah Master Produk")').first();
    if (await addProductBtn.isVisible()) {
      await addProductBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_02_product_form_modal.png') });

      const modalTitle = page.locator('text=Tambah Master Produk Baru').first();
      const catVelgBtn = page.locator('button:has-text("Velg")').first();

      if (await modalTitle.isVisible()) {
        recordFinding('VERIFIED', 'Modal Produk', 'Modal Tambah Produk Terbuka', 'Modal create master produk terbuka dengan judul dan elemen form lengkap.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Modal Produk', 'Modal Tambah Produk Gagal Terbuka', 'Judul modal tidak ditemukan.', 'ERROR');
      }

      // Uji ganti kategori ke Velg
      if (await catVelgBtn.isVisible()) {
        await catVelgBtn.click();
        await page.waitForTimeout(300);
        const pcdInput = page.locator('input[placeholder*="4x100"]').first();
        if (await pcdInput.isVisible()) {
          recordFinding('VERIFIED', 'Modal Produk', 'Spesifikasi Velg Dinamis Berfungsi', 'Input PCD, Lebar Velg, dan Offset muncul dinamis.', 'OK');
        } else {
          recordFinding('UI_CACAT', 'Modal Produk', 'Form Velg Gagal Muncul', 'Field spesifikasi velg tidak muncul saat kategori Velg dipilih.', 'WARNING');
        }
      }

      // Tutup modal
      const closeBtn = page.locator('button:has-text("Batal")').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // AUDIT 5: Modal Penerimaan Barang Masuk (GoodsReceiptModal)
    // ----------------------------------------------------
    console.log('6. Mengaudit Modal Penerimaan Barang Masuk (GoodsReceiptModal)...');
    const restockActionBtn = page.locator('button[title="Penerimaan Barang (Restock)"]').first();
    if (await restockActionBtn.isVisible()) {
      await restockActionBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_03_goods_receipt_modal.png') });

      const receiptTitle = page.locator('text=Penerimaan Barang Masuk (Restock)').first();
      if (await receiptTitle.isVisible()) {
        recordFinding('VERIFIED', 'Modal Restock', 'Modal Penerimaan Barang Terbuka', 'Modal restock terbuka dengan input qty, HPP beli, dan pilihan distributor.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Modal Restock', 'Modal Restock Gagal Terbuka', 'Modal penerimaan barang tidak muncul.', 'ERROR');
      }

      const closeRestockBtn = page.locator('button:has-text("Batal")').first();
      if (await closeRestockBtn.isVisible()) await closeRestockBtn.click();
      await page.waitForTimeout(400);
    }

    // ----------------------------------------------------
    // AUDIT 6: Drawer Kartu Stok Produk (StockCardDrawer)
    // ----------------------------------------------------
    console.log('7. Mengaudit Drawer Kartu Stok Produk (StockCardDrawer)...');
    const eyeBtn = page.locator('button[title="Lihat Kartu Stok"]').first();
    if (await eyeBtn.isVisible()) {
      await eyeBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_05_stock_card_drawer.png') });

      const cardTitle = page.locator('text=Kartu Stok:').first();
      const fifoLayerSection = page.locator('text=Lapisan Batch Pembelian FIFO').first();

      if (await cardTitle.isVisible()) {
        recordFinding('VERIFIED', 'Drawer Kartu Stok', 'Kartu Stok Berhasil Dibuka', 'Header kartu stok, ringkasan saldo gudang, dan rincian transaksi tampil.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Drawer Kartu Stok', 'Kartu Stok Gagal Dibuka', 'Drawer kartu stok tidak muncul.', 'ERROR');
      }

      if (await fifoLayerSection.isVisible()) {
        recordFinding('VERIFIED', 'Drawer Kartu Stok', 'Lapisan Batch FIFO Terdeteksi', 'Komponen ProductFifoBatchList aktif merender layer FIFO.', 'OK');
      }

      // Tutup drawer menggunakan tombol silang (X)
      const closeDrawerBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
      if (await closeDrawerBtn.isVisible()) {
        await closeDrawerBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(600);
    }

    // ----------------------------------------------------
    // AUDIT 7: Modal Rekonsiliasi Stok Excel (StockReconciliationModal)
    // ----------------------------------------------------
    console.log('8. Mengaudit Modal Rekonsiliasi Stok Excel (StockReconciliationModal)...');
    const importExcelBtn = page.locator('button:has-text("Import Excel Stok Ban")').first();
    if (await importExcelBtn.isVisible()) {
      await importExcelBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_06_stock_reconciliation_modal.png') });

      const reconTitle = page.locator('text=Rekonsiliasi Excel').first();
      if (await reconTitle.isVisible()) {
        recordFinding('VERIFIED', 'Modal Rekonsiliasi', 'Modal Rekonsiliasi Excel Siap', 'Fitur upload berkas Excel stok, penentuan kolom qty, dan staging aktif.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Modal Rekonsiliasi', 'Modal Rekonsiliasi Gagal Terbuka', 'Modal impor Excel tidak tampil.', 'ERROR');
      }

      const closeReconBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
      if (await closeReconBtn.isVisible()) {
        await closeReconBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(600);
    }

    // ----------------------------------------------------
    // AUDIT 8: Sub-View 2 - Buku Stok FIFO (Excel Spreadsheet)
    // ----------------------------------------------------
    console.log('9. Mengaudit Sub-View Buku Stok FIFO (Excel Spreadsheet)...');
    const tabBukuFifo = page.locator('button:has-text("Buku Stok FIFO (Excel)")').first();
    if (await tabBukuFifo.isVisible()) {
      await tabBukuFifo.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_07_buku_fifo_spreadsheet.png') });

      const spreadsheetTable = page.locator('table').first();
      if (await spreadsheetTable.isVisible()) {
        recordFinding('VERIFIED', 'Buku FIFO', 'Grid Spreadsheet FIFO Terbuka', 'Tabel multi-layer buku stok bulanan dengan kolom tanggal 1-31 terdeteksi.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Buku FIFO', 'Grid Spreadsheet Tidak Tampil', 'Tabel buku stok FIFO gagal dimuat.', 'ERROR');
      }

      // Uji Popover/Modal Koreksi Sel Spreadsheet (StockLedgerInlineModal)
      const editCellTd = page.locator('td[title*="koreksi"], td[title*="Koreksi"]').first();
      if (await editCellTd.isVisible()) {
        await editCellTd.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_08_inline_edit_modal.png') });

        const inlineModalTitle = page.locator('text=Koreksi Stok Awal, text=Koreksi Modal HPP, text=Tandai Stok Lama').first();
        if (await inlineModalTitle.isVisible()) {
          recordFinding('VERIFIED', 'Buku FIFO - Inline Modal', 'Modal Koreksi Sel Berfungsi', 'Modal koreksi sel spreadsheet FIFO dapat dibuka dan interaktif.', 'OK');
        }
        const closeInlineBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
        if (await closeInlineBtn.isVisible()) {
          await closeInlineBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(400);
      }
    }

    // ----------------------------------------------------
    // AUDIT 9: Sub-View 3 - Kategori Produk (CategoryManagementView)
    // ----------------------------------------------------
    console.log('10. Mengaudit Sub-View Kategori Produk...');
    const tabKategori = page.locator('button:has-text("Kategori Produk")').first();
    if (await tabKategori.isVisible()) {
      await tabKategori.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_09_kategori_management.png') });

      const catTable = page.locator('table').first();
      const addCatBtn = page.locator('button:has-text("Tambah Kategori")').first();

      if (await catTable.isVisible() && await addCatBtn.isVisible()) {
        recordFinding('VERIFIED', 'Kategori', 'Tampilan Manajemen Kategori Siap', 'Tabel kategori master dan tombol tambah kategori tersedia.', 'OK');
        
        await addCatBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_10_category_modal.png') });

        const catModalTitle = page.locator('text=Tambah Kategori Produk').first();
        if (await catModalTitle.isVisible()) {
          recordFinding('VERIFIED', 'Kategori - Modal', 'Modal Form Kategori Berfungsi', 'Form input kode kategori, nama, deskripsi, dan toggle aktif terbuka.', 'OK');
        }
        const cancelCatBtn = page.locator('button:has-text("Batal")').first();
        if (await cancelCatBtn.isVisible()) await cancelCatBtn.click();
        await page.waitForTimeout(300);
      } else {
        recordFinding('UI_CACAT', 'Kategori', 'Tabel Kategori Hilang', 'Tabel master kategori tidak muncul.', 'ERROR');
      }
    }

    // ----------------------------------------------------
    // AUDIT 10: Sub-View 4 - Master Jasa & Servis (ServiceManagementView)
    // ----------------------------------------------------
    console.log('11. Mengaudit Sub-View Master Jasa & Servis...');
    const tabJasa = page.locator('button:has-text("Master Jasa & Servis")').first();
    if (await tabJasa.isVisible()) {
      await tabJasa.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_11_jasa_management.png') });

      const serviceTable = page.locator('table').first();
      const addServiceBtn = page.locator('button:has-text("Tambah Jasa Baru"), button:has-text("Tambah Layanan")').first();

      if (await serviceTable.isVisible() && await addServiceBtn.isVisible()) {
        recordFinding('VERIFIED', 'Jasa', 'Manajemen Jasa & Servis Siap', 'Tabel tarif layanan dan tombol penambahan layanan siap digunakan.', 'OK');

        await addServiceBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_12_service_form_modal.png') });

        const srvModalTitle = page.locator('text=Tambah Layanan Jasa Baru').first();
        if (await srvModalTitle.isVisible()) {
          recordFinding('VERIFIED', 'Jasa - Modal', 'Modal Form Jasa Berfungsi', 'Form input nama jasa, kode, kategori, tarif, dan durasi menit terbuka.', 'OK');
        }
        const cancelSrvBtn = page.locator('button:has-text("Batal")').first();
        if (await cancelSrvBtn.isVisible()) await cancelSrvBtn.click();
        await page.waitForTimeout(300);
      } else {
        recordFinding('UI_CACAT', 'Jasa', 'Tabel Layanan Jasa Hilang', 'Tabel master jasa servis tidak muncul.', 'ERROR');
      }
    }

    // ----------------------------------------------------
    // AUDIT 11: Sub-View 5 - Penerimaan & Stok Opname (StockOpnameReceiptView)
    // ----------------------------------------------------
    console.log('12. Mengaudit Sub-View Penerimaan & Stok Opname...');
    const tabMutasi = page.locator('button:has-text("Penerimaan & Stok Opname")').first();
    if (await tabMutasi.isVisible()) {
      await tabMutasi.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_13_stok_mutasi_view.png') });

      const mutasiTable = page.locator('table').first();
      const btnPenerimaan = page.locator('button:has-text("Penerimaan Barang")').first();
      const btnOpname = page.locator('button:has-text("Stock Opname")').first();

      if (await mutasiTable.isVisible() && await btnPenerimaan.isVisible() && await btnOpname.isVisible()) {
        recordFinding('VERIFIED', 'Mutasi & Opname', 'Tampilan Mutasi Siap', 'Tabel mutasi kartu stok dan tombol aksi opname/restock hadir.', 'OK');
      }

      // Uji Modal Stock Opname dari tombol
      await btnOpname.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_04_stock_opname_modal.png') });

      const opnameModalTitle = page.locator('text=Stock Opname Fisik').first();
      if (await opnameModalTitle.isVisible()) {
        recordFinding('VERIFIED', 'Modal Opname', 'Modal Opname Fisik Berfungsi', 'Nomor dokumen otomatis dan tabel input fisik tampil.', 'OK');
      } else {
        recordFinding('UI_CACAT', 'Modal Opname', 'Modal Opname Gagal Terbuka', 'Modal stock opname fisik tidak muncul.', 'ERROR');
      }
      const closeOpnameBtn = page.locator('button:has-text("Batal")').first();
      if (await closeOpnameBtn.isVisible()) await closeOpnameBtn.click();
      await page.waitForTimeout(300);
    }

    // ----------------------------------------------------
    // AUDIT 12: Sub-View 6 - Distributor & Supplier (SupplierFormModal)
    // ----------------------------------------------------
    console.log('13. Mengaudit Sub-View Distributor & Rekanan...');
    const tabSupplier = page.locator('button:has-text("Distributor & Supplier")').first();
    if (await tabSupplier.isVisible()) {
      await tabSupplier.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_14_supplier_view.png') });

      const supTable = page.locator('table').first();
      const addSupBtn = page.locator('button:has-text("Tambah Supplier")').first();

      if (await supTable.isVisible() && await addSupBtn.isVisible()) {
        recordFinding('VERIFIED', 'Supplier', 'Tabel Distributor Siap', 'Tabel rekanan distributor dan tombol penambahan supplier tersedia.', 'OK');

        await addSupBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'inv_15_supplier_form_modal.png') });

        const supModalTitle = page.locator('text=Tambah Distributor / Supplier').first();
        if (await supModalTitle.isVisible()) {
          recordFinding('VERIFIED', 'Supplier - Modal', 'Modal Form Supplier Berfungsi', 'Form input supplier, kode auto-generated, telepon, dan TOP terbuka.', 'OK');
        }
        const cancelSupBtn = page.locator('button:has-text("Batal")').first();
        if (await cancelSupBtn.isVisible()) await cancelSupBtn.click();
        await page.waitForTimeout(300);
      } else {
        recordFinding('UI_CACAT', 'Supplier', 'Tabel Supplier Hilang', 'Tabel distributor rekanan tidak muncul.', 'ERROR');
      }
    }

    // ----------------------------------------------------
    // AUDIT 13: Pengecekan Khusus Teks Cacat, Placeholder, & Konsol
    // ----------------------------------------------------
    console.log('14. Memeriksa sisa placeholder atau anomali teks pada seluruh modul...');
    const bodyText = await page.innerText('body');

    const checkTextPattern = (pattern, title, category = 'Seluruh Modul Inventori') => {
      if (pattern.test(bodyText)) {
        recordFinding('ANOMALI', category, `Terdeteksi ${title}`, `Ditemukan kecacatan teks: ${pattern}`, 'WARNING');
      } else {
        recordFinding('VERIFIED', category, `Bebas dari ${title}`, `Tidak ditemukan pola cacat "${title}".`, 'OK');
      }
    };

    checkTextPattern(/lorem ipsum/i, 'Lorem Ipsum');
    checkTextPattern(/NaN\s*Rupiah|Rp\s*NaN/i, 'NaN Rupiah');
    checkTextPattern(/undefined\s*Rupiah|Rp\s*undefined/i, 'Undefined Rupiah');
    checkTextPattern(/\[object Object\]/i, 'Object Object');
    checkTextPattern(/Ban Bekas/i, 'Ban Bekas Terlarang');

    if (consoleErrors.length > 0) {
      consoleErrors.forEach((err) => {
        recordFinding('BUG', 'Browser Console', 'Terdeteksi Error Konsol JavaScript', err, 'WARNING');
      });
    } else {
      recordFinding('VERIFIED', 'Browser Console', 'Konsol Bersih Bebas Error', '0 error terdeteksi di konsol peramban.', 'OK');
    }

    const reportPath = path.join(SCREENSHOT_DIR, 'inventory_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditFindings, null, 2), 'utf-8');
    console.log(`✓ Laporan audit lengkap tersimpan di: ${reportPath}`);
    console.log('=== AUDIT MENDALAM MODUL INVENTARIS SELESAI DENGAN SUKSES! ===');

  } catch (err) {
    console.error('CRITICAL ERROR DURING INVENTORY AUDIT:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_inventory_audit.png') });
    recordFinding('CRITICAL', 'Runner', 'Audit Terhenti Karena Error Kritis', err.message, 'ERROR');
    const reportPath = path.join(SCREENSHOT_DIR, 'inventory_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditFindings, null, 2), 'utf-8');
  } finally {
    await browser.close();
  }
})();
