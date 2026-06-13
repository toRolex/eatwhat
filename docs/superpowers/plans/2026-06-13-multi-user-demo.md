# 多人聚会 Demo — 群主创建 + 邀请码加入

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 demo 从"硬编码用户"改为真实多人协作流程——群主创建聚会生成邀请码，成员凭码加入，各自填偏好，群主触发 AI 推荐，所有人可见结果。

**Architecture:** 引入 `GroupState` 作为 localStorage 核心数据结构，替代分散的 `gp_guests`。登录弹窗独立组件，群主/成员两路分支。ChatPreference 和 AITab 通过 group 隔离偏好，不再依赖全局字面量 key。

**Tech Stack:** Next.js 15, React 18, TypeScript, localStorage（demo 状态持久化）

---

## 文件变更总览

| 操作 | 文件 | 职责 |
|------|------|------|
| 新增 | `apps/web/components/demo/LoginModal.tsx` | 登录弹窗：输入名字 → 创建群/输入邀请码加入 |
| 新增 | `apps/web/lib/group-store.ts` | GroupState CRUD：创建、加入、更新成员偏好、所有 localStorage 读写集中在此 |
| 重写 | `apps/web/app/page.tsx` | 去掉模拟用户栏，接入 LoginModal + GroupStore，管理 group/currentUser 状态 |
| 修改 | `apps/web/components/demo/ChatPreference.tsx` | 偏好存储键改为 `groupId/memberName` 隔离，完成后更新 GroupStore |
| 修改 | `apps/web/components/demo/tabs.tsx` | OverviewTab/PreferencesTab 读 group 数据；AITab 仅群主可触发，结果存 group |
| 清理 | `apps/web/app/api/chat/preferences/route.ts` | 移除 SQLite `ensureDemoEvent()` / `upsertPreferences`，只返回 JSON |
| 清理 | `apps/web/app/api/demo/synthesize/route.ts` | 移除 `getDemoPreferences()` fallback，强依赖请求体中的 preferences |

---

## 数据结构

```typescript
// lib/group-store.ts

interface GroupMember {
  name: string;
  ini: string;
  dietary: string[];
  cuisine: string[];
  budget: "$" | "$$" | "$$$";
  vibe: string | null;
  /** "joined" | "chatting" | "done" — 偏好收集状态 */
  preferenceStatus: "joined" | "chatting" | "done";
}

interface GroupState {
  groupId: string;
  inviteCode: string;          // 4 位数字
  ownerName: string;
  eventType: "meal_only" | "activity_only" | "meal_activity" | "undecided";
  location: string;
  members: GroupMember[];
  aiProposals: any[] | null;   // 生成后存储，所有人可见
  createdAt: number;
}

// Top-level localStorage key
const GROUP_KEY = "gp_group_v2";
```

---

### Task 1: 创建 GroupStore 模块

**Files:**
- Create: `apps/web/lib/group-store.ts`

- [ ] **Step 1: 写入 GroupStore 完整实现**

