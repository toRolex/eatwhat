"use client";
import { useState, useEffect } from "react";
import { Activity, avColor, bgMap, fgMap } from "./types";

const typeColor: Record<string, string> = {
  rsvp:   "var(--sage)",
  vibe:   "var(--sky)",
  vote:   "var(--amber)",
  system: "var(--amber)",
  ai:     "var(--lav)",
};

function NotifDot({ count }: { count: number }) {
  if (!count) return null;
  return (
    <div style={{
      position: "absolute", top: -3, right: -3, width: 16, height: 16,
      borderRadius: "50%", background: "var(--coral)", color: "white",
      fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
      animation: "si .3s var(--sp) both", border: "2px solid var(--surface)",
    }}>
      {count > 9 ? "9+" : count}
    </div>
  );
}

function ActivityItem({ item, onRead }: { item: Activity; onRead: () => void }) {
  const c: string = avColor(item.ini);
  const bg = bgMap[c] ?? "var(--bg2)";
  const fg = fgMap[c] ?? "var(--muted)";
  return (
    <div
      onClick={onRead}
      style={{
        display: "flex", gap: 11, padding: "11px 16px",
        background: item.read ? "transparent" : "var(--bg2)",
        borderBottom: "1px solid var(--border2)", cursor: "pointer", transition: "background .15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
      onMouseLeave={e => (e.currentTarget.style.background = item.read ? "transparent" : "var(--bg2)")}
    >
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: bg, color: fg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 600, flexShrink: 0,
      }}>
        {item.ini}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 1 }}>{item.name}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.msg}</div>
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: typeColor[item.type] ?? "var(--muted)", flexShrink: 0 }} />
          {item.time}
        </div>
      </div>
      {!item.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sky)", flexShrink: 0, marginTop: 4 }} />}
    </div>
  );
}

export function NotificationPanel({
  onClose, activities, setActivities,
}: {
  onClose: () => void;
  activities: Activity[];
  setActivities: (fn: Activity[] | ((prev: Activity[]) => Activity[])) => void;
}) {
  const unread = activities.filter(a => !a.read).length;
  const markAll = () => setActivities(a => a.map(x => ({ ...x, read: true })));
  const markOne = (id: number) => setActivities(a => a.map(x => x.id === id ? { ...x, read: true } : x));

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 149, background: "transparent" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 340, zIndex: 150,
        background: "var(--surface)", borderLeft: "1px solid var(--border2)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 48px rgba(0,0,0,.15)",
        animation: "notifSlide .35s var(--sp) both",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      }}>
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid var(--border2)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 20, letterSpacing: "-.02em", color: "var(--text)" }}>Activity</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {unread > 0 && (
                <button onClick={markAll} style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)" }}>
                  Mark all read
                </button>
              )}
              <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--bg)", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>×</button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{unread > 0 ? `${unread} unread` : "All caught up"}</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {activities.map((item, i) => (
            <div key={item.id} style={{ animation: `fu .35s var(--sp) ${i * 30}ms both` }}>
              <ActivityItem item={item} onRead={() => markOne(item.id)} />
            </div>
          ))}
          {activities.length === 0 && (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No activity yet</div>
          )}
        </div>
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border2)", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>Powered by GroupPlan Realtime</div>
        </div>
      </div>
    </>
  );
}

export function BellButton({ onClick, unread }: { onClick: () => void; unread: number }) {
  const [ring, setRing] = useState(false);
  useEffect(() => {
    if (unread > 0) {
      setRing(true);
      const t = setTimeout(() => setRing(false), 800);
      return () => clearTimeout(t);
    }
  }, [unread]);
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative", background: "var(--bg)", border: "1px solid var(--border2)",
        borderRadius: 8, width: 28, height: 28,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all .2s", flexShrink: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--text)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)"; }}
    >
      <svg width="13" height="14" viewBox="0 0 13 14" fill="none" style={{ animation: ring ? "bellRing .6s var(--sp)" : "none", transformOrigin: "top center" }}>
        <path d="M6.5 1a4.5 4.5 0 0 0-4.5 4.5c0 2.5-.8 3.5-1.5 4h12c-.7-.5-1.5-1.5-1.5-4A4.5 4.5 0 0 0 6.5 1z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M5.5 12.5a1 1 0 0 0 2 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <NotifDot count={unread} />
    </button>
  );
}
