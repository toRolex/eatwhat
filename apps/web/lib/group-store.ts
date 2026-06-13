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

const STORAGE_KEY = "gp_group_v2";

function nameToIni(name: string): string {
  return name.slice(0, 2).toUpperCase() || "??";
}

export function loadGroup(): GroupState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GroupState;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGroup(group: GroupState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(group));
}

export function clearGroup(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function createGroup(
  ownerName: string,
  eventType: GroupState["eventType"],
  location: string
): GroupState {
  const owner: GroupMember = {
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
    inviteCode: String(Math.floor(1000 + Math.random() * 9000)),
    ownerName,
    eventType,
    location,
    members: [owner],
    aiProposals: null,
    createdAt: Date.now(),
  };

  saveGroup(group);
  return group;
}

export function joinGroup(
  name: string,
  inviteCode: string
): GroupState | null {
  const group = loadGroup();
  if (!group) return null;
  if (group.inviteCode !== inviteCode) return null;

  const existing = group.members.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return null;

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
  prefs: { vibe?: string; dietary?: string[]; cuisine?: string[]; budget?: "$" | "$$" | "$$$" }
): GroupState | null {
  const group = loadGroup();
  if (!group) return null;

  const member = group.members.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
  if (!member) return null;

  if (prefs.vibe !== undefined) member.vibe = prefs.vibe;
  if (prefs.dietary !== undefined) member.dietary = prefs.dietary;
  if (prefs.cuisine !== undefined) member.cuisine = prefs.cuisine;
  if (prefs.budget !== undefined) member.budget = prefs.budget;
  member.preferenceStatus = "done";

  saveGroup(group);
  return group;
}

export function setMemberChatting(name: string): GroupState | null {
  const group = loadGroup();
  if (!group) return null;

  const member = group.members.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
  if (!member) return null;
  if (member.preferenceStatus !== "joined") return null;

  member.preferenceStatus = "chatting";
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
  if (!group) return false;
  return group.ownerName.toLowerCase() === name.toLowerCase();
}
