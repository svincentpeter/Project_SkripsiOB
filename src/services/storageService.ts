// Abstraksi storage lokal yang siap diarahkan ke backend API PHP/Laravel

export const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Gagal membaca key "${key}" dari localStorage:`, error);
    return fallback;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Gagal menyimpan key "${key}" ke localStorage:`, error);
  }
};
