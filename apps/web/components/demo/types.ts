export interface Guest {
  id: number;
  name: string;
  ini: string;
  status: "confirmed" | "pending" | "declined";
  dietary: string[];
  cuisine: string[];
  budget: "$" | "$$" | "$$$";
  vibe: string | null;
}

export interface Activity {
  id: number;
  type: "rsvp" | "vibe" | "system" | "ai" | "vote";
  ini: string;
  name: string;
  msg: string;
  time: string;
  read: boolean;
}

export interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  price: string;
  dist: string;
  rating: number;
  match: number;
  tags: string[];
  addr: string;
  hours: string;
  reasoning: string;
  accent: string;
}

export interface Tweaks {
  accentColor: "coral" | "sage" | "sky" | "amber";
  showAIReasoning: boolean;
  darkMode: boolean;
  animations: boolean;
}

export const TWEAKS_DEFAULTS: Tweaks = {
  accentColor: "sky",
  showAIReasoning: true,
  darkMode: false,
  animations: true,
};

// Demo-only fixtures. Used by the unauthenticated marketing demo at "/" so
// visitors see a fully populated UI without a Supabase session. Authenticated
// host routes pull real data from Supabase and never touch these.
export const GUESTS_DATA: Guest[] = [
  { id:1, name:"小明",   ini:"XM", status:"confirmed", dietary:["不吃辣"],         cuisine:["火锅","日料"],        budget:"$$",  vibe:"就想大吃一顿，别太安静就行" },
  { id:2, name:"阿花",   ini:"AH", status:"confirmed", dietary:["素食"],           cuisine:["粤菜","东南亚"],        budget:"$",   vibe:"清爽健康，不想吃完有负担" },
  { id:3, name:"老张",   ini:"LZ", status:"confirmed", dietary:[],                  cuisine:["烧烤","川菜"],          budget:"$$$", vibe:"今晚我请客，档次不能低" },
  { id:4, name:"小林",   ini:"XL", status:"confirmed", dietary:["海鲜过敏"],       cuisine:["日料","粤菜"],          budget:"$$",  vibe:"安静一点，能好好聊天" },
  { id:5, name:"大刘",   ini:"DL", status:"confirmed", dietary:[],                  cuisine:["火锅","烧烤"],          budget:"$$",  vibe:"热闹！人多就是要嗨" },
  { id:6, name:"思思",   ini:"SS", status:"pending",   dietary:["不吃辣"],         cuisine:["日料","韩料"],          budget:"$$",  vibe:null },
  { id:7, name:"老王",   ini:"LW", status:"confirmed", dietary:[],                  cuisine:["都行"],                 budget:"$$$", vibe:"你们定，我跟" },
  { id:8, name:"小野",   ini:"XY", status:"declined",  dietary:["不吃香菜"],       cuisine:["西餐","粤菜"],          budget:"$$$", vibe:"想要氛围感拉满那种" },
];

export const RESTAURANTS_DATA: Restaurant[] = [
  { id:1, name:"八合里牛肉火锅",        cuisine:"潮汕牛肉火锅", price:"$$",  dist:"0.8km", rating:4.8, match:94, tags:["明档鲜切","牛肉丸必点","排队王"],       addr:"海岸城B1层",    hours:"11:00-22:00", reasoning:"命中大部分人的「不吃辣」+「想吃好的」，潮汕锅是最安全的公约数。食材新鲜，明档现切看得见。", accent:"#E8857A" },
  { id:2, name:"鸟金·炭火烧鸟",         cuisine:"日式烧鸟",     price:"$$$", dist:"1.5km", rating:4.7, match:88, tags:["烧鸟专门店","氛围感","适合约会"],       addr:"万象天地L3",      hours:"17:30-01:00", reasoning:"小野想要的氛围感，小林想要的安静聊天，老张想要的档次——这一个地方全包了。",     accent:"#7BAF8C" },
  { id:3, name:"金稻园砂锅粥",           cuisine:"粤菜·砂锅粥", price:"$",   dist:"0.7km", rating:4.6, match:82, tags:["宵夜圣地","性价比高","广东味道"],       addr:"南油生活区",      hours:"17:00-03:00", reasoning:"人均 80 吃到撑，满足了阿花的预算和清爽需求。砂锅粥配几碟小炒，十几个人也能拼桌。", accent:"#8B7AB8" },
];

export const INITIAL_ACTIVITIES: Activity[] = [
  { id:6, type:"system", ini:"HJ", name:"今天整点啥",    msg:"聚会创建 · 周五聚餐计划",                         time:"1小时前", read:true  },
  { id:5, type:"rsvp",   ini:"DL", name:"大刘",          msg:"已确认参加",                                      time:"42分前", read:true  },
  { id:4, type:"rsvp",   ini:"XL", name:"小林",          msg:"已确认 · 标注了海鲜过敏",                          time:"31分前", read:true  },
  { id:3, type:"rsvp",   ini:"AH", name:"阿花",          msg:"已确认 · 提交了偏好",                              time:"18分前", read:false },
  { id:2, type:"vibe",   ini:"LZ", name:"老张",          msg:`提交了偏好：「今晚我请客，档次不能低」`,            time:"9分前",  read:false },
  { id:1, type:"rsvp",   ini:"XM", name:"小明",          msg:"已确认参加",                                      time:"2分前",  read:false },
];

export const clrs = ["coral","sage","sky","amber","lav"] as const;
export const bgMap: Record<string,string> = {
  coral:"oklch(91% .07 26)",sage:"oklch(91% .06 148)",sky:"oklch(91% .06 228)",amber:"oklch(93% .07 72)",lav:"oklch(91% .06 284)"
};
export const fgMap: Record<string,string> = {
  coral:"oklch(42% .17 26)",sage:"oklch(36% .13 148)",sky:"oklch(38% .14 228)",amber:"oklch(44% .15 72)",lav:"oklch(40% .14 284)"
};
export function avColor(ini: string): string {
  return clrs[ini.charCodeAt(0) % clrs.length] ?? "sky";
}
