import { useLayoutEffect, useRef, useState } from 'preact/hooks';

const OVERSCAN = 20;

/**
 * Row windowing for a scroll container with fixed-height rows: only rows [start, end) need to be
 * in the DOM, with spacers of `topHeight` and `bottomHeight` standing in for the rest.
 */
export function useWindowedRows(count: number, rowHeight: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current!;
    const observer = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const end = Math.min(count, Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN);

  return {
    scrollRef,
    onScroll: (e: Event) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop),
    start,
    end,
    topHeight: start * rowHeight,
    bottomHeight: (count - end) * rowHeight,
  };
}
