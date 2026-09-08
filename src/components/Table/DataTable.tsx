import React from 'react';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  id?: string;
  cell?: (info: { row: T; getValue: () => any }) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  className?: string;
}

export function DataTable<T>({ data, columns, className = '' }: DataTableProps<T>) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse min-w-full">
        <thead>
          <tr className="border-b border-gray-100 text-sm text-gray-500">
            {columns.map((col, index) => (
              <th 
                key={col.id || (col.accessorKey as string) || index} 
                className={`py-3 px-2 font-medium ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                No data available.
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                {columns.map((col, colIndex) => {
                  const value = col.accessorKey ? row[col.accessorKey] : undefined;
                  return (
                    <td 
                      key={col.id || (col.accessorKey as string) || colIndex}
                      className={`py-4 px-2 ${col.className || ''}`}
                    >
                      {col.cell 
                        ? col.cell({ row, getValue: () => value })
                        : (value as React.ReactNode)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