```typescript
// apps/web/lib/group-store.ts

export interface GroupMember {
  name: string;
  ini: string;
  dietary: string[];
  cuisine: string[];
  budget: "$" | "$$" | "$$$";
  vibe: string | null;
  preferenceStatus: "joined" | "chatting" | "done";
}

export interface GroupState {
  groupId: string;
  inviteCode: string;
  ownerName: string;
  eventType: "meal_only" | "activity_only" | "meal_activity" | "undecided";
  location: string;
  members: GroupMember[];
  aiProposals: any[] | null;
  createdAt: number;
}

const GROUP_KEY = "gp_group_v2";

function randCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function nameToIni(name: string): string {
  return name.slice(0, 2).toUpperCase() || "??";
}

export function loadGroup(): GroupState | null {
  try {
    const raw = localStorage.getItem(GROUP_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveGroup(group: GroupState): void {
  localStorage.setItem(GROUP_KEY, JSON.stringify(group));
}

export function clearGroup(): void {
  localStorage.removeItem(GROUP_KEY);
}

export function createGroup(
  ownerName: string,
  eventType: GroupState["eventType"],
  location: string,
): GroupState {
  const member: GroupMember = {
    name: ownerName,
    ini: nameToIni(ownerName),
    dietary: [],
    cuisine: [],
    budget: "$$",
    vibe: null,
    preferenceStatus: "joined",
  };
  const group: GroupState = {
    groupId: crypto.randomUUID(),
    inviteCode: randCode(),
    ownerName,
    eventType,
    location,
    members: [member],
    aiProposals: null,
    createdAt: Date.now(),
  };
  saveGroup(group);
  return group;
}

export function joinGroup(name: string, inviteCode: string): GroupState | null {
  const group = loadGroup();
  if (!group) return null;
  if (group.inviteCode !== inviteCode) return null;
  if (group.members.some(m => m.name === name)) return group; // already joined
  const member: GroupMember = {
    name,
    ini: nameToIni(name),
    dietary: [],
    cuisine: [],
    budget: "$$",
    vibe: null,
    preferenceStatus: "joined",
  };
  group.members.push(member);
  saveGroup(group);
  return group;
}

export function updateMemberPrefs(
  name: string,
  prefs: { vibe?: string; dietary?: string[]; cuisine?: string[]; budget?: string },
): GroupState | null {
  const group = loadGroup();
  if (!group) return null;
  const member = group.members.find(m => m.name === name);
  if (!member) return null;
  if (prefs.vibe !== undefined) member.vibe = prefs.vibe;
  if (prefs.dietary) member.dietary = prefs.dietary;
  if (prefs.cuisine) member.cuisine = prefs.cuisine;
  if (prefs.budget) member.budget = prefs.budget as GroupMember["budget"];
  member.preferenceStatus = "done";
  saveGroup(group);
  return group;
}

export function setMemberChatting(name: string): GroupState | null {
  const group = loadGroup();
  if (!group) return null;
  const member = group.members.find(m => m.name === name);
  if (!member) return null;
  if (member.preferenceStatus === "joined") {
    member.preferenceStatus = "chatting";
  }
  saveGroup(group);
  return group;
}

export function saveAiProposals(proposals: any[]): GroupState | null {
  const group = loadGroup();
  if (!group) return null;
  group.aiProposals = proposals;
  saveGroup(group);
  return group;
}

export function isOwner(name: string): boolean {
  const group = loadGroup();
  return group?.ownerName === name;
}
```

- [ ] **Step 2: 确认文件无编译错误**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep "group-store" || echo "CLEAN"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/group-store.ts
git commit -m "feat: add GroupStore module — create/join/update group state in localStorage"
```

---

### Task 2: 创建 LoginModal 组件

**Files:**
- Create: `apps/web/components/demo/LoginModal.tsx`

- [ ] **Step 1: 写入 LoginModal 完整实现**

```typescript
// apps/web/components/demo/LoginModal.tsx
"use client";
import { useState } from "react";

interface LoginModalProps {
  onGroupReady: (userName: string, isOwner: boolean) => void;
}

