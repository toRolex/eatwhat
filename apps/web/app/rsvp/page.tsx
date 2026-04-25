"use client";
import { useState, useEffect, CSSProperties } from "react";

const STEPS = ["Attendance", "About you", "Preferences", "Vibe"];

const DIETARY_OPTS = ["Vegetarian","Vegan","Gluten-free","Halal","Kosher","Dairy-free","Nut allergy","No restrictions"];
const CUISINE_OPTS = ["Japanese","Italian","Mexican","Thai","Indian","Mediterranean","American","Vietnamese","Korean","French","Any"];
const BUDGET_OPTS = [
  { val: "$",    label: "Budget",   sub: "Under $20/pp" },
  { val: "$$",   label: "Moderate", sub: "$20–40/pp" },
  { val: "$$$",  label: "Upscale",  sub: "$40–70/pp" },
  { val: "$$$$", label: "Splurge",  sub: "$70+/pp" },
];

interface RSVPForm {
  attending?: "yes" | "maybe" | "no";
  name?: string;
  dietary?: string[];
  cuisine?: string[];
  budget?: string;
  vibe?: string;
}

function submitRSVP(form: RSVPForm) {
  try {
    const existing: (RSVPForm & { timestamp: number })[] = JSON.parse(
      localStorage.getItem("gp_rsvp_submissions") || "[]"
    );
    const idx = existing.findIndex(s => s.name?.toLowerCase() === form.name?.toLowerCase());
    const entry = { ...form, timestamp: Date.now() };
    if (idx >= 0) existing[idx] = entry; else existing.push(entry);
    localStorage.setItem("gp_rsvp_submissions", JSON.stringify(existing));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "gp_rsvp_submissions",
      newValue: JSON.stringify(existing),
    }));
  } catch (e) {
    console.warn("RSVP sync failed:", e);
  }
}

