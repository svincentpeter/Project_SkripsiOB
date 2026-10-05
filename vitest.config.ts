import { defineConfig } from 'vitest/config';

// Toko di WIB; tes waktu lokal harus sama di mesin mana pun.
process.env.TZ = 'Asia/Jakarta';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