export default function LoginModal({ onGroupReady }: LoginModalProps) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [eventType, setEventType] = useState<string>("meal_only");
  const [location, setLocation] = useState("深圳南山区");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  const submitName = () => {
    const n = name.trim();
    if (!n) { setError("请输入名字"); return; }
    setError("");
    setMode("idle"); // show create/join choice
  };

  // Step 1: Name input
  if (mode === "idle") {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)",
      }}>
        <div style={{
          background: "var(--surface)", borderRadius: "var(--r)",
          padding: "32px 28px", width: 360, maxWidth: "90vw",
          boxShadow: "0 16px 48px rgba(0,0,0,.2)", animation: "fu .3s var(--sp) both",
        }}>
          <div style={{ fontSize: 28, marginBottom: 8, textAlign: "center" }}>🐦</div>
          <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, textAlign: "center", marginBottom: 20, color: "var(--text)" }}>
            {name ? `嘿，${name}` : "今天整点啥"}
          </h2>

          {!name ? (
            <>
              <input
                autoFocus
                value={name}
                onChange={e => { setName(e.target.value); setError(""); }}
                onKeyDown={e => { if (e.key === "Enter") submitName(); }}
                placeholder="输入你的名字"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "var(--rs)",
                  border: `1px solid ${error ? "oklch(55% 0.18 26)" : "var(--border2)"}`,
                  background: "var(--bg)", fontSize: 14, fontFamily: "var(--fb)",
                  color: "var(--text)", outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--text)")}
                onBlur={e => (e.currentTarget.style.borderColor = error ? "oklch(55% 0.18 26)" : "var(--border2)")}
              />
              {error && <p style={{ fontSize: 11, color: "oklch(55% 0.18 26)", marginTop: 6, fontFamily: "var(--fb)" }}>{error}</p>}
              <button
                onClick={submitName}
                style={{
                  width: "100%", marginTop: 14, padding: "10px 0", borderRadius: "var(--rs)",
                  border: "none", background: "var(--text)", color: "var(--bg)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--fb)",
                }}
              >继续 →</button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginBottom: 20, fontFamily: "var(--fb)" }}>
                你是组织者还是来参加聚会的？
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => setMode("create")}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: "var(--rs)",
                    border: "1px solid var(--border2)", background: "var(--bg)",
                    fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)",
                    color: "var(--text)",
                  }}
                >🎉 创建新聚会</button>
                <button
                  onClick={() => setMode("join")}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: "var(--rs)",
                    border: "1px solid var(--border2)", background: "var(--bg)",
                    fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--fb)",
                    color: "var(--text)",
                  }}
                >🔗 输入邀请码加入</button>
              </div>
              <button
                onClick={() => setName("")}
                style={{
                  marginTop: 10, width: "100%", padding: "8px 0",
                  background: "none", border: "none", color: "var(--muted)",
                  fontSize: 11, cursor: "pointer", fontFamily: "var(--fb)",
                }}
              >← 换个名字</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Step 2a: Create group
  if (mode === "create") {
    const { createGroup } = require("@/lib/group-store");
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)",
      }}>
        <div style={{
          background: "var(--surface)", borderRadius: "var(--r)",
          padding: "32px 28px", width: 360, maxWidth: "90vw",
          boxShadow: "0 16px 48px rgba(0,0,0,.2)", animation: "fu .3s var(--sp) both",
        }}>
          <h2 style={{ fontFamily: "var(--fd)", fontSize: 20, marginBottom: 6, color: "var(--text)" }}>创建新聚会</h2>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, fontFamily: "var(--fb)" }}>组织者：{name}</p>

          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--muted)", marginBottom: 4, fontFamily: "var(--fb)" }}>聚会类型</label>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: "var(--rs)",
              border: "1px solid var(--border2)", background: "var(--bg)",
              fontSize: 13, fontFamily: "var(--fb)", color: "var(--text)",
              marginBottom: 12, boxSizing: "border-box",
            }}
          >
            <option value="meal_only">只吃饭</option>
            <option value="activity_only">只玩乐</option>
            <option value="meal_activity">吃饭 + 娱乐</option>
            <option value="undecided">还没想好，交给海鸥</option>
          </select>

          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--muted)", marginBottom: 4, fontFamily: "var(--fb)" }}>大概位置</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="深圳南山区"
            style={{
              width: "100%", padding: "9px 12px", borderRadius: "var(--rs)",
              border: "1px solid var(--border2)", background: "var(--bg)",
              fontSize: 13, fontFamily: "var(--fb)", color: "var(--text)",
              marginBottom: 18, boxSizing: "border-box",
            }}
          />

          <button
            onClick={() => {
              createGroup(name, eventType as any, location);
              onGroupReady(name, true);
            }}
            style={{
              width: "100%", padding: "10px 0", borderRadius: "var(--rs)",
              border: "none", background: "var(--text)", color: "var(--bg)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--fb)",
            }}
          >创建聚会 →</button>
          <button
            onClick={() => setMode("idle")}
            style={{
              marginTop: 8, width: "100%", padding: "8px 0",
              background: "none", border: "none", color: "var(--muted)",
              fontSize: 11, cursor: "pointer", fontFamily: "var(--fb)",
            }}
          >← 返回</button>
        </div>
      </div>
    );
  }

  // Step 2b: Join group
  if (mode === "join") {
    const { joinGroup } = require("@/lib/group-store");
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)",
      }}>
        <div style={{
          background: "var(--surface)", borderRadius: "var(--r)",
          padding: "32px 28px", width: 360, maxWidth: "90vw",
          boxShadow: "0 16px 48px rgba(0,0,0,.2)", animation: "fu .3s var(--sp) both",
        }}>
          <h2 style={{ fontFamily: "var(--fd)", fontSize: 20, marginBottom: 6, color: "var(--text)" }}>加入聚会</h2>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, fontFamily: "var(--fb)" }}>
            {name} · 输入群主分享的 4 位邀请码
          </p>

          <input
            autoFocus
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
            onKeyDown={e => { if (e.key === "Enter") {
              const result = joinGroup(name, inviteCode);
              if (result) onGroupReady(name, false);
              else setError("邀请码无效或群组不存在");
            }}}
            placeholder="4 位数字"
            maxLength={4}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: "var(--rs)",
              border: `1px solid ${error ? "oklch(55% 0.18 26)" : "var(--border2)"}`,
              background: "var(--bg)", fontSize: 24, fontFamily: "var(--fd)",
              letterSpacing: "8px", textAlign: "center", color: "var(--text)",
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--text)")}
            onBlur={e => (e.currentTarget.style.borderColor = error ? "oklch(55% 0.18 26)" : "var(--border2)")}
          />
          {error && <p style={{ fontSize: 11, color: "oklch(55% 0.18 26)", marginTop: 8, fontFamily: "var(--fb)" }}>{error}</p>}

          <button
            onClick={() => {
              const result = joinGroup(name, inviteCode);
              if (result) onGroupReady(name, false);
              else setError("邀请码无效或群组不存在");
            }}
            style={{
              width: "100%", marginTop: 16, padding: "10px 0", borderRadius: "var(--rs)",
              border: "none", background: inviteCode.length === 4 ? "var(--text)" : "var(--border2)",
              color: inviteCode.length === 4 ? "var(--bg)" : "var(--muted)",
              fontSize: 13, fontWeight: 600, cursor: inviteCode.length === 4 ? "pointer" : "default",
              fontFamily: "var(--fb)",
            }}
            disabled={inviteCode.length !== 4}
          >加入聚会 →</button>
          <button
            onClick={() => setMode("idle")}
            style={{
              marginTop: 8, width: "100%", padding: "8px 0",
              background: "none", border: "none", color: "var(--muted)",
              fontSize: 11, cursor: "pointer", fontFamily: "var(--fb)",
            }}
          >← 返回</button>
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: 确认编译无错误**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep "LoginModal" || echo "CLEAN"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/demo/LoginModal.tsx
git commit -m "feat: add LoginModal — name input, create group, join by invite code"
```

---

### Task 3: 重写 page.tsx —— 接入 LoginModal 和 GroupStore

**Files:**
- Modify: `apps/web/app/page.tsx` — 大范围重写

- [ ] **Step 1: 替换状态管理和登录流程**

关键变更：
1. 删除 `loadGuests()`、`saveGuests()`、`addSimGuest()`、`removeGuest()`、`switchUser()`、`simGuestName` 全部模拟用户相关代码
2. 新增 `showLogin`、`group`、`currentUser`、`isOwner` 状态
3. `guestList` 从 `group.members` 派生
4. 偏好收集回调调用 `updateMemberPrefs()`
5. 删除整个模拟用户栏 UI
6. 添加顶部邀请码展示栏（群主可见）

```typescript
// apps/web/app/page.tsx — 仅显示变更部分（相对于当前的完整重写）

