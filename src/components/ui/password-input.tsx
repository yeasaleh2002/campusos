"use client";

import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** Mirrors the server password policy (src/lib/auth/password.ts) for live feedback. */
export const PASSWORD_RULES = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "Uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "Number", test: (v: string) => /[0-9]/.test(v) },
] as const;

function strength(value: string): { score: number; label: string; tone: string } {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).length + (value.length >= 12 ? 1 : 0);
  if (!value) return { score: 0, label: "", tone: "bg-surface-3" };
  if (passed <= 2) return { score: 1, label: "Weak", tone: "bg-danger" };
  if (passed === 3) return { score: 2, label: "Fair", tone: "bg-warning" };
  if (passed === 4) return { score: 3, label: "Good", tone: "bg-info" };
  return { score: 4, label: "Strong", tone: "bg-success" };
}

interface PasswordInputProps extends Omit<ComponentProps<"input">, "type"> {
  /** Show the strength meter and rule checklist (for new passwords). */
  showStrength?: boolean;
}

export function PasswordInput({ showStrength, value, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const text = typeof value === "string" ? value : "";
  const meter = strength(text);

  return (
    <div className="space-y-2">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        className={className}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="rounded-lg p-2 text-fg-subtle transition hover:bg-surface-2 hover:text-fg"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
        {...props}
      />
      {showStrength && text && (
        <div aria-live="polite">
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((step) => (
              <span key={step} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", step <= meter.score ? meter.tone : "bg-surface-3")} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold text-fg">Strength: {meter.label}</span>
            {PASSWORD_RULES.map((rule) => (
              <span key={rule.label} className={rule.test(text) ? "text-success" : "text-fg-subtle"}>
                {rule.test(text) ? "✓" : "•"} {rule.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
