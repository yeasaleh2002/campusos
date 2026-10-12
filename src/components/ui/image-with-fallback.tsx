"use client";

import Image, { type ImageProps } from "next/image";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

/** Tiny neutral blur placeholder (avoids layout shift + flash while loading). */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzUnPjxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzUnIGZpbGw9JyNlN2VhZjMnLz48L3N2Zz4=";

interface ImageWithFallbackProps extends Omit<ImageProps, "src" | "placeholder" | "blurDataURL"> {
  src: string | null | undefined;
  /** Rendered when there is no src or the image fails to load. */
  fallback: ReactNode;
}

/** next/image with lazy loading, blur placeholder and a graceful fallback. */
export function ImageWithFallback({ src, fallback, className, alt, ...props }: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return (
    <Image
      src={src}
      alt={alt}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      loading={props.priority ? undefined : "lazy"}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
      {...props}
    />
  );
}
