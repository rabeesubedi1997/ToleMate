import React from 'react';
import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export type ExportRow = (string | number | null | undefined)[];

interface TableControlsProps {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (n: number) => void;
  totalItems: number;
  exportFilename?: string;
  /** Return [header-row, ...data-rows] for the full filtered dataset */
  exportRows?: () => ExportRow[];
  className?: string;
  /** Extra controls rendered between search and rows-per-page (e.g. role filter tabs) */
  children?: React.ReactNode;
}

const RPP = [10, 20, 50, 100] as const;

const TableControls: React.FC<TableControlsProps> = ({
  search, onSearch, searchPlaceholder = 'Search…',
  page, totalPages, onPageChange,
  rowsPerPage, onRowsPerPageChange, totalItems,
  exportFilename = 'export', exportRows,
  className = '', children,
}) => {
  const exportCsv = () => {
    if (!exportRows) return;
    const rows = exportRows();
    const csv = rows.map(r =>
      r.map(c => {
        const s = c == null ? '' : String(c);
        return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${exportFilename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    if (!exportRows) return;
    const ws = XLSX.utils.aoa_to_sheet(exportRows() as (string | number)[][]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${exportFilename}.xlsx`);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Top row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative min-w-[170px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="input-field pl-8 py-1.5 text-sm w-full"
          />
        </div>

        {/* Slot for extra filters (role tabs, status selector, etc.) */}
        {children}

        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <select
            value={rowsPerPage}
            onChange={e => { onRowsPerPageChange(Number(e.target.value)); onPageChange(1); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white cursor-pointer"
          >
            {RPP.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
          {exportRows && (
            <>
              <button onClick={exportCsv} title="Download CSV"
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">
                <Download className="w-3 h-3" /> CSV
              </button>
              <button onClick={exportXlsx} title="Download XLSX"
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">
                <Download className="w-3 h-3" /> XLSX
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bottom row: count + pagination */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-0.5">
        <span>{totalItems.toLocaleString()} result{totalItems !== 1 ? 's' : ''}</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
              className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5">Page {page} / {totalPages}</span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
              className="p-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableControls;
