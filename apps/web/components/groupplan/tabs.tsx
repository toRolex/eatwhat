"use client";
import { useState, useEffect, useRef } from "react";
import { Guest, Restaurant, Tweaks, RESTAURANTS_DATA, avColor, bgMap, fgMap } from "./types";
import { Av, Badge, Card, Btn, Bracket, SectionLabel } from "./ui";
import { Activity } from "./types";

// ── Helpers ─────────────────────────────────────────────────────────────────
function Counter({ to, duration = 900 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * to));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{val}</>;
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center", verticalAlign: "middle", marginLeft: 4 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--muted)", display: "inline-block", animation: `typewave 1.2s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
    </span>
  );
}

function LiveActivity({ liveGuests }: { liveGuests: Guest[] }) {
  const typing = liveGuests.filter(g => g.status === "pending" || (!g.vibe && g.status === "confirmed"));
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    if (!typing.length) return;
    const iv = setInterval(() => {
      setShow(false);
      setTimeout(() => { setIdx(i => (i + 1) % typing.length); setShow(true); }, 350);
    }, 2800);
    return () => clearInterval(iv);
  }, [typing.length]);
  if (!typing.length) return null;
  const cur = typing[idx % typing.length]!;
  return (
    <div style={{ background: "var(--surface)", borderRadius: "var(--r)", border: "1px solid var(--border2)", padding: "12px 16px", marginBottom: 10, boxShadow: "var(--sh)", animation: "fu .45s var(--sp) .35s both", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "linear-gradient(180deg,var(--sage),transparent)", borderRadius: "3px 0 0 3px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sage)", animation: "pd 2s infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Live Activity</span>
        </div>
        <span style={{ fontSize: 10, color: "var(--muted)" }}>{typing.length} pending</span>
      </div>
      <div style={{ opacity: show ? 1 : 0, transition: "opacity .3s var(--eo)", display: "flex", alignItems: "center", gap: 8, minHeight: 28 }}>
        <Av ini={cur.ini} size={22} />
        <span style={{ fontSize: 12, color: "var(--text)" }}>
          <strong style={{ fontWeight: 500 }}>{cur.name.split(" ")[0]}</strong>
          {" "}<span style={{ color: "var(--muted)" }}>{!cur.vibe ? "is adding their vibe" : "just joined"}</span>
          {!cur.vibe && <TypingDots />}
        </span>
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 9, alignItems: "center" }}>
        {liveGuests.map(g => (
          <div key={g.id} title={g.name} style={{ width: 18, height: 18, borderRadius: "50%", background: bgMap[avColor(g.ini)], color: fgMap[avColor(g.ini)], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 600, opacity: g.vibe ? 1 : 0.35, transition: "opacity .4s", border: g.vibe ? "1.5px solid var(--sage)" : "1.5px solid transparent" }}>{g.ini}</div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>{liveGuests.filter(g => g.vibe).length}/{liveGuests.length} vibes in</div>
      </div>
    </div>
  );
}

// ── Massive Footer ───────────────────────────────────────────────────────────
export function MassiveFooter({ eventName = "The Friday Gathering" }: { eventName?: string }) {
  return (
    <footer style={{ background: "var(--text)", marginTop: 72, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--border2) 1px,transparent 1px),linear-gradient(90deg,var(--border2) 1px,transparent 1px)", backgroundSize: "40px 40px", opacity: .06, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: -20, top: -30, fontFamily: "var(--fd)", fontSize: 240, color: "rgba(255,255,255,.03)", lineHeight: 1, pointerEvents: "none", userSelect: "none", letterSpacing: "-10px" }}>GP</div>
      <div style={{ position: "relative", padding: "52px 32px 32px", maxWidth: 820 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="3" fill="rgba(255,255,255,.9)" /><circle cx="9" cy="9" r="3" fill="rgba(255,255,255,.4)" /></svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.02em", color: "white" }}>GroupPlan</span>
            </div>
            <div style={{ fontFamily: "var(--fd)", fontSize: 32, lineHeight: 1.1, letterSpacing: "-.03em", color: "white", marginBottom: 12 }}>{eventName}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>
              <div>Fri, Apr 25 · 7:00 PM</div>
              <div>Lower Manhattan, NYC</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>Engine</div>
            {["TOPSIS Ranking", "Monte Carlo", "Gemini NLP", "Places API", "MCDA Core"].map(l => (
              <div key={l} style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", flexShrink: 0 }} />{l}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>Stack</div>
            {["Next.js 14", "Supabase", "Claude AI", "Firebase", "SendGrid"].map(l => (
              <div key={l} style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,.2)", flexShrink: 0 }} />{l}
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,.08)", marginBottom: 20 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>© 2026 GroupPlan · MIT License · MCDA-powered group coordination</div>
          <div style={{ display: "flex", gap: 16 }}>
            {["Privacy", "Terms", "GitHub", "Docs"].map(l => (
              <span key={l} style={{ fontSize: 11, color: "rgba(255,255,255,.35)", cursor: "pointer", transition: "color .2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.35)")}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
export function OverviewTab({ setTab, liveGuests }: { setTab: (t: string) => void; liveGuests: Guest[] }) {
  const confirmed = liveGuests.filter(g => g.status === "confirmed");
  const dietary: Record<string, number> = {};
  confirmed.forEach(g => g.dietary.forEach(d => { dietary[d] = (dietary[d] || 0) + 1; }));
  const cuisines: Record<string, number> = {};
  confirmed.forEach(g => g.cuisine.forEach(c => { cuisines[c] = (cuisines[c] || 0) + 1; }));
  const budgets: Record<string, number> = { "$": 0, "$$": 0, "$$$": 0 };
  confirmed.forEach(g => { if (budgets[g.budget] !== undefined) budgets[g.budget] = (budgets[g.budget] ?? 0) + 1; });
  const topC = Object.entries(cuisines).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxC = topC[0]?.[1] ?? 1;

  return (
    <div>
      {/* Hero */}
      <div style={{ padding: "40px 32px 32px", position: "relative", overflow: "hidden", borderBottom: "1px solid var(--border2)" }}>
        <div style={{ position: "absolute", right: 32, top: 24, opacity: .06, pointerEvents: "none" }}>
          <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
            <circle cx="90" cy="90" r="80" stroke="var(--text)" strokeWidth="1" />
            <circle cx="90" cy="90" r="55" stroke="var(--text)" strokeWidth="1" />
            <circle cx="90" cy="90" r="30" stroke="var(--text)" strokeWidth="1" />
            <line x1="10" y1="90" x2="170" y2="90" stroke="var(--text)" strokeWidth="1" />
            <line x1="90" y1="10" x2="90" y2="170" stroke="var(--text)" strokeWidth="1" />
          </svg>
        </div>
        <div style={{ animation: "fu .45s var(--sp) both", maxWidth: 480, position: "relative" }}>
          <SectionLabel style={{ marginBottom: 10 }}>Event Overview</SectionLabel>
          <h2 style={{ fontFamily: "var(--fd)", fontSize: 56, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", marginBottom: 14 }}>
            The Friday<br /><em>Gathering</em>
          </h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge color="green"><span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", animation: "pd 2s infinite" }} />Active Plan</Badge>
            <Badge>Fri Apr 25 · 7 PM</Badge>
            <Badge>Lower Manhattan</Badge>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px 0", maxWidth: 820 }}>
        <LiveActivity liveGuests={liveGuests} />

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
          {[
            { label: "Confirmed", val: confirmed.length, sub: "of 8 invited",  acc: "var(--sage)"  },
            { label: "Dietary Flags", val: Object.keys(dietary).length, sub: "unique needs", acc: "var(--sky)" },
            { label: "Days Until",  val: 5,               sub: "Fri Apr 25",   acc: "var(--amber)" },
          ].map((s, i) => (
            <Card key={s.label} delay={50 + i * 55} style={{ padding: "18px 20px", overflow: "hidden", position: "relative" }}>
              <Bracket size={16} color="var(--border2)" style={{ position: "absolute", top: 8, right: 8 }} />
              <div style={{ fontFamily: "var(--fd)", fontSize: 42, letterSpacing: "-.04em", marginBottom: 2, lineHeight: 1, color: "var(--text)" }}>
                <Counter to={s.val} duration={700 + i * 100} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, color: "var(--text)" }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 12 }}>{s.sub}</div>
              <div style={{ height: 2.5, background: s.acc, borderRadius: 99, width: "36%" }} />
            </Card>
          ))}
        </div>

        {/* Cuisine chart */}
        <Card delay={180} style={{ padding: "18px 20px", marginBottom: 10 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Cuisine Preferences</SectionLabel>
          {topC.map(([name, count], i) => (
            <div key={name} style={{ marginBottom: 10, animation: `fu .4s var(--sp) ${260 + i * 48}ms both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 500, color: "var(--text)", fontFamily: i === 0 ? "var(--fd)" : "var(--fb)", letterSpacing: i === 0 ? "-.01em" : 0 }}>{name}</span>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>{count} votes</span>
              </div>
              <div style={{ height: i === 0 ? 7 : 5, borderRadius: 99, background: "var(--border2)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: i === 0 ? "var(--text)" : i === 1 ? "var(--muted)" : "var(--border)", width: `${(count / maxC) * 100}%`, animation: `bg .8s var(--eo) ${340 + i * 48}ms both` } as React.CSSProperties} />
              </div>
            </div>
          ))}
        </Card>

        {/* Dietary + Budget */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <Card delay={310} style={{ padding: "16px 18px" }}>
            <SectionLabel style={{ marginBottom: 9 }}>Dietary Needs</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Object.entries(dietary).map(([d, c]) => <Badge key={d} color="blue">{d} ×{c}</Badge>)}
            </div>
          </Card>
          <Card delay={355} style={{ padding: "16px 18px" }}>
            <SectionLabel style={{ marginBottom: 9 }}>Budget Split</SectionLabel>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 52 }}>
              {Object.entries(budgets).map(([tier, cnt]) => (
                <div key={tier} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ height: `${Math.max(cnt * 14, 4)}px`, borderRadius: 4, background: cnt > 0 ? "var(--text)" : "var(--border2)", marginBottom: 4, transition: "height .6s var(--eo)" }} />
                  <div style={{ fontSize: 11, fontWeight: 500, color: cnt > 0 ? "var(--text)" : "var(--muted)" }}>{tier}</div>
                  <div style={{ fontSize: 9, color: "var(--muted)" }}>{cnt}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* CTA */}
        <Card delay={400} style={{ padding: "18px 20px", background: "var(--text)", border: "none", position: "relative", overflow: "hidden", marginBottom: 0 }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -20, left: 120, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.03)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "white", marginBottom: 2 }}>Ready to synthesize</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)" }}>5 of 7 vibes collected — strong signal</div>
            </div>
            <button onClick={() => setTab("ai")}
              style={{ padding: "9px 18px", borderRadius: "var(--rs)", border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.12)", color: "white", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)", whiteSpace: "nowrap", transition: "background .2s", backdropFilter: "blur(8px)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.22)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.12)")}>
              Run AI ✦
            </button>
          </div>
        </Card>
      </div>
      <MassiveFooter />
    </div>
  );
}