function Chip({ children, active, onClick }: { children: string; active: boolean; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: "9px 17px", borderRadius: 99,
        border: `1.5px solid ${active ? "var(--text)" : "var(--border2)"}`,
        background: active ? "var(--text)" : h ? "var(--border2)" : "var(--surface)",
        color: active ? "white" : "var(--text)",
        fontSize: 14, fontWeight: active ? 500 : 400,
        cursor: "pointer", fontFamily: "var(--fb)",
        transition: "all .2s var(--sp)",
        transform: h && !active ? "scale(1.03)" : "scale(1)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export default function RSVPPage() {
  const [step, setStep] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("rsvp_step") || "0");
  });
  const [form, setForm] = useState<RSVPForm>(() => {
    try {
      if (typeof window === "undefined") return {};
      return JSON.parse(localStorage.getItem("rsvp_form") || "{}");
    } catch { return {}; }
  });
  const [done, setDone] = useState(() =>
    typeof window !== "undefined" && !!localStorage.getItem("rsvp_done")
  );
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof RSVPForm) => (v: RSVPForm[typeof k]) => {
    setForm(f => {
      const n = { ...f, [k]: v };
      localStorage.setItem("rsvp_form", JSON.stringify(n));
      return n;
    });
  };

  const toggleArr = (k: "dietary" | "cuisine", v: string) => {
    const cur = (form[k] as string[]) || [];
    set(k)(cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]);
  };

  useEffect(() => { localStorage.setItem("rsvp_step", String(step)); }, [step]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      setSubmitting(true);
      setTimeout(() => {
        submitRSVP(form);
        localStorage.setItem("rsvp_done", "1");
        setDone(true);
        setSubmitting(false);
      }, 800);
    }
  };
  const back = () => setStep(s => Math.max(0, s - 1));
  const nextDisabled = submitting || (step === 0 && !form.attending);

  // ── Completion screen ───────────────────────────────────────────────
  if (done) return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px", textAlign: "center",
      background: "var(--bg)",
    }}>
      <div style={{ animation: "si .5s var(--sp) both", maxWidth: 360, width: "100%" }}>
        {/* Check circle */}
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: "oklch(92% .07 148)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <path d="M2 11L10 19L26 3" stroke="oklch(34% .13 148)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="30" style={{ animation: "checkDraw .4s var(--eo) .2s both" } as CSSProperties} />
          </svg>
        </div>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 36, letterSpacing: "-.02em", marginBottom: 8, color: "var(--text)" }}>You're in!</h2>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, marginBottom: 24 }}>
          Preferences locked. The AI will synthesize once all RSVPs are in.
        </p>

        {/* Submission summary */}
        <div style={{ background: "var(--surface)", borderRadius: "var(--r)", border: "1px solid var(--border2)", padding: "16px 18px", textAlign: "left", marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 9 }}>Your submission</div>
          {([
            ["Name",     form.name || "—"],
            ["Attending", form.attending === "yes" ? "Yes ✓" : form.attending === "no" ? "No" : "Maybe"],
            ["Dietary",  (form.dietary || []).join(", ") || "None"],
            ["Cuisine",  (form.cuisine || []).slice(0, 2).join(", ") || "—"],
            ["Budget",   form.budget || "—"],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--border2)" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 500, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200, color: "var(--text)" }}>{v}</span>
            </div>
          ))}
          {form.vibe && (
            <div style={{ marginTop: 9, padding: "8px 10px", background: "var(--bg)", borderRadius: 8, borderLeft: "3px solid var(--muted)" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}>Vibe</div>
              <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--text)" }}>"{form.vibe}"</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
          <a href="/" style={{ display: "block", padding: 12, borderRadius: "var(--rs)", background: "var(--text)", color: "white", fontSize: 13, fontWeight: 500, textDecoration: "none", textAlign: "center", transition: "opacity .2s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            View dashboard →
          </a>
          <button onClick={() => { localStorage.removeItem("rsvp_done"); setDone(false); setStep(0); }}
            style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)" }}>
            Edit response
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main flow ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* Sticky header */}
      <div style={{ background: "rgba(255,255,255,.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid var(--border2)", padding: "14px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="5" r="3" fill="white" />
              <circle cx="9" cy="9" r="3" fill="white" opacity=".5" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-.02em", color: "var(--text)" }}>GroupPlan</span>
        </div>
        {/* Progress bar */}
        <div style={{ display: "flex", gap: 4 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= step ? "var(--text)" : "var(--border2)", transition: "background .3s var(--eo)" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text)" }}>{STEPS[step]}</span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{step + 1}/{STEPS.length}</span>
        </div>
      </div>

      {/* Event banner — step 0 only */}
      {step === 0 && (
        <div style={{ background: "var(--text)", padding: "28px 22px 24px", animation: "fu .45s var(--sp) both", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 20, bottom: -30, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.03)", pointerEvents: "none" }} />
          <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>You're invited</div>
          <h1 style={{ fontFamily: "var(--fd)", fontSize: 32, color: "white", letterSpacing: "-.03em", lineHeight: 1.0, marginBottom: 6 }}>
            The Friday<br />Gathering
          </h1>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.7 }}>
            <div>Fri, Apr 25 · 7:00 PM</div>
            <div>Lower Manhattan, NYC</div>
          </div>
        </div>
      )}

      {/* Step content */}
      <div style={{ flex: 1, padding: "24px 22px", maxWidth: 480, width: "100%", margin: "0 auto" }}>

        {/* Step 0 — Attendance */}
        {step === 0 && (
          <div style={{ animation: "fu .4s var(--sp) both" }}>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 28, letterSpacing: "-.02em", marginBottom: 6, color: "var(--text)" }}>Can you make it?</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 22, lineHeight: 1.6 }}>Let the host know if you'll be joining.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { v: "yes",   label: "Yes, I'll be there",  icon: "✓", bg: "oklch(92% .07 148)", fg: "oklch(34% .13 148)" },
                { v: "maybe", label: "Maybe — not sure yet", icon: "?", bg: "oklch(94% .07 72)",  fg: "oklch(44% .15 72)"  },
                { v: "no",    label: "Can't make it",        icon: "✕", bg: "oklch(93% .07 20)",  fg: "oklch(40% .17 20)"  },
              ].map(opt => (
                <button key={opt.v} onClick={() => set("attending")(opt.v as RSVPForm["attending"])}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "16px 18px", borderRadius: "var(--r)",
                    border: `1.5px solid ${form.attending === opt.v ? "var(--text)" : "var(--border2)"}`,
                    background: form.attending === opt.v ? opt.bg : "var(--surface)",
                    cursor: "pointer", fontFamily: "var(--fb)", textAlign: "left",
                    transition: "all .22s var(--sp)",
                  }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: form.attending === opt.v ? "white" : "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: opt.fg, flexShrink: 0, transition: "background .2s" }}>{opt.icon}</div>
                  <span style={{ fontSize: 15, fontWeight: form.attending === opt.v ? 500 : 400, color: form.attending === opt.v ? opt.fg : "var(--text)" }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Name + dietary */}
        {step === 1 && (
          <div style={{ animation: "fu .4s var(--sp) both" }}>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 28, letterSpacing: "-.02em", marginBottom: 6, color: "var(--text)" }}>Tell us about you</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.6 }}>So the host knows who's in.</p>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 7 }}>Your name</div>
              <input
                value={form.name || ""} onChange={e => set("name")(e.target.value)} placeholder="Jordan Kim"
                style={{ width: "100%", padding: "13px 15px", borderRadius: "var(--rs)", border: "1.5px solid var(--border2)", background: "var(--surface)", fontSize: 15, outline: "none", transition: "border-color .2s", color: "var(--text)", fontFamily: "var(--fb)" }}
                onFocus={e => (e.target.style.borderColor = "var(--text)")}
                onBlur={e => (e.target.style.borderColor = "var(--border2)")}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 9 }}>Dietary needs</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DIETARY_OPTS.map(d => (
                  <Chip key={d} active={(form.dietary || []).includes(d)} onClick={() => toggleArr("dietary", d)}>{d}</Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Cuisine + budget */}
        {step === 2 && (
          <div style={{ animation: "fu .4s var(--sp) both" }}>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 28, letterSpacing: "-.02em", marginBottom: 6, color: "var(--text)" }}>What are you feeling?</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.6 }}>Pick cuisines and your budget zone.</p>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 10 }}>Cuisine preferences</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CUISINE_OPTS.map(c => (
                  <Chip key={c} active={(form.cuisine || []).includes(c)} onClick={() => toggleArr("cuisine", c)}>{c}</Chip>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 10 }}>Budget range</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {BUDGET_OPTS.map(b => (
                  <button key={b.val} onClick={() => set("budget")(b.val)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: "var(--rs)", border: `1.5px solid ${form.budget === b.val ? "var(--text)" : "var(--border2)"}`, background: form.budget === b.val ? "var(--text)" : "var(--surface)", cursor: "pointer", fontFamily: "var(--fb)", transition: "all .22s var(--sp)" }}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: form.budget === b.val ? "white" : "var(--text)" }}>{b.label}</div>
                      <div style={{ fontSize: 11, color: form.budget === b.val ? "rgba(255,255,255,.55)" : "var(--muted)" }}>{b.sub}</div>
                    </div>
                    <span style={{ fontFamily: "var(--fd)", fontSize: 20, color: form.budget === b.val ? "white" : "var(--muted)" }}>{b.val}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Vibe */}
        {step === 3 && (
          <div style={{ animation: "fu .4s var(--sp) both" }}>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 28, letterSpacing: "-.02em", marginBottom: 6, color: "var(--text)" }}>What's your vibe?</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18, lineHeight: 1.6 }}>
              Describe in your own words — the AI uses this to match group energy.
            </p>
            <textarea
              value={form.vibe || ""} onChange={e => set("vibe")(e.target.value)}
              placeholder={"e.g. \"Chill spot, good natural wine, not too loud\"\n\nor \"Impressing someone, upscale but not stuffy\""}
              style={{ width: "100%", minHeight: 130, padding: "13px 15px", borderRadius: "var(--rs)", border: "1.5px solid var(--border2)", background: "var(--surface)", fontSize: 14, outline: "none", resize: "none", lineHeight: 1.65, transition: "border-color .2s", color: "var(--text)", fontFamily: "var(--fb)" }}
              onFocus={e => (e.target.style.borderColor = "var(--text)")}
              onBlur={e => (e.target.style.borderColor = "var(--border2)")}
            />
            <div style={{ marginTop: 14, padding: "12px 14px", background: "oklch(92% .06 228)", borderRadius: "var(--rs)" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "oklch(38% .14 228)", marginBottom: 2 }}>Powered by Gemini NLP</div>
              <div style={{ fontSize: 11, color: "oklch(48% .1 228)", lineHeight: 1.55 }}>Your vibe is parsed into formal preference signals fed into the TOPSIS engine.</div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer nav */}
      <div style={{ background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: "1px solid var(--border2)", padding: "12px 22px", position: "sticky", bottom: 0, display: "flex", gap: 10 }}>
        {step > 0 && (
          <button onClick={back} style={{ flex: "0 0 auto", padding: "13px 20px", borderRadius: "var(--rs)", border: "1px solid var(--border2)", background: "var(--bg)", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)", color: "var(--muted)" }}>
            Back
          </button>
        )}
        <button
          onClick={next}
          disabled={nextDisabled}
          style={{ flex: 1, padding: 14, borderRadius: "var(--rs)", border: "none", background: nextDisabled ? "var(--border2)" : "var(--text)", color: nextDisabled ? "var(--muted)" : "white", fontSize: 14, fontWeight: 500, cursor: nextDisabled ? "default" : "pointer", fontFamily: "var(--fb)", transition: "all .2s var(--sp)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {submitting ? (
            <>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.4)", borderTopColor: "white", animation: "sp2 .7s linear infinite" }} />
              Submitting…
            </>
          ) : step === STEPS.length - 1 ? "Submit RSVP →" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
