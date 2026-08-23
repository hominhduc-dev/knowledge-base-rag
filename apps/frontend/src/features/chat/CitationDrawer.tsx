"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import type { Source } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type CitationDrawerProps = {
  sources: Source[];
  activeCitation: number | null;
  open: boolean;
  onClose: () => void;
};

export function CitationDrawer({ sources, activeCitation, open, onClose }: CitationDrawerProps) {
  const refs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    if (activeCitation === null) return;
    refs.current[activeCitation]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeCitation]);

  return (
    <>
      {open && <button type="button" aria-label="Đóng bảng nguồn" onClick={onClose} className="fixed inset-0 z-40 bg-primary/20 xl:hidden" />}
      <aside
        aria-label="Nguồn trích dẫn"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[72dvh] flex-col overflow-hidden rounded-t-[12px] border-t border-border bg-base overlay-shadow md:inset-y-0 md:left-auto md:w-[340px] md:max-h-none md:rounded-none md:border-l md:border-t-0 xl:static xl:z-auto xl:flex xl:h-full xl:w-[340px] xl:shrink-0 xl:border-l xl:shadow-none",
          open ? "flex" : "hidden xl:flex",
        )}
      >
        <div className="flex items-baseline gap-2.5 border-b border-border px-5 pb-3.5 pt-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Nguồn trích dẫn</span>
          <span className="ml-auto font-mono text-[13px] text-muted">{sources.length ? `${sources.length} thẻ` : ""}</span>
          <button type="button" onClick={onClose} aria-label="Đóng" className="-my-3 -mr-3 flex size-11 items-center justify-center rounded-[8px] text-secondary hover:bg-sunken xl:hidden"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-8">
          {sources.length === 0 ? (
            <p className="m-1 text-sm leading-6 text-muted">Các điều khoản được dùng để trả lời sẽ hiện ở đây, theo đúng thứ tự trích dẫn trong câu trả lời.</p>
          ) : sources.map((source) => {
            const active = activeCitation === source.n;
            return (
              <article
                key={`${source.n}-${source.locator}`}
                ref={(node) => { refs.current[source.n] = node; }}
                className={cn("relative mb-3 rounded-[12px] border border-border bg-surface p-4 pb-3.5", active && "border-l-2 border-l-accent")}
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-[13px] font-medium leading-5 text-accent">[{source.n}]</span>
                  <h2 className="font-sans text-[17px] font-semibold leading-[26px]">{source.doc}</h2>
                </div>
                <div className="mb-2.5 ml-7 mt-1.5 font-mono text-[13px] leading-5 text-secondary">{source.locator}</div>
                <blockquote className={cn("m-0 border-l-2 px-3 py-2.5 text-sm leading-6", active ? "border-accent bg-accent-soft" : "border-border-strong bg-sunken")}>{source.excerpt}</blockquote>
                <div className="mt-3 flex items-center gap-3">
                  <span className="rounded-[4px] bg-indigo-soft px-2 py-1 text-[13px] font-medium leading-[18px] text-indigo">{source.unit}</span>
                  <a href="#" className="ml-auto inline-flex min-h-11 items-center gap-1 text-[13px] font-medium">
                    Mở tài liệu gốc <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </aside>
    </>
  );
}
