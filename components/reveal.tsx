"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

type RevealProps = {
  as?: "section" | "div";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * Envuelve un bloque y le añade la clase `in` al entrar en el viewport
 * (estilos `.reveal` / `.reveal.in` en globals.css). El HTML inicial es
 * idéntico en servidor y cliente; la clase se añade por DOM dentro de
 * useEffect (el componente no vuelve a renderizar, así que React no la pisa).
 */
export function Reveal({
  as: Tag = "section",
  className = "",
  style,
  children,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`${className} reveal`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}
