"use client";

import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  /** Called once all digits are entered. */
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
}

/**
 * One-time-code input: N single-digit boxes with auto-advance, backspace to the
 * previous box, arrow keys, and full-code paste. Fully controlled by `value`.
 */
export function OtpInput({ value, onChange, length = 6, disabled, invalid, onComplete, autoFocus }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusBox = (index: number) => refs.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const setDigit = (index: number, digit: string) => {
    const chars = digits.slice();
    chars[index] = digit;
    commit(chars.join(""));
  };

  const onInput = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    setDigit(index, digit);
    if (index < length - 1) focusBox(index + 1);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) setDigit(index, "");
      else if (index > 0) {
        setDigit(index - 1, "");
        focusBox(index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    commit(pasted);
    focusBox(pasted.length >= length ? length - 1 : pasted.length);
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label={`${length}-digit verification code`}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          onChange={(event) => onInput(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={invalid || undefined}
          className={cn(
            "size-12 rounded-xl border border-border bg-surface text-center font-display text-xl font-bold text-fg shadow-xs transition sm:size-14 sm:text-2xl",
            "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
            digit && "border-primary/50 bg-primary-soft/40",
            invalid && "border-danger focus:ring-danger/15",
          )}
        />
      ))}
    </div>
  );
}
