"use client";
import { useState, useEffect, useRef } from "react";
import { SectionLabel } from "./ui";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

export default function ChatPreference() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("gp_chat_messages");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        role: "assistant",
        content: "嘿！我是你的聚会参谋 🐦 今天整点啥？先告诉我，这次聚会你想要啥感觉？给个词就成，比如「热闹」「安静」「随便」",
      },
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("gp_chat_complete") === "true";
    return false;
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const roomId = useRef(
    typeof window !== "undefined"
      ? localStorage.getItem("gp_chat_room") || crypto.randomUUID()
      : "server"
  );

  useEffect(() => {
    localStorage.setItem("gp_chat_room", roomId.current);
  }, []);

  useEffect(() => {
    localStorage.setItem("gp_chat_messages", JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("gp_chat_complete", String(complete));
  }, [complete]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading || complete) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          roomId: roomId.current,
          conversationHistory: messages,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "请求失败");
      }

      const data = await res.json();
      const aiMsg: ChatMessage = { role: "assistant", content: data.reply };
      setMessages(prev => [...prev, aiMsg]);

      if (data.complete) {
        setComplete(true);
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        role: "assistant",
        content: "哎呀，海鸥翅膀卡住了…等一下再试试？🐦",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([
      {
        role: "assistant",
        content: "嘿！我是你的聚会参谋 🐦 今天整点啥？先告诉我，这次聚会你想要啥感觉？给个词就成，比如「热闹」「安静」「随便」",
      },
    ]);
    setComplete(false);
    localStorage.removeItem("gp_chat_messages");
    localStorage.removeItem("gp_chat_complete");
    roomId.current = crypto.randomUUID();
    localStorage.setItem("gp_chat_room", roomId.current);
  };

  return (
    <div>
      <div style={{ padding: "40px 32px 24px", borderBottom: "1px solid var(--border2)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 32, top: 20, opacity: .05, pointerEvents: "none" }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <ellipse cx="60" cy="55" rx="30" ry="20" stroke="var(--text)" strokeWidth="1" />
            <path d="M30 70 Q60 90 90 70" stroke="var(--text)" strokeWidth="1" fill="none" />
            <circle cx="50" cy="52" r="2" fill="var(--text)" />
            <circle cx="70" cy="52" r="2" fill="var(--text)" />
            <path d="M55 60 Q60 64 65 60" stroke="var(--text)" strokeWidth="1" fill="none" />
            <path d="M15 45 L-5 30 M105 45 L125 30" stroke="var(--text)" strokeWidth="1" />
          </svg>
        </div>
        <SectionLabel style={{ marginBottom: 10 }}>AI 对话</SectionLabel>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 48, lineHeight: .98, letterSpacing: "-.04em", color: "var(--text)", textWrap: "balance" as React.CSSProperties["textWrap"] }}>
          海鸥参谋<br /><em>帮你定偏好</em>
        </h2>
      </div>

      {complete && (
        <div style={{ padding: "12px 32px 0", maxWidth: 640 }}>
          <div style={{ padding: "12px 16px", borderRadius: "var(--r)", background: "oklch(95% .04 148)", border: "1px solid oklch(85% .08 148)", color: "oklch(34% .13 148)", fontSize: 12, fontWeight: 500, fontFamily: "var(--fb)", display: "flex", alignItems: "center", gap: 8, animation: "si .3s var(--sp) both" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            偏好已收集完成！海鸥已把信息存好，去 AI 推荐标签生成方案吧。
          </div>
          <button
            onClick={reset}
            style={{ marginTop: 8, fontSize: 10, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--fb)" }}
          >
            重新对话
          </button>
        </div>
      )}

      <div style={{ padding: "24px 32px 0", maxWidth: 640 }}>
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "var(--r)",
            border: "1px solid var(--border2)",
            boxShadow: "var(--sh)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: 420,
          }}
        >
          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  maxWidth: "88%",
                  animation: `fu .35s var(--sp) both`,
                }}
              >
                {/* Avatar */}
                {msg.role === "assistant" ? (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "oklch(93% .04 228)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                    }}
                  >
                    🐦
                  </div>
                ) : (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--text)",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--bg)",
                    }}
                  >
                    我
                  </div>
                )}

                {/* Bubble */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "var(--text)" : "var(--bg)",
                    color: msg.role === "user" ? "var(--bg)" : "var(--text)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: "var(--fb)",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignSelf: "flex-start",
                  animation: `fu .3s var(--sp) both`,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "oklch(93% .04 228)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  🐦
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "14px 14px 14px 4px",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    fontFamily: "var(--fb)",
                  }}
                >
                  海鸥正在思考<TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          {!complete && (
            <div
              style={{
                borderTop: "1px solid var(--border2)",
                padding: "12px 14px",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="输入你的回答…"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: "var(--rs)",
                  border: "1px solid var(--border2)",
                  background: "var(--bg)",
                  fontSize: 13,
                  fontFamily: "var(--fb)",
                  color: "var(--text)",
                  outline: "none",
                  transition: "border-color .2s",
                  boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--border)")}
                onBlur={e => (e.target.style.borderColor = "var(--border2)")}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--rs)",
                  border: "none",
                  background: input.trim() && !loading ? "var(--text)" : "var(--border2)",
                  color: "var(--bg)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  fontFamily: "var(--fb)",
                  transition: "all .2s",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  if (input.trim() && !loading) e.currentTarget.style.opacity = "0.85";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                发送
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "var(--text)", marginTop: 48, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--border2) 1px,transparent 1px),linear-gradient(90deg,var(--border2) 1px,transparent 1px)", backgroundSize: "40px 40px", opacity: .06, pointerEvents: "none" }} />
        <div style={{ position: "relative", padding: "52px 32px 32px", maxWidth: 820 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="5" r="3" fill="rgba(255,255,255,.9)" /><circle cx="9" cy="9" r="3" fill="rgba(255,255,255,.4)" /></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.02em", color: "white" }}>今天整点啥</span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,.08)", marginBottom: 20 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>AI 对话偏好收集</div>
            <div style={{ display: "flex", gap: 16 }}>
              {["隐私", "条款", "GitHub", "文档"].map(l => (
                <span key={l} style={{ fontSize: 11, color: "rgba(255,255,255,.35)", cursor: "pointer" }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
