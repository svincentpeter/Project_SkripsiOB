/**
 * Client-Side Image Compressor Utility
 * Mengompres foto nota / bukti fisik menggunakan HTML5 Canvas
 * Mereduksi ukuran dari megabytes ke ~70-120 KB agar aman disimpan di LocalStorage
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: string; // 'image/jpeg' | 'image/webp'
}

export const compressImageFile = (
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<string> => {
  const {
    maxWidth = 1000,
    maxHeight = 1000,
    quality = 0.7,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // Fallback jika bukan di browser atau FileReader gagal
    if (typeof window === 'undefined' || typeof FileReader === 'undefined') {
      reject(new Error('Canvas compression only supported in browser environments'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Hitung rasio aspek untuk mempertahankan proporsi
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback ke string asli jika canvas 2d context gagal
            resolve(readerEvent.target?.result as string);
            return;
          }

          // Isi background putih agar gambar transparan (PNG) tidak menjadi hitam pekat saat diexport ke JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Render gambar yang sudah di-scale
          ctx.drawImage(img, 0, 0, width, height);

          // Export ke format yang dikompresi
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        } catch (err) {
          // Jika terjadi error canvas security/cors, fallback ke data reader awal
          console.warn('Image compression fallback to raw data URL due to:', err);
          resolve(readerEvent.target?.result as string);
        }
      };

      img.onerror = (imgError) => {
        reject(new Error(`Failed to load image for compression: ${imgError}`));
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = (readErr) => {
      reject(new Error(`FileReader failed: ${readErr}`));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Menghitung perkiraan ukuran string Base64 dalam Kilobytes (KB)
 */
export const getBase64SizeKb = (base64String: string): number => {
  if (!base64String) return 0;
  const padding = (base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0);
  const base64Length = base64String.length - (base64String.indexOf(',') + 1);
  const sizeInBytes = (base64Length * 3) / 4 - padding;
  return Math.round((sizeInBytes / 1024) * 10) / 10;
};
