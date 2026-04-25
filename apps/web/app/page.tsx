"use client";
import { useState, useEffect, useCallback } from "react";
import { Tweaks, TWEAKS_DEFAULTS, GUESTS_DATA, INITIAL_ACTIVITIES, Guest, Activity } from "../components/groupplan/types";
import { Sidebar, ShareModal, CreateEventModal } from "../components/groupplan/modals";
import { NotificationPanel } from "../components/groupplan/notifications";
import { OverviewTab, PreferencesTab, AITab, VoteTab } from "../components/groupplan/tabs";

function TweaksPanel({ tweaks, setTweaks }: { tweaks: Tweaks; setTweaks: (t: Tweaks) => void }) {
  const toggle = (k: keyof Tweaks) => {
    const n = { ...tweaks, [k]: !tweaks[k] } as Tweaks;
    setTweaks(n);
    if (k === "darkMode") document.body.classList.toggle("dark", n.darkMode);
  };
  const setK = (k: keyof Tweaks, v: string) => setTweaks({ ...tweaks, [k]: v } as Tweaks);

  return (
    <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 300, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "15px 17px", width: 230, boxShadow: "var(--shh)", animation: "si .28s var(--sp)", transformOrigin: "bottom right", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Tweaks</div>
      {(["darkMode", "showAIReasoning", "animations"] as (keyof Tweaks)[]).map(key => (
        <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span style={{ fontSize: 12, color: "var(--text)" }}>{key === "darkMode" ? "Dark Mode" : key === "showAIReasoning" ? "AI Reasoning" : "Animations"}</span>
          <button onClick={() => toggle(key)} style={{ width: 32, height: 18, borderRadius: 99, border: "none", cursor: "pointer", background: tweaks[key] ? "var(--text)" : "var(--border)", position: "relative", transition: "background .25s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 1.5, left: tweaks[key] ? 13.5 : 1.5, width: 15, height: 15, borderRadius: "50%", background: "white", transition: "left .2s var(--sp)", boxShadow: "0 1px 4px rgba(0,0,0,.25)", display: "block" }} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 12, color: "var(--text)" }}>Accent</span>
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
  const [tab, setTab] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("gp_tab") || "overview";
    return "overview";
  });
  const [tweaks, setTweaks] = useState<Tweaks>(() => {
    try {
      const s = typeof window !== "undefined" ? localStorage.getItem("gp_tweaks") : null;
      return s ? { ...TWEAKS_DEFAULTS, ...JSON.parse(s) } : TWEAKS_DEFAULTS;
    } catch { return TWEAKS_DEFAULTS; }
  });
  const [tweaksOn, setTweaksOn] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const s = typeof window !== "undefined" ? localStorage.getItem("gp_activities") : null;
      return s ? JSON.parse(s) : INITIAL_ACTIVITIES;
    } catch { return INITIAL_ACTIVITIES; }
  });
  const [liveGuests, setLiveGuests] = useState<Guest[]>(() => {
    if (typeof window !== "undefined") return mergeGuests();
    return [...GUESTS_DATA];
  });

  const addActivity = useCallback((item: Omit<Activity, "id" | "read">) => {
    setActivities(prev => {
      const next = [{ ...item, id: Date.now(), read: false }, ...prev].slice(0, 20);
      localStorage.setItem("gp_activities", JSON.stringify(next));
      return next;
    });
  }, []);

  const unread = activities.filter(a => !a.read).length;

  useEffect(() => { localStorage.setItem("gp_tab", tab); }, [tab]);
  useEffect(() => {
    localStorage.setItem("gp_tweaks", JSON.stringify(tweaks));
    document.body.classList.toggle("dark", tweaks.darkMode);
  }, [tweaks]);
  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem("gp_tweaks") || "{}");
      document.body.classList.toggle("dark", !!t.darkMode);
    } catch {}
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

  const tabProps = { tweaks, liveGuests, addActivity, setTab };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        activeTab={tab}
        setTab={t => { setTab(t); setShowNotif(false); }}
        onInvite={() => setShowShare(true)}
        onNewEvent={() => setShowCreate(true)}
        onBell={() => setShowNotif(v => !v)}
        unreadCount={unread}
        liveGuests={liveGuests}
      />
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", position: "relative" }}>
        {tab === "overview"    && <OverviewTab    setTab={setTab} liveGuests={liveGuests} />}
        {tab === "preferences" && <PreferencesTab liveGuests={liveGuests} />}
        {tab === "ai"          && <AITab          tweaks={tweaks} addActivity={addActivity} />}
        {tab === "vote"        && <VoteTab        addActivity={addActivity} />}
      </main>
      {tweaksOn && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />}
      {showShare  && <ShareModal  onClose={() => setShowShare(false)} />}
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}
      {showNotif  && <NotificationPanel onClose={() => setShowNotif(false)} activities={activities} setActivities={v => { const next = typeof v === "function" ? v(activities) : v; setActivities(next); localStorage.setItem("gp_activities", JSON.stringify(next)); }} />}
    </div>
  );
}
