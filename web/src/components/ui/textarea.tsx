import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-11 w-full resize-none bg-transparent text-[15px] leading-[26px] text-primary outline-none placeholder:text-muted",
        className,
      )}
      {...props}
    />
  );
}
