import Image from "next/image";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-sky-500 to-indigo-500",
  "from-rose-500 to-fuchsia-500",
  "from-teal-500 to-cyan-500",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function hash(text: string): number {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-24 text-2xl" } as const;
const PX = { sm: 32, md: 40, lg: 56, xl: 96 } as const;

/** Photo avatar with a deterministic gradient + initials fallback. */
export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-surface",
        GRADIENTS[hash(name) % GRADIENTS.length],
        SIZES[size],
        className,
      )}
    >
      {src ? <Image src={src} alt="" width={PX[size]} height={PX[size]} className="size-full object-cover" /> : <span aria-hidden>{initials(name)}</span>}
      <span className="sr-only">{name}</span>
    </span>
  );
}
