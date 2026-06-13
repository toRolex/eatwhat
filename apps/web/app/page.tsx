"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tweaks, TWEAKS_DEFAULTS, GUESTS_DATA, INITIAL_ACTIVITIES, Guest, Activity } from "../components/demo/types";
import { Sidebar, ShareModal, CreateEventModal } from "../components/demo/modals";
import { NotificationPanel } from "../components/demo/notifications";
import { OverviewTab, PreferencesTab, AITab, VoteTab } from "../components/demo/tabs";

function TweaksPanel({ tweaks, setTweaks }: { tweaks: Tweaks; setTweaks: (t: Tweaks) => void }) {
  const toggle = (k: keyof Tweaks) => {
    const n = { ...tweaks, [k]: !tweaks[k] } as Tweaks;
    setTweaks(n);
    if (k === "darkMode") {
      document.body.classList.toggle("dark", n.darkMode);
      if (n.darkMode) document.documentElement.dataset.theme = "dark";
      else delete document.documentElement.dataset.theme;
    }
  };
  const setK = (k: keyof Tweaks, v: string) => setTweaks({ ...tweaks, [k]: v } as Tweaks);

  return (
    <div className="gp-tweaks-panel" style={{ position: "fixed", bottom: 22, right: 22, zIndex: 300, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "15px 17px", width: 230, boxShadow: "var(--shh)", animation: "si .28s var(--sp)", transformOrigin: "bottom right", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>设置</div>
      {(["darkMode", "showAIReasoning", "animations"] as (keyof Tweaks)[]).map(key => (
        <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span style={{ fontSize: 12, color: "var(--text)" }}>{key === "darkMode" ? "深色模式" : key === "showAIReasoning" ? "AI 推演" : "动画效果"}</span>
          <button onClick={() => toggle(key)} style={{ width: 32, height: 18, borderRadius: 99, border: "none", cursor: "pointer", background: tweaks[key] ? "var(--text)" : "var(--border)", position: "relative", transition: "background .25s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 1.5, left: tweaks[key] ? 13.5 : 1.5, width: 15, height: 15, borderRadius: "50%", background: "white", transition: "left .2s var(--sp)", boxShadow: "0 1px 4px rgba(0,0,0,.25)", display: "block" }} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 12, color: "var(--text)" }}>主题色</span>
        <select value={tweaks.accentColor} onChange={e => setK("accentColor", e.target.value)} style={{ fontFamily: "var(--fb)", fontSize: 11, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: "var(--text)" }}>
          <option value="coral">Coral</option>
          <option value="sage">Sage</option>
          <option value="sky">Sky</option>
          <option value="amber">Amber</option>
        </select>
      </div>
    </div>
  );
}

function mergeGuests(): Guest[] {
  try {
    const submissions: any[] = JSON.parse(localStorage.getItem("gp_rsvp_submissions") || "[]");
    const base = [...GUESTS_DATA];
    submissions.forEach(sub => {
      const exists = base.find(g => g.name.toLowerCase() === sub.name?.toLowerCase());
      if (exists) {
        exists.status = sub.attending === "yes" ? "confirmed" : sub.attending === "no" ? "declined" : "pending";
        if (sub.vibe) exists.vibe = sub.vibe;
        if (sub.dietary?.length) exists.dietary = sub.dietary;
        if (sub.cuisine?.length) exists.cuisine = sub.cuisine;
        if (sub.budget) exists.budget = sub.budget;
      } else if (sub.name) {
        const ini = sub.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
        base.push({ id: Date.now() + Math.random(), name: sub.name, ini, status: sub.attending === "yes" ? "confirmed" : "pending", dietary: sub.dietary || [], cuisine: sub.cuisine || [], budget: sub.budget || "$$", vibe: sub.vibe || null });
      }
    });
    return base;
  } catch { return [...GUESTS_DATA]; }
}

export default function App() {
  // Both states start from defaults on server AND first client paint to keep
  // hydration consistent, then read localStorage in useEffect after mount.
  const [tab, setTab]       = useState<string>("overview");
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAKS_DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [tweaksOn, setTweaksOn] = useState(false);
  const [supaGuests, setSupaGuests] = useState<Guest[] | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  // Start from INITIAL_ACTIVITIES on both server and client to avoid hydration mismatch;
  // hydrate from localStorage after mount.
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [liveGuests, setLiveGuests] = useState<Guest[]>(() => [...GUESTS_DATA]);

  useEffect(() => {
    try {
      const savedTab = localStorage.getItem("gp_tab");
      if (savedTab) setTab(savedTab);
      const savedTweaks = localStorage.getItem("gp_tweaks");
      if (savedTweaks) setTweaks({ ...TWEAKS_DEFAULTS, ...JSON.parse(savedTweaks) });
      const s = localStorage.getItem("gp_activities");
      if (s) setActivities(JSON.parse(s));
    } catch {}
    setLiveGuests(mergeGuests());
    setHydrated(true);
  }, []);

  const addActivity = useCallback((item: Omit<Activity, "id" | "read">) => {
    setActivities(prev => {
      const next = [{ ...item, id: Date.now(), read: false }, ...prev].slice(0, 20);
      localStorage.setItem("gp_activities", JSON.stringify(next));
      return next;
    });
  }, []);

  const unread = activities.filter(a => !a.read).length;

  useEffect(() => { if (hydrated) localStorage.setItem("gp_tab", tab); }, [tab, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("gp_tweaks", JSON.stringify(tweaks));
    document.body.classList.toggle("dark", tweaks.darkMode);
    if (tweaks.darkMode) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
  }, [tweaks, hydrated]);

  // Fetch real guest data from Supabase if authenticated
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("invitations")
        .select("id, name, email, status, invite_token, guest_preferences(cuisine_prefs, dietary, budget_max, vibe_pref)")
        .then(({ data }) => {
          if (!data?.length) return;
          const mapped: Guest[] = data.map((inv: any, i: number) => {
            const prefs = Array.isArray(inv.guest_preferences) ? inv.guest_preferences[0] : inv.guest_preferences;
            const ini = (inv.name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "??";
            const budget: "$" | "$$" | "$$$" =
              prefs?.budget_max <= 30 ? "$" : prefs?.budget_max <= 60 ? "$$" : "$$$";
            return {
              id: i + 1,
              name: inv.name ?? inv.email ?? "Guest",
              ini,
              status: inv.status === "accepted" ? "confirmed" : inv.status === "declined" ? "declined" : "pending",
              dietary: prefs?.dietary ?? [],
              cuisine: prefs?.cuisine_prefs ?? [],
              budget: prefs?.budget_max ? budget : "$$",
              vibe: prefs?.vibe_pref ?? null,
            };
          });
          setSupaGuests(mapped);
        });
    });
  }, []);

  // Sync RSVP submissions from other tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "gp_rsvp_submissions") {
        setLiveGuests(mergeGuests());
        try {
          const subs: any[] = JSON.parse(e.newValue || "[]");
          const latest = subs[subs.length - 1];
          if (latest?.name) {
            addActivity({ type: "rsvp", ini: latest.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2), name: latest.name, msg: `submitted RSVP · ${latest.attending === "yes" ? "confirmed" : "pending"}`, time: "just now" });
          }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [addActivity]);

  const displayGuests = supaGuests ?? liveGuests;
  const tabProps = { tweaks, liveGuests: displayGuests, addActivity, setTab };

  return (
    <div className="gp-app-shell">
      <header className="gp-mobile-topbar">
        <button
          onClick={() => setNavOpen(true)}
          aria-label="打开菜单"
          style={{ background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3h10M2 7h10M2 11h10" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="5" r="3" fill="var(--bg)" />
              <circle cx="9" cy="9" r="3" fill="var(--bg)" opacity=".5" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-.02em", color: "var(--text)" }}>今天整点啥</span>
        </div>
        <button
          onClick={() => setShowNotif(v => !v)}
          aria-label="通知"
          style={{ position: "relative", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
            <path d="M6.5 1a4.5 4.5 0 0 0-4.5 4.5c0 2.5-.8 3.5-1.5 4h12c-.7-.5-1.5-1.5-1.5-4A4.5 4.5 0 0 0 6.5 1z" stroke="var(--text)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M5.5 12.5a1 1 0 0 0 2 0" stroke="var(--text)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {unread > 0 && (
            <span style={{ position: "absolute", top: -3, right: -3, width: 14, height: 14, borderRadius: "50%", background: "var(--coral)", color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--surface)" }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </header>
      <div className={`gp-sidebar-scrim ${navOpen ? "open" : ""}`} onClick={() => setNavOpen(false)} />
      <div className={`gp-sidebar ${navOpen ? "open" : ""}`} style={{ display: "flex", flexShrink: 0 }}>
        <Sidebar
          activeTab={tab}
          setTab={t => { setTab(t); setShowNotif(false); setNavOpen(false); }}
          onInvite={() => { setShowShare(true); setNavOpen(false); }}
          onNewEvent={() => { setShowCreate(true); setNavOpen(false); }}
          onBell={() => setShowNotif(v => !v)}
          unreadCount={unread}
          liveGuests={displayGuests}
        />
      </div>
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", position: "relative" }}>
        {tab === "overview"    && <OverviewTab    setTab={setTab} liveGuests={displayGuests} />}
        {tab === "preferences" && <PreferencesTab liveGuests={displayGuests} />}
        {tab === "ai"          && <AITab          tweaks={tweaks} addActivity={addActivity} />}
        {tab === "vote"        && <VoteTab        addActivity={addActivity} />}
      </main>
      {/* Floating gear button — always visible */}
      <button
        onClick={() => setTweaksOn(v => !v)}
        title="设置"
        className="gp-tweaks-gear"
        style={{ position: "fixed", bottom: tweaksOn ? 270 : 22, right: 22, zIndex: 450, width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border2)", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--sh)", transition: "bottom .25s var(--sp), opacity .15s", opacity: tweaksOn ? 1 : 0.7 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={e => (e.currentTarget.style.opacity = tweaksOn ? "1" : "0.7")}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{ transition: "transform .35s var(--sp)", transform: tweaksOn ? "rotate(90deg)" : "rotate(0deg)" }}>
          <circle cx="10" cy="10" r="3" stroke="var(--text)" strokeWidth="1.5"/>
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {tweaksOn && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />}
      {showShare  && <ShareModal  onClose={() => setShowShare(false)} liveGuests={displayGuests} />}
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}
      {showNotif  && <NotificationPanel onClose={() => setShowNotif(false)} activities={activities} setActivities={v => { const next = typeof v === "function" ? v(activities) : v; setActivities(next); localStorage.setItem("gp_activities", JSON.stringify(next)); }} />}
      {/* Beta CTA — fixed bottom banner */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 400, background: "var(--surface)", borderTop: "1px solid var(--border2)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "0 -2px 12px rgba(0,0,0,.06)" }}>
        <p style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--fb)", margin: 0, lineHeight: 1.4 }}>
          这是演示页面 — <strong style={{ color: "var(--text)" }}>今天整点啥</strong> 用 AI 帮你搞定聚会方案，少废话直接出发。
        </p>
        <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: "var(--rs)", background: "var(--text)", color: "var(--bg)", fontSize: 12, fontWeight: 600, fontFamily: "var(--fb)", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
          开整 →
        </a>
      </div>
    </div>
  );
}
