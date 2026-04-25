"use client";
import { useState, useEffect, CSSProperties, ReactNode, KeyboardEvent } from "react";
import { avColor, bgMap, fgMap } from "./types";

export function Av({ ini, size = 32, delay = 0 }: { ini: string; size?: number; delay?: number }) {
  const c = avColor(ini);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bgMap[c], color: fgMap[c],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.31, fontWeight: 600, flexShrink: 0,
      animation: `fu .4s var(--sp) ${delay}ms both`,
    }}>
      {ini}
    </div>
  );
}

type BadgeColor = "neutral" | "green" | "red" | "amber" | "blue" | "purple";
const badgePalette: Record<BadgeColor, { bg: string; fg: string }> = {
  neutral: { bg: "var(--bg2)",               fg: "var(--muted)" },
  green:   { bg: "oklch(92% .07 148)",        fg: "oklch(34% .13 148)" },
  red:     { bg: "oklch(93% .07 20)",         fg: "oklch(40% .17 20)" },
  amber:   { bg: "oklch(94% .07 72)",         fg: "oklch(44% .15 72)" },
  blue:    { bg: "oklch(92% .06 228)",        fg: "oklch(38% .14 228)" },
  purple:  { bg: "oklch(92% .06 284)",        fg: "oklch(40% .14 284)" },
};

export function Badge({ children, color = "neutral" }: { children: ReactNode; color?: BadgeColor }) {
  const { bg, fg } = badgePalette[color] ?? badgePalette.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 500,
      background: bg, color: fg, whiteSpace: "nowrap", letterSpacing: ".01em",
    }}>
      {children}
    </span>
  );
}

export function Card({
  children, style = {}, delay = 0, onClick, hover = true, glass = false,
}: {
  children: ReactNode; style?: CSSProperties; delay?: number;
  onClick?: () => void; hover?: boolean; glass?: boolean;
}) {
  const [h, setH] = useState(false);
  const glassStyle: CSSProperties = glass
    ? { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" } : {};
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => hover && setH(false)}
      style={{
        background: "var(--surface)", borderRadius: "var(--r)",
        border: `1px solid ${h ? "var(--border)" : "var(--border2)"}`,
        boxShadow: h ? "var(--shh)" : "var(--sh)",
        transition: "all .25s var(--eo)",
        transform: h ? "translateY(-2px)" : "none",
        cursor: onClick ? "pointer" : "default",
        animation: `fu .45s var(--sp) ${delay}ms both`,
        ...glassStyle, ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Btn({ children, onClick, style = {} }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: "var(--text)", color: "var(--bg)",
        border: "none", padding: "11px 22px", borderRadius: "var(--rs)",
        fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)",
        transition: "all .25s var(--sp)",
        transform: h ? "translateY(-2px) scale(1.02)" : "none",
        boxShadow: h ? "0 8px 24px rgba(0,0,0,.2)" : "none",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Modal({ children, onClose, width = 500 }: { children: ReactNode; onClose: () => void; width?: number }) {
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fi .2s both",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: 20,
          width: "90%", maxWidth: width, maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,.3)",
          border: "1px solid var(--border2)", animation: "slideUp .32s var(--sp) both",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Bracket({ size = 20, color = "var(--border)", style = {} }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <path d="M7 2H2v5"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 2h5v5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 18H2v-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 18h5v-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SectionLabel({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, ...style }}>
      <div style={{ width: 12, height: 1.5, background: "var(--muted)", opacity: .5 }} />
      <span style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,var(--border2),transparent)", opacity: .8 }} />
    </div>
  );
}
