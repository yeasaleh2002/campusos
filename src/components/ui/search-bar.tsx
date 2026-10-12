"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  /** Committed (debounced) value. */
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  label?: string;
  delay?: number;
  className?: string;
}

/** Search input that reports changes after `delay` ms of inactivity. */
export function SearchBar({ value, onSearch, placeholder = "Search…", label = "Search", delay = 350, className }: SearchBarProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebounce(draft, delay);

  useEffect(() => {
    if (debounced.trim() !== value.trim()) onSearch(debounced.trim());
  }, [debounced, value, onSearch]);

  return (
    <div role="search" className={cn("w-full", className)}>
      <label className="sr-only" htmlFor="search-bar">{label}</label>
      <Input
        id="search-bar"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        leading={<Search />}
        autoComplete="off"
        enterKeyHint="search"
        trailing={
          draft ? (
            <button type="button" onClick={() => setDraft("")} className="rounded-lg p-2 text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label="Clear search">
              <X className="size-4" />
            </button>
          ) : null
        }
      />
    </div>
  );
}