// ── Preferences Tab ──────────────────────────────────────────────────────────
export function PreferencesTab({ liveGuests }: { liveGuests: Guest[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const [notes, setNotes] = useState(() => typeof window !== "undefined" ? localStorage.getItem("gp_notes") || "" : "");
  const list = liveGuests.filter(g => g.status !== "declined");
  const g = sel !== null ? list[sel] : null;

  return (
    <div>
      <div style={{ padding: "40px 32px 24px", borderBottom: "1px solid var(--border2)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 32, top: 20, opacity: .05, pointerEvents: "none" }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <rect x="10" y="10" width="100" height="100" stroke="var(--text)" strokeWidth="1" />
            <rect x="30" y="30" width="60" height="60" stroke="var(--text)" strokeWidth="1" />
            <line x1="10" y1="60" x2="110" y2="60" stroke="var(--text)" strokeWidth="1" />
            <line x1="60" y1="10" x2="60" y2="110" stroke="var(--text)" strokeWidth="1" />
          </svg>
        </div>
        <SectionLabel style={{ marginBottom: 10 }}>Guest Preferences</SectionLabel>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 48, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)" }}>
          What everyone<br /><em>wants</em>
        </h2>
      </div>

      <div style={{ padding: "24px 32px 0", maxWidth: 820 }}>
        {/* Host notes */}
        <Card delay={0} style={{ padding: "16px 18px", marginBottom: 14 }}>
          <SectionLabel style={{ marginBottom: 8 }}>Host Notes & Additional Preferences</SectionLabel>
          <textarea value={notes}
            onChange={e => { setNotes(e.target.value); localStorage.setItem("gp_notes", e.target.value); }}
            placeholder={"Add constraints, special occasions, or preferences for the AI engine…\ne.g. \"Someone is celebrating a birthday\" or \"Avoid noisy areas\""}
            style={{ width: "100%", minHeight: 76, padding: "10px 12px", borderRadius: "var(--rs)", border: "1px solid var(--border2)", background: "var(--bg)", fontSize: 12, outline: "none", resize: "vertical", lineHeight: 1.65, transition: "border-color .2s", color: "var(--text)", fontFamily: "var(--fb)" }}
            onFocus={e => (e.target.style.borderColor = "var(--border)")}
            onBlur={e => (e.target.style.borderColor = "var(--border2)")} />
          {notes && (
            <div style={{ marginTop: 5, fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--sage)" }}>✓</span> Saved · will be included in AI synthesis
            </div>
          )}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(185px,1fr))", gap: 8, marginBottom: 12 }}>
          {list.map((guest, i) => (
            <Card key={guest.id} delay={i * 35} onClick={() => setSel(sel === i ? null : i)} style={{ padding: "13px 14px", borderColor: sel === i ? "var(--border)" : "var(--border2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Av ini={guest.ini} size={27} delay={i * 35} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{guest.name.split(" ")[0]}</div>
                  <Badge color={guest.status === "confirmed" ? "green" : guest.status === "declined" ? "red" : "amber"}>{guest.status}</Badge>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 }}>
                {guest.dietary.map(d => <Badge key={d} color="blue">{d}</Badge>)}
                <Badge>{guest.budget}</Badge>
              </div>
              {guest.vibe
                ? <div style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.5 }}>"{guest.vibe}"</div>
                : guest.status === "pending" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--muted)" }}>
                    <span>Adding vibe</span><TypingDots />
                  </div>
                )}
            </Card>
          ))}
        </div>

        {g && (
          <Card delay={0} style={{ padding: "16px 18px", marginBottom: 12, animation: "si .3s var(--sp) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Av ini={g.ini} size={34} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{g.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Full breakdown</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {([["Dietary", g.dietary.length ? g.dietary.join(", ") : "None"], ["Cuisine", g.cuisine.join(", ")], ["Budget", g.budget]] as [string,string][]).map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: label === "Budget" ? 22 : 12, fontFamily: label === "Budget" ? "var(--fd)" : "var(--fb)", color: "var(--text)" }}>{val}</div>
                </div>
              ))}
            </div>
            {g.vibe && (
              <div style={{ marginTop: 11, padding: "9px 12px", background: "var(--bg)", borderRadius: "var(--rs)", borderLeft: "3px solid var(--muted)" }}>
                <div style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 2 }}>Vibe</div>
                <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--text)" }}>{g.vibe}</div>
              </div>
            )}
          </Card>
        )}
      </div>
      <MassiveFooter eventName="Guest Preferences" />
    </div>
  );
}