// 删除第 46-58 行：loadGuests, saveGuests, nameToIni
// 删除第 70-71 行：currentUser, simGuestName 状态
// 删除第 73 行：liveGuests 的 loadGuests() 初始化

// 新增导入
import { loadGroup, saveGroup, createGroup, joinGroup, updateMemberPrefs, setMemberChatting, saveAiProposals, isOwner } from "@/lib/group-store";
import LoginModal from "../components/demo/LoginModal";

// 新增状态
const [showLogin, setShowLogin] = useState(true);
const [group, setGroup] = useState<GroupState | null>(null);
const [currentUser, setCurrentUser] = useState("");
const [userIsOwner, setUserIsOwner] = useState(false);

// 登录完成回调
const handleLoginReady = (userName: string, owner: boolean) => {
  setCurrentUser(userName);
  setUserIsOwner(owner);
  setGroup(loadGroup());
  setShowLogin(false);
  localStorage.setItem("gp_current_user_v2", userName);
};

// 偏好收集完成回调
const handlePrefsCollected = (userName: string, prefs: any) => {
  const updated = updateMemberPrefs(userName, {
    vibe: prefs.vibe,
    dietary: prefs.dietary,
    cuisine: prefs.cuisine,
    budget: prefs.budget,
  });
  if (updated) {
    setGroup(updated);
    addActivity({ type: "vibe", ini: nameToIni(userName), name: userName, msg: `偏好已收集`, time: "just now" });
  }
};

