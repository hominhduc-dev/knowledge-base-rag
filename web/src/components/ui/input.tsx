import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-12 w-full rounded-[8px] border border-border bg-surface px-3.5 text-[15px] text-primary outline-none placeholder:text-muted focus:border-border-strong focus:ring-2 focus:ring-accent/15",
        className,
      )}
      {...props}
    />
  );
}
