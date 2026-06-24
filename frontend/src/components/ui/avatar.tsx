import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Optional photo URL. If provided and the image loads, it replaces the
   *  deterministic-initials fallback. */
  src?: string | null;
}

export function Avatar({ name, className, size = "md", src }: AvatarProps) {
  const [loaded, setLoaded] = React.useState(false);
  const [errored, setErrored] = React.useState(false);

  // Reset state when the src changes (e.g. after an avatar upload).
  React.useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizes = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
    xl: "h-20 w-20 text-2xl",
  };
  const palette = [
    "bg-orange-500/20 text-orange-600 dark:text-orange-300",
    "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
    "bg-rose-500/20 text-rose-600 dark:text-rose-300",
    "bg-amber-500/20 text-amber-600 dark:text-amber-300",
    "bg-sky-500/20 text-sky-600 dark:text-sky-300",
    "bg-orange-500/20 text-orange-600 dark:text-orange-300",
    "bg-teal-500/20 text-teal-600 dark:text-teal-300",
    "bg-amber-500/20 text-amber-600 dark:text-amber-300",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const color = palette[h % palette.length];

  const showImage = !!src && !errored;

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        sizes[size],
        color,
        className
      )}
      aria-hidden
    >
      {/* Always render initials underneath so there's no flash when the
          image is loading or fails. */}
      <span className={cn(showImage && loaded ? "invisible" : "visible")}>
        {initials || "?"}
      </span>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