// ── AI Tab ───────────────────────────────────────────────────────────────────
const AI_STEPS = [
  { l: "Parsing vibe inputs via Gemini",   d: "NLP → JSON schema" },
  { l: "Computing geospatial centroid",    d: "3D weighted Cartesian" },
  { l: "Querying Google Places API",       d: "Centroid-cached, cost-pruned" },
  { l: "Running TOPSIS ranking",           d: "Euclidean normalization" },
  { l: "Monte Carlo simulation",           d: "100× Gaussian noise" },
  { l: "Constructing decision reasoning",  d: "Gemini narration layer" },
];

function RestCard({ r, rank, delay, tweaks, open, onToggle }: { r: Restaurant; rank: number; delay: number; tweaks: Tweaks; open: boolean; onToggle: () => void }) {
  const [h, setH] = useState(false);
  const rc = ["var(--amber)", "var(--muted)", "oklch(60% .1 50)"];
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: "var(--surface)", borderRadius: "var(--r)", border: `1px solid ${h ? "var(--border)" : "var(--border2)"}`, boxShadow: h ? "var(--shh)" : "var(--sh)", transition: "all .25s var(--eo)", transform: h ? "translateY(-2px)" : "none", overflow: "hidden", animation: `fu .5s var(--sp) ${delay}ms both`, marginBottom: 10 }}
    >
      <div style={{ height: 3, background: r.accent }} />
      <div style={{ padding: "15px 17px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 14, color: rc[rank - 1], flexShrink: 0 }}>{rank}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.02em", color: "var(--text)" }}>{r.name}</span>
              <Badge color="amber">{r.match}% match</Badge>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{r.cuisine} · {r.price} · {r.dist} · ★ {r.rating}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>{r.tags.map(t => <Badge key={t}>{t}</Badge>)}</div>
            <div style={{ height: 80, borderRadius: "var(--rs)", background: "var(--bg)", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 7 }}>
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--border)", textAlign: "center" }}>[ photo — {r.cuisine.toLowerCase()} interior ]</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>{r.addr} · {r.hours}</div>
          </div>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="22" cy="22" r="17" fill="none" stroke="var(--border2)" strokeWidth="2.5" />
              <circle cx="22" cy="22" r="17" fill="none" stroke={r.accent} strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 17 * r.match / 100} ${2 * Math.PI * 17}`} strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 10, fontWeight: 600, marginTop: -2, color: "var(--text)" }}>{r.match}%</div>
          </div>
        </div>
        {tweaks.showAIReasoning && (
          <button onClick={onToggle}
            style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 10, color: "var(--muted)", padding: 0, transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
            <span style={{ display: "inline-block", transition: "transform .2s var(--sp)", transform: open ? "rotate(90deg)" : "none" }}>▶</span> AI Reasoning
          </button>
        )}
        {open && <div style={{ marginTop: 6, padding: "8px 10px", background: "var(--bg)", borderRadius: "var(--rs)", fontSize: 10, color: "var(--muted)", lineHeight: 1.7, fontFamily: "monospace", animation: "sd .28s var(--sp) both" }}>{r.reasoning}</div>}
      </div>
    </div>
  );
}

interface RealProposal {
  rank: number;
  restaurant_name: string;
  restaurant_addr: string;
  cuisine_type: string;
  cuisine_types: string[];
  price_range: string;
  rating: number;
  review_count: number;
  image_url: string | null;
  maps_url: string | null;
  reasoning: string;
  constraints_met: Record<string, boolean>;
  constraints_gap: Record<string, string>;
}

function RealRestCard({ p, delay, tweaks, open, onToggle }: { p: RealProposal; delay: number; tweaks: Tweaks; open: boolean; onToggle: () => void }) {
  const [h, setH] = useState(false);
  const accents = ["var(--amber)", "var(--sage)", "var(--sky)"];
  const accent = accents[(p.rank - 1) % accents.length] ?? "var(--muted)";
  const metCount = Object.values(p.constraints_met).filter(Boolean).length;
  const totalCount = Object.keys(p.constraints_met).length;
  const matchPct = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 90;
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: "var(--surface)", borderRadius: "var(--r)", border: `1px solid ${h ? "var(--border)" : "var(--border2)"}`, boxShadow: h ? "var(--shh)" : "var(--sh)", transition: "all .25s var(--eo)", transform: h ? "translateY(-2px)" : "none", overflow: "hidden", animation: `fu .5s var(--sp) ${delay}ms both`, marginBottom: 10 }}
    >
      <div style={{ height: 3, background: accent }} />
      <div style={{ padding: "15px 17px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", border: "1.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fd)", fontSize: 14, color: accent, flexShrink: 0 }}>{p.rank}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.02em", color: "var(--text)" }}>{p.restaurant_name}</span>
              <Badge color="amber">{matchPct}% match</Badge>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{p.cuisine_type} · {p.price_range} · ★ {p.rating}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
              {p.cuisine_types.slice(0, 3).map(t => <Badge key={t}>{t}</Badge>)}
              {p.review_count > 0 && <Badge>{p.review_count} reviews</Badge>}
            </div>
            {p.maps_url ? (
              <a href={p.maps_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "var(--muted)", textDecoration: "none" }}>{p.restaurant_addr}</a>
            ) : (
              <div style={{ fontSize: 10, color: "var(--muted)" }}>{p.restaurant_addr}</div>
            )}
          </div>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="22" cy="22" r="17" fill="none" stroke="var(--border2)" strokeWidth="2.5" />
              <circle cx="22" cy="22" r="17" fill="none" stroke={accent} strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 17 * matchPct / 100} ${2 * Math.PI * 17}`} strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 10, fontWeight: 600, marginTop: -2, color: "var(--text)" }}>{matchPct}%</div>
          </div>
        </div>
        {tweaks.showAIReasoning && (
          <button onClick={onToggle}
            style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 10, color: "var(--muted)", padding: 0, transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}>
            <span style={{ display: "inline-block", transition: "transform .2s var(--sp)", transform: open ? "rotate(90deg)" : "none" }}>▶</span> AI Reasoning
          </button>
        )}
        {open && <div style={{ marginTop: 6, padding: "8px 10px", background: "var(--bg)", borderRadius: "var(--rs)", fontSize: 10, color: "var(--muted)", lineHeight: 1.7, fontFamily: "monospace", animation: "sd .28s var(--sp) both" }}>{p.reasoning}</div>}
      </div>
    </div>
  );
}

