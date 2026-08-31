// Why: details-on-demand granular band — Shneiderman; sticky header + sticky first column for wide tables
import { useMemo, useState } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sortable data table with sticky header + hover rows.
 * columns: [{ key, label, align, sortable, render(row) }]
 */
export default function DataTable({ columns, rows, onRowClick, testId, rowKey = 'id', maxHeight }) {
  const [sort, setSort] = useState(null); // { key, dir }

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const getVal = col?.sortValue || ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key) => {
    setSort((s) =>
      !s || s.key !== key ? { key, dir: 'desc' } : s.dir === 'desc' ? { key, dir: 'asc' } : null
    );
  };

  return (
    <div
      data-testid={testId}
      className="overflow-auto rounded-xl border bg-card shadow-sm"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <Table className="table-sticky">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c, ci) => (
              <TableHead
                key={c.key}
                className={cn(
                  c.align === 'right' && 'text-right',
                  c.sortable !== false && 'cursor-pointer select-none',
                  ci === 0 && 'sticky left-0 z-10 bg-card' // sticky first column for horizontal scroll
                )}
                onClick={c.sortable !== false ? () => toggleSort(c.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {c.sortable !== false && (
                    sort?.key === c.key
                      ? (sort.dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)
                      : <ArrowUpDown size={12} className="opacity-30" />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row, i) => (
            <TableRow
              key={row[rowKey] ?? i}
              className={cn(onRowClick && 'cursor-pointer')}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c, ci) => (
                <TableCell
                  key={c.key}
                  className={cn(
                    c.align === 'right' && 'text-right tabular-nums',
                    ci === 0 && 'sticky left-0 bg-card' // sticky first column
                  )}
                >
                  {c.render ? c.render(row) : row[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
