"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button, type ButtonProps } from "@/components/ui/button";

interface ShareButtonProps extends Pick<ButtonProps, "size" | "variant"> {
  title: string;
  text?: string;
  /** Site-relative path to share; defaults to the current URL. */
  path?: string;
  label?: string;
}

/** Native share sheet where available, clipboard copy otherwise. */
export function ShareButton({ title, text, path, size = "md", variant = "secondary", label = "Share" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = path ? new URL(path, window.location.origin).toString() : window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  return (
    <Button variant={variant} size={size} onClick={() => void share()}>
      {copied ? <Check /> : <Share2 />} {copied ? "Copied" : label}
    </Button>
  );
}
