import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationResult<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageItems: T[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Hook pagination client-side yang mereset halaman ke 1 saat panjang daftar atau filter berubah,
 * sehingga tabel dan grid besar tetap ringan di semua perangkat.
 */
export function usePagination<T = any>(
  items: readonly T[],
  defaultPageSize = 10,
  resetDeps: readonly unknown[] = []
): PaginationResult<T> {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, ...resetDeps]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    pageSize,
    totalPages,
    totalItems,
    pageItems,
    setPage: (next: number) => setPage(Math.min(Math.max(1, next), totalPages)),
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
}

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  /** Total keseluruhan sebelum filter (opsional, untuk teks "(Total X)"). */
  unfilteredTotal?: number;
  /** Alias untuk unfilteredTotal. */
  totalUnfiltered?: number;
  itemLabel?: string;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  compact?: boolean;
}

/**
 * Komponen pagination seragam (gaya Katalog Produk Omah Ban) yang responsif di mobile & desktop.
 */
export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  pageSize,
  totalItems,
  unfilteredTotal,
  totalUnfiltered,
  itemLabel = 'data',
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  compact = false,
}) => {
  const effectiveUnfiltered = unfilteredTotal ?? totalUnfiltered;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  const pageNumbers: (number | 'ellipsis-left' | 'ellipsis-right')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i += 1) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push('ellipsis-left');
    const from = Math.max(2, safePage - 1);
    const to = Math.min(totalPages - 1, safePage + 1);
    for (let i = from; i <= to; i += 1) pageNumbers.push(i);
    if (safePage < totalPages - 2) pageNumbers.push('ellipsis-right');
    pageNumbers.push(totalPages);
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-slate-100 text-xs text-slate-600 ${
        compact ? 'pt-2.5 px-1' : 'pt-3 px-1'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="tabular-nums">
          Menampilkan <strong className="text-slate-900">{start}–{end}</strong> dari{' '}
          <strong className="text-slate-900">{totalItems}</strong> {itemLabel}
          {effectiveUnfiltered !== undefined && effectiveUnfiltered !== totalItems && (
            <span className="text-slate-400"> (Total {effectiveUnfiltered})</span>
          )}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-3">
            <span className="text-slate-500">Baris:</span>
            <select
              aria-label={`Jumlah ${itemLabel} per halaman`}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            aria-label="Halaman sebelumnya"
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pageNumbers.map((entry) =>
            typeof entry === 'string' ? (
              <span key={entry} className="px-1.5 text-slate-400 select-none">
                &hellip;
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPageChange(entry)}
                aria-current={safePage === entry ? 'page' : undefined}
                className={`min-w-[30px] h-[30px] px-2 rounded-lg text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                  safePage === entry
                    ? 'bg-blue-600 text-white border border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {entry}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            aria-label="Halaman berikutnya"
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