export function AITab({ tweaks, addActivity }: { tweaks: Tweaks; addActivity: (item: Omit<Activity, "id" | "read">) => void }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("gp_ai") as any) || "idle";
    return "idle";
  });
  const [step, setStep]               = useState(0);
  const [open, setOpen]               = useState<Record<number, boolean>>({});
  const [location, setLocation]       = useState("New York, NY");
  const [realProposals, setReal]      = useState<RealProposal[]>(() => {
    try { return JSON.parse(localStorage.getItem("gp_ai_proposals") || "null") || []; } catch { return []; }
  });
  const [errorMsg, setErrorMsg]       = useState("");
  useEffect(() => { localStorage.setItem("gp_ai", phase); }, [phase]);

  const run = async () => {
    setPhase("running"); setStep(0); setErrorMsg("");
    // Animate steps while the real fetch runs in parallel
    let s = 0;
    const iv = setInterval(() => {
      s = Math.min(s + 1, AI_STEPS.length - 1);
      setStep(s);
    }, 700);

    try {
      const res = await fetch("/api/demo/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });
      clearInterval(iv);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Synthesis failed");
      }
      const data = await res.json() as { proposals: RealProposal[] };
      setStep(AI_STEPS.length);
      setReal(data.proposals);
      localStorage.setItem("gp_ai_proposals", JSON.stringify(data.proposals));
      setTimeout(() => {
        setPhase("done");
        addActivity({ type: "ai", ini: "✦", name: "AI Engine", msg: `Synthesis complete — 3 venues ranked in ${location}`, time: "just now" });
      }, 400);
    } catch (err: any) {
      clearInterval(iv);
      setErrorMsg(err?.message || "Unknown error");
      setPhase("error");
    }
  };

  const reset = () => { setPhase("idle"); setStep(0); setReal([]); localStorage.removeItem("gp_ai"); localStorage.removeItem("gp_ai_proposals"); };

  if (phase === "idle" || phase === "error") return (
    <div>
      <div style={{ padding: "40px 32px 28px", borderBottom: "1px solid var(--border2)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 24, top: 16, opacity: .05, pointerEvents: "none" }}>
          <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
            {[0,1,2,3,4].map(i => <polygon key={i} points="70,10 130,50 130,90 70,130 10,90 10,50" stroke="var(--text)" strokeWidth="1" fill="none" transform={`rotate(${i * 18} 70 70)`} />)}
          </svg>
        </div>
        <SectionLabel style={{ marginBottom: 10 }}>AI Synthesis</SectionLabel>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 48, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", marginBottom: 10 }}>
          Ready to find<br /><em>the perfect spot</em>
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, maxWidth: 360 }}>Real venue search via Yelp + Claude synthesis — tuned to your group's preferences.</p>
      </div>
      <div style={{ padding: "24px 32px", maxWidth: 640 }}>
        <Card delay={85} style={{ padding: "16px 18px", marginBottom: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Decision Pipeline</SectionLabel>
          {AI_STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < AI_STEPS.length - 1 ? "1px solid var(--border2)" : "none", animation: `fu .4s var(--sp) ${i * 42 + 65}ms both` }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--bg)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 600, color: "var(--muted)", flexShrink: 0 }}>{i + 1}</div>
              <div><div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{s.l}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>{s.d}</div></div>
            </div>
          ))}
        </Card>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6, fontFamily: "var(--fb)" }}>Location</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="New York, NY"
            style={{ width: "100%", padding: "9px 12px", border: "1px solid var(--border2)", borderRadius: "var(--rs)", fontSize: 13, fontFamily: "var(--fb)", color: "var(--text)", background: "var(--bg)", outline: "none", boxSizing: "border-box" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--text)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border2)")}
          />
        </div>
        {phase === "error" && <p style={{ fontSize: 12, color: "oklch(55% 0.18 26)", fontFamily: "var(--fb)", marginBottom: 10 }}>{errorMsg}</p>}
        <Btn onClick={run} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span>✦</span> Run AI Synthesis
        </Btn>
      </div>
      <MassiveFooter eventName="AI Synthesis" />
    </div>
  );

  if (phase === "running") return (
    <div style={{ padding: "40px 32px 48px", maxWidth: 520 }}>
      <div style={{ animation: "fu .4s var(--sp) both", marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--text)", borderTopColor: "transparent", animation: "sp2 .75s linear infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em" }}>Processing</span>
        </div>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 36, letterSpacing: "-.03em", color: "var(--text)" }}>Running the<br /><em>decision engine</em></h2>
      </div>
      {AI_STEPS.map((s, i) => {
        const done = i < step, active = i === step - 1;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < AI_STEPS.length - 1 ? "1px solid var(--border2)" : "none", opacity: i >= step ? .3 : 1, transition: "opacity .35s var(--eo)" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: done ? "var(--text)" : active ? "var(--surface)" : "var(--border2)", border: active ? "2px solid var(--text)" : "none", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .3s var(--sp)" }}>
              {done && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {active && <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid var(--text)", borderTopColor: "transparent", animation: "sp2 .7s linear infinite" }} />}
            </div>
            <div><div style={{ fontSize: 12, fontWeight: done ? 500 : 400, color: "var(--text)" }}>{s.l}</div><div style={{ fontSize: 10, color: "var(--muted)" }}>{s.d}</div></div>
          </div>
        );
      })}
      <p style={{ marginTop: 20, fontSize: 11, color: "var(--muted)", fontFamily: "var(--fb)" }}>Searching Yelp · calling Claude · ranking venues…</p>
    </div>
  );

  return (
    <div>
      <div style={{ padding: "40px 32px 24px", borderBottom: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Badge color="green">✓ Complete</Badge>
          <button onClick={reset} style={{ fontSize: 10, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)" }}>Rerun</button>
        </div>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 48, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", marginBottom: 5 }}>
          3 spots ranked<br /><em style={{ color: "var(--muted)" }}>for your group</em>
        </h2>
        <p style={{ fontSize: 11, color: "var(--muted)" }}>Real venues in <strong style={{ color: "var(--text)" }}>{location}</strong> · ranked by Claude across 5 guest preference profiles</p>
      </div>
      <div style={{ padding: "24px 32px 0", maxWidth: 760 }}>
        {realProposals.map((p, i) => (
          <RealRestCard key={i} p={p} delay={i * 80} tweaks={tweaks} open={!!open[i]} onToggle={() => setOpen(prev => ({ ...prev, [i]: !prev[i] }))} />
        ))}
      </div>
      <MassiveFooter eventName="AI Results" />
    </div>
  );
}

// ── Vote Tab ─────────────────────────────────────────────────────────────────
function downloadICS(restaurant: Restaurant) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dt = new Date(2026, 3, 25, 19, 0, 0), dte = new Date(2026, 3, 25, 22, 0, 0);
  const fmt = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//GroupPlan//EN","BEGIN:VEVENT",`DTSTART:${fmt(dt)}`,`DTEND:${fmt(dte)}`,`SUMMARY:The Friday Gathering @ ${restaurant.name}`,`DESCRIPTION:GroupPlan event · AI-matched.`,`LOCATION:${restaurant.addr}\\, NYC`,"STATUS:CONFIRMED","END:VEVENT","END:VCALENDAR"].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "friday-gathering.ics"; a.click(); URL.revokeObjectURL(url);
}

export function VoteTab({ addActivity }: { addActivity: (item: Omit<Activity, "id" | "read">) => void }) {
  const [ranking, setRanking] = useState([0, 1, 2]);
  const [scores, setScores] = useState<number[]>(() => {
    if (typeof window !== "undefined") return JSON.parse(localStorage.getItem("gp_scores") || "[3,2,1]");
    return [3, 2, 1];
  });
  const [done, setDone] = useState(() => typeof window !== "undefined" && !!localStorage.getItem("gp_voted"));
  const moveUp   = (i: number) => { if (i === 0) return; const r = [...ranking] as number[]; const a = r[i]!; const b = r[i-1]!; r[i] = b; r[i-1] = a; setRanking(r); };
  const moveDown = (i: number) => { if (i === ranking.length-1) return; const r = [...ranking] as number[]; const a = r[i]!; const b = r[i+1]!; r[i] = b; r[i+1] = a; setRanking(r); };

  const submit = () => {
    const s = [...scores] as number[];
    ranking.forEach((idx, pos) => { s[idx] = (s[idx] ?? 0) + Math.max(0, 3 - pos) + 1; });
    setScores(s); localStorage.setItem("gp_scores", JSON.stringify(s)); localStorage.setItem("gp_voted", "1");
    addActivity({ type: "vote", ini: "◎", name: "You", msg: `Voted: ${RESTAURANTS_DATA[ranking[0] ?? 0]?.name ?? ""} as top pick`, time: "just now" });
    setDone(true);
  };

  const maxS = Math.max(...scores, 1);
  const winner = scores.indexOf(Math.max(...scores));

  return (
    <div>
      <div style={{ padding: "40px 32px 24px", borderBottom: "1px solid var(--border2)" }}>
        <SectionLabel style={{ marginBottom: 10 }}>Ranked-Choice Vote</SectionLabel>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 48, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)" }}>
          Cast your<br /><em>ranking</em>
        </h2>
      </div>
      <div style={{ padding: "24px 32px 0", maxWidth: 640 }}>
        {!done ? (
          <>
            <Card delay={70} style={{ padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 10 }}>#1 is your top pick</div>
              {ranking.map((ri, pos) => {
                const r = RESTAURANTS_DATA[ri ?? 0];
                return (
                  <div key={r?.id ?? pos} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: "var(--rs)", marginBottom: 4, background: pos === 0 ? "var(--bg)" : "transparent", border: "1px solid", borderColor: pos === 0 ? "var(--border)" : "transparent", transition: "all .25s var(--sp)", animation: `fu .4s var(--sp) ${pos * 50 + 75}ms both` }}>
                    <span style={{ fontSize: 18, fontFamily: "var(--fd)", color: "var(--muted)", width: 22, textAlign: "center" }}>{["①","②","③"][pos]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{r?.name}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)" }}>{r?.cuisine} · {r?.price}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button onClick={() => moveUp(pos)} style={{ background: "none", border: "1px solid var(--border2)", borderRadius: 4, width: 19, height: 19, cursor: "pointer", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: pos === 0 ? .3 : 1, color: "var(--text)" }}>↑</button>
                      <button onClick={() => moveDown(pos)} style={{ background: "none", border: "1px solid var(--border2)", borderRadius: 4, width: 19, height: 19, cursor: "pointer", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: pos === ranking.length - 1 ? .3 : 1, color: "var(--text)" }}>↓</button>
                    </div>
                  </div>
                );
              })}
            </Card>
            <Btn onClick={submit} style={{ fontSize: 12 }}>Submit Vote</Btn>
          </>
        ) : (
          <div>
            <Card delay={0} style={{ padding: "16px 18px", marginBottom: 11, animation: "si .4s var(--sp) both" }}>
              <SectionLabel style={{ marginBottom: 11 }}>Live Results</SectionLabel>
              {RESTAURANTS_DATA.map((r, i) => (
                <div key={r.id} style={{ marginBottom: 10, animation: `fu .45s var(--sp) ${i * 60}ms both` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{r.name}</span>
                      {winner === i && <Badge color="amber">🏆 Winner</Badge>}
                    </div>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>{scores[i] ?? 0} pts</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "var(--border2)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 99, background: winner === i ? r.accent : "var(--border)", width: `${((scores[i] ?? 0) / maxS) * 100}%`, animation: `bg .8s var(--eo) ${i * 70}ms both` } as React.CSSProperties} />
                  </div>
                </div>
              ))}
            </Card>
            <Card delay={150} style={{ padding: "18px 20px", background: "var(--text)", border: "none", animation: "si .5s var(--sp) .15s both", position: "relative", overflow: "hidden", marginBottom: 0 }}>
              <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />
              <div style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "rgba(255,255,255,.4)", marginBottom: 5 }}>The group has spoken</div>
              <div style={{ fontFamily: "var(--fd)", fontSize: 26, color: "white", letterSpacing: "-.02em", marginBottom: 2 }}>{RESTAURANTS_DATA[winner]?.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 16 }}>{RESTAURANTS_DATA[winner]?.addr} · {RESTAURANTS_DATA[winner]?.hours}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { const w = RESTAURANTS_DATA[winner]; if (w) downloadICS(w); }}
                  style={{ padding: "8px 16px", borderRadius: "var(--rs)", border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.12)", color: "white", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)", transition: "background .2s", display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(8px)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.22)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.12)")}>
                  <svg width="10" height="11" viewBox="0 0 10 11" fill="none"><path d="M5 1v6M2 5l3 3 3-3M1 10h8" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Export .ics
                </button>
                <button style={{ padding: "8px 16px", borderRadius: "var(--rs)", border: "1px solid rgba(255,255,255,.15)", background: "transparent", color: "rgba(255,255,255,.7)", fontSize: 11, cursor: "pointer", fontFamily: "var(--fb)", transition: "background .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  Share result
                </button>
              </div>
            </Card>
            <button onClick={() => { localStorage.removeItem("gp_voted"); setDone(false); }} style={{ marginTop: 9, fontSize: 10, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)" }}>
              Reset vote
            </button>
          </div>
        )}
      </div>
      <MassiveFooter eventName="Group Vote" />
    </div>
  );
}
