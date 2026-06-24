"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MagneticButtonProps extends React.HTMLAttributes<HTMLSpanElement> {
  strength?: number;
}

export function MagneticButton({
  strength = 0.25,
  className,
  children,
  ...props
}: MagneticButtonProps) {
  const ref = React.useRef<HTMLSpanElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <span
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className="inline-block"
      style={{ display: "inline-block" }}
      {...props}
    >
      <span
        ref={ref}
        className={cn(
          "inline-block transition-transform duration-300 ease-out will-change-transform",
          className
        )}
      >
        {children}
      </span>
    </span>
  );
}