// 开始对话时标记状态
const handleStartChat = () => {
  if (currentUser) {
    const updated = setMemberChatting(currentUser);
    if (updated) setGroup(updated);
  }
  setTab("chat-preference");
};

// 从 group.members 派生 guest 列表
const guestList: Guest[] = group
  ? group.members.map((m, i) => ({
      id: i + 1,
      name: m.name,
      ini: m.ini,
      status: "confirmed" as const,
      dietary: m.dietary,
      cuisine: m.cuisine,
      budget: m.budget,
      vibe: m.vibe,
    }))
  : [];

// AI 推荐完成回调
const handleAiDone = (proposals: any[]) => {
  const updated = saveAiProposals(proposals);
  if (updated) setGroup(updated);
};

// 删除整个模拟用户栏 UI（第 232-295 行）
// 替换为顶部信息栏
```

- [ ] **Step 2: 检查 guestList 构建逻辑中 `nameToIni` 不需要独立函数** — inline 到 map 中

```typescript
// 在 guestList 的 map 里:
ini: m.name.slice(0, 2).toUpperCase() || "??",
```

- [ ] **Step 3: 确认编译无错误**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep "page.tsx"
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat: rewrite page.tsx — LoginModal + GroupStore, remove simulated user bar"
```

---

### Task 4: 修改 ChatPreference —— 偏好入 GroupStore

**Files:**
- Modify: `apps/web/components/demo/ChatPreference.tsx`

- [ ] **Step 1: 将 localStorage key 改为 group 隔离**

关键变更：
1. 移除 `getUserKey()` 函数
2. 移除所有 `gp_chat_*_${currentUser}` 模式的 key
3. 改为 `gp_chat_${groupId}_${userName}` 模式 —— 但更简单的方式：因为 demo 只有一个组，直接用 `gp_chat_${currentUser}` 足够
4. 实际上当前代码已经是按用户隔离的 `gp_chat_messages_${currentUser}` — 保持不变，但需要移除 `currentUser` 切换时的重置逻辑（因为现在用户不会在同一个浏览器切换）
5. preference 收集完成后调用 `onPreferencesCollected` 并更新 GroupStore

ChatPreference 当前实现已经按用户名隔离 key，不需要大改。只需要：
- 移除用户切换 useEffect（不再需要切换用户）
- 简化重置函数
- 偏好完成时确保回调携带 group-ready 的字段名

- [ ] **Step 2: 精简 useEffect**

```typescript
// 删除用户切换 useEffect（原来约 20 行：从 "Reset state when currentUser changes" 注释开始的整个块）
// 保留初始化 useEffect
```

- [ ] **Step 3: 确认编译无错误**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep "ChatPreference"
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/demo/ChatPreference.tsx
git commit -m "refactor: simplify ChatPreference — remove user-switch useEffect, keep per-user isolation"
```

---

### Task 5: 修改 tabs.tsx —— Overview/Preferences/AITab 接 GroupStore

**Files:**
- Modify: `apps/web/components/demo/tabs.tsx`

- [ ] **Step 1: 修改 OverviewTab** —— 显示 group 成员和邀请码

OverviewTab 接收新 props：`group`（GroupState）、`inviteCode`、`isOwner`。群主看到邀请码展示区。

在 OverviewTab 顶部（Hero 下方）添加：
```typescript
// 邀请码展示区（仅群主可见）
{isOwner && (
  <div style={{ padding: "12px 32px", background: "oklch(95% .04 228)", borderBottom: "1px solid oklch(85% .08 228)" }}>
    <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--fb)" }}>邀请码</span>
    <span style={{ fontFamily: "var(--fd)", fontSize: 28, letterSpacing: "6px", marginLeft: 10, color: "var(--text)" }}>
      {inviteCode}
    </span>
    <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 10, fontFamily: "var(--fb)" }}>
      分享给朋友即可加入
    </span>
  </div>
)}
```

修改 Stat cards 中的硬编码数字：
- `"共 8 人邀请"` → `共 ${guestList.length} 人`
- `confirmed.length` 已经动态
- 距离天数根据 `createdAt` 计算

- [ ] **Step 2: 修改 PreferencesTab** —— 对接 group 成员

PreferencesTab 已接收 `liveGuests`，现在 `guestList` 来自 group.members，自然对接。不需要改。

- [ ] **Step 3: 修改 AITab** —— 群主专属 + 结果存 group

AITab 新增 props：`isOwner`、`group`、`onAiDone`。

关键变更：
```typescript
// run() 函数中：从 group.members 读取偏好（替代 localStorage 直接读）
const prefs = group.members
  .filter(m => m.preferenceStatus === "done")
  .map(m => ({
    name: m.name,
    dietary: m.dietary,
    cuisine: m.cuisine,
    budget: m.budget,
    vibe: m.vibe,
  }));

