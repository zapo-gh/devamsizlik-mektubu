import React from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

export interface Column<T> {
  header: React.ReactNode;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  hidePrint?: boolean;
  exportable?: boolean;
  exportFilename?: string;
  rowClassName?: (item: T) => string;
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  loading = false,
  emptyMessage = 'Kayıt bulunamadı.',
  hidePrint = true,
  exportable = false,
  exportFilename = 'Tablo_Verisi',
  rowClassName
}: DataTableProps<T>) {

  const handleExport = () => {
    // Basic export: mapping data using accessors or stringified items if no accessor
    // Exclude columns that are meant for "İşlemler" (Actions)
    const exportColumns = columns.filter(col => typeof col.header === 'string' && col.header !== 'İşlemler');
    
    const exportData = data.map(item => {
      const rowData: any = {};
      exportColumns.forEach(col => {
        if (col.accessor) {
          rowData[col.header as string] = item[col.accessor] || '';
        } else {
          rowData[col.header as string] = 'Gizli/Karmaşık Veri';
        }
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Veriler");
    XLSX.writeFile(workbook, `${exportFilename}.xlsx`);
  };
  if (loading) {
    return <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Yükleniyor...</div>;
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${hidePrint ? 'print:hidden' : ''}`}>
      {exportable && (
        <div className="px-4 py-3 border-b border-gray-100 flex justify-end bg-gray-50/30">
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-green-50 text-green-700 font-medium rounded-lg hover:bg-green-100 transition-colors border border-green-200"
          >
            <Download size={16} />
            <span>Excel'e Aktar</span>
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr key={item.id || rowIndex} className={`hover:bg-gray-50/50 transition-colors ${rowClassName ? rowClassName(item) : ''}`}>
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(item) : col.accessor ? String(item[col.accessor] || '-') : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
