"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Value used for client-side sorting; omit to make the column unsortable. */
  sortValue?: (row: T) => string | number | null;
  className?: string;
  /** Hide in the mobile card view (e.g. redundant columns). */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Array<Column<T>>;
  getKey: (row: T) => string;
  caption: string;
  /** Filter bar rendered above the table. */
  toolbar?: ReactNode;
  empty?: ReactNode;
  className?: string;
}

/**
 * Responsive table: a real <table> with sortable headers on md+, and stacked
 * label/value cards on small screens (no horizontal scroll).
 */
export function DataTable<T>({ rows, columns, getKey, caption, toolbar, empty, className }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort?.key);
    if (!sort || !column?.sortValue) return rows;
    const value = column.sortValue;
    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const cmp = av === bv ? 0 : av === null ? 1 : bv === null ? -1 : av > bv ? 1 : -1;
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, columns, sort]);

  const toggle = (key: string) =>
    setSort((current) => (current?.key !== key ? { key, dir: "asc" } : current.dir === "asc" ? { key, dir: "desc" } : null));

  return (
    <div className={cn("space-y-4", className)}>
      {toolbar}
      {rows.length === 0 ? (
        empty
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="bg-surface-2/70 text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  {columns.map((column) => {
                    const active = sort?.key === column.key;
                    return (
                      <th key={column.key} scope="col" className={cn("px-4 py-3 font-semibold", column.className)} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                        {column.sortValue ? (
                          <button type="button" onClick={() => toggle(column.key)} className="inline-flex items-center gap-1.5 uppercase hover:text-fg">
                            {column.header}
                            {active ? sort.dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" /> : <ArrowUpDown className="size-3.5 opacity-50" />}
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((row) => (
                  <tr key={getKey(row)} className="transition hover:bg-surface-2/50">
                    {columns.map((column) => (
                      <td key={column.key} className={cn("px-4 py-3.5 align-middle", column.className)}>
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden" aria-label={caption}>
            {sorted.map((row) => (
              <li key={getKey(row)} className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
                <dl className="space-y-2">
                  {columns
                    .filter((column) => !column.hideOnMobile)
                    .map((column) => (
                      <div key={column.key} className="flex items-start justify-between gap-4 text-sm">
                        <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{column.header}</dt>
                        <dd className="min-w-0 text-right">{column.cell(row)}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