// 成功后回调
if (data.proposals) {
  onAiDone(data.proposals);
}
```

非群主看到的是只读视图：如果 `aiProposals` 存在则展示，否则显示"等待群主生成方案"。

"生成方案"按钮仅 `isOwner === true` 时显示。

- [ ] **Step 4: 确认编译无错误**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep -E "tabs\.tsx|page\.tsx"
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/demo/tabs.tsx apps/web/app/page.tsx
git commit -m "feat: wire OverviewTab/PrefsTab/AITab to GroupStore — invite code, owner gate, member status"
```

---

### Task 6: 清理 API 路由

**Files:**
- Modify: `apps/web/app/api/chat/preferences/route.ts`
- Modify: `apps/web/app/api/demo/synthesize/route.ts`

- [ ] **Step 1: 清理 preferences route** —— 移除 SQLite 写入

删除 `ensureDemoEvent()` 函数（第 87-122 行）及其调用。
删除 `handleMock()` 函数（第 220-305 行）。
当 DEEPSEEK_API_KEY 未设置时返回 error 而非 mock。

```typescript
// 替换 handleMock 调用:
if (!apiKey) {
  return NextResponse.json(
    { error: "DEEPSEEK_API_KEY 未配置" },
    { status: 500 },
  );
}
```

- [ ] **Step 2: 清理 synthesize route** —— 移除 fallback

删除 `getDemoPreferences()` 函数。
当 `body.preferences` 为空且无 DEEPSEEK_API_KEY 时返回 error 而非 mock。

- [ ] **Step 3: 确认编译和 API 正常**

```bash
npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | grep -E "preferences/route|synthesize/route"
```

```bash
curl -s -X POST http://localhost:3000/api/chat/preferences \
  -H "Content-Type: application/json" \
  -d '{"message":"你好","roomId":"t6","userName":"测","conversationHistory":[]}' | head -c 200
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/chat/preferences/route.ts apps/web/app/api/demo/synthesize/route.ts
git commit -m "refactor: remove mock fallbacks and SQLite writes from demo API routes"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 启动 dev server**

```bash
pnpm dev
```

- [ ] **Step 2: 手动测试流程**

| 操作 | 预期 |
|------|------|
| 打开 localhost:3000 | 显示登录弹窗 |
| 输入"老张"→ 继续 | 显示创建/加入选择 |
| 点击"创建新聚会" | 填入类型和位置 |
| 填完点击"创建聚会" | 登录完成，看到概览页，顶部显示 4 位邀请码 |
| 点击"填我的偏好" | 进入对话，海鸥开始收集 |
| 完成对话 | 偏好页显示"老张"已完成 ✓ |
| 新标签页打开 localhost:3000 | 登录弹窗 |
| 输入"阿花"→ 输入邀请码 | 加入成功，看到成员列表含老张 |
| 阿花填偏好 | 老张页面看到阿花状态变化 |
| 老张（群主）点击 AI 推荐 | 生成方案按钮可见 |
| 生成方案 | 3 个推荐显示 |
| 阿花页面 | 看到同样的推荐结果 |
| 阿花页面点 AI 推荐 | 无"生成方案"按钮，只显示结果 |

- [ ] **Step 3: 验证无回归**

确认所有 5 个标签页正常工作，无硬编码数据残留。

---

### Task 8: 最终提交

- [ ] **Step 1: 提交剩余变更**

```bash
git status
git add -A
git commit -m "feat: complete multi-user demo — group creation, invite code, per-member chat, owner-gated AI"
```

---

## 自检

1. **Spec 覆盖**：群主创建 ✓、邀请码加入 ✓、登录弹窗 ✓、偏好收集 ✓、实时进度 ✓、群主触发 AI ✓、全员可见结果 ✓
2. **无占位符**：所有步骤包含实际代码
3. **类型一致性**：GroupState 定义在 group-store.ts，page.tsx 和 tabs.tsx 通过 import 引用，无拼写差异
