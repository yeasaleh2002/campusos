"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { controlClass } from "@/components/ui/input";

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/** Filterable single-select (WAI-ARIA combobox + listbox, keyboard operable). */
export function Combobox({ options, value, onChange, placeholder = "Select…", emptyText = "No matches", disabled, id, ...aria }: ComboboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const choose = (option: ComboboxOption) => {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && open && filtered[active]) {
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? `${listId}-${filtered[active].value}` : undefined}
        disabled={disabled}
        value={open ? query : (selected?.label ?? "")}
        placeholder={selected?.label ?? placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={cn(controlClass, "h-11 pr-10")}
        autoComplete="off"
        {...aria}
      />
      <ChevronsUpDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
      {open && (
        <ul id={listId} role="listbox" style={{ zIndex: "var(--z-popover)" }} className="scrollbar-thin absolute mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {value && (
            <li role="option" aria-selected={false} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-fg-subtle hover:bg-surface-2" onPointerDown={(e) => e.preventDefault()} onClick={() => { onChange(null); setOpen(false); }}>
              Clear selection
            </li>
          )}
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-fg-subtle">{emptyText}</li>}
          {filtered.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${option.value}`}
              role="option"
              aria-selected={option.value === value}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseEnter={() => setActive(index)}
              className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm", index === active ? "bg-surface-2" : "", option.value === value && "font-semibold text-primary")}
            >
              <span className="min-w-0">
                <span className="block truncate">{option.label}</span>
                {option.hint && <span className="block truncate text-xs text-fg-subtle">{option.hint}</span>}
              </span>
              {option.value === value && <Check className="size-4 shrink-0" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
