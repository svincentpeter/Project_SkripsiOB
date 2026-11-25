import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Info, Trash2, X } from 'lucide-react';

export type DialogTone = 'danger' | 'warning' | 'info' | 'primary';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
}

export interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
  required?: boolean;
  minLength?: number;
}

interface DialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type ActiveDialog =
  | {
      kind: 'confirm';
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: 'prompt';
      options: PromptOptions;
      resolve: (value: string | null) => void;
    };

const DialogContext = createContext<DialogContextType | undefined>(undefined);

const TONE_STYLES: Record<
  DialogTone,
  { iconWrap: string; confirmBtn: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  danger: {
    iconWrap: 'bg-rose-50 text-rose-600 border-rose-200',
    confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white focus-visible:ring-rose-600',
    Icon: Trash2,
  },
  warning: {
    iconWrap: 'bg-amber-50 text-amber-600 border-amber-200',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus-visible:ring-amber-600',
    Icon: AlertTriangle,
  },
  primary: {
    iconWrap: 'bg-blue-50 text-blue-600 border-blue-200',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-600',
    Icon: HelpCircle,
  },
  info: {
    iconWrap: 'bg-blue-50 text-blue-600 border-blue-200',
    confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-600',
    Icon: Info,
  },
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setInputValue('');
      setInputError(null);
      setActive({ kind: 'confirm', options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise<string | null>((resolve) => {
      setInputValue(options.defaultValue ?? '');
      setInputError(null);
      setActive({ kind: 'prompt', options, resolve });
    });
  }, []);

  const handleCancel = useCallback(() => {
    setActive((curr) => {
      if (!curr) return null;
      if (curr.kind === 'confirm') curr.resolve(false);
      else curr.resolve(null);
      return null;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!active) return;
    if (active.kind === 'confirm') {
      const resolve = active.resolve;
      setActive(null);
      resolve(true);
      return;
    }

    const trimmed = inputValue.trim();
    const minLen = active.options.minLength ?? (active.options.required !== false ? 1 : 0);
    if (minLen > 0 && trimmed.length < minLen) {
      setInputError(
        minLen === 1
          ? 'Kolom ini wajib diisi sebelum melanjutkan.'
          : `Minimal ${minLen} karakter diperlukan.`
      );
      inputRef.current?.focus();
      return;
    }

    const resolve = active.resolve;
    setActive(null);
    resolve(trimmed);
  }, [active, inputValue]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const frame = window.requestAnimationFrame(() => {
      if (active.kind === 'prompt') {
        inputRef.current?.focus();
      } else {
        confirmBtnRef.current?.focus();
      }
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [active, handleCancel]);

  const contextValue = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);
  const tone: DialogTone = active?.options.tone ?? 'primary';
  const style = TONE_STYLES[tone];
  const ToneIcon = style.Icon;

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      {active && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 font-['Plus_Jakarta_Sans',sans-serif]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-dialog-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-lg">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${style.iconWrap}`}>
                  <ToneIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 id="app-dialog-title" className="text-sm sm:text-base font-bold text-slate-900 leading-snug text-balance">
                      {active.options.title}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCancel}
                      aria-label="Tutup dialog"
                      className="p-1 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {active.options.message && (
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-1.5 whitespace-pre-line text-pretty">
                      {active.options.message}
                    </p>
                  )}

                  {active.kind === 'prompt' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleConfirm();
                      }}
                      className="mt-4 space-y-1.5"
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                          setInputValue(e.target.value);
                          if (inputError) setInputError(null);
                        }}
                        placeholder={active.options.placeholder || 'Tuliskan alasan...'}
                        className="w-full h-10 px-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
                      />
                      {inputError && (
                        <p className="text-[11px] font-semibold text-rose-600">{inputError}</p>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                {active.options.cancelLabel || 'Batal'}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={handleConfirm}
                className={`h-9 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${style.confirmBtn}`}
              >
                {active.options.confirmLabel || (active.kind === 'prompt' ? 'Lanjutkan' : 'Ya, Lanjutkan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextType => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return ctx;
};
