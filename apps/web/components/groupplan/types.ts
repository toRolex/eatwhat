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

export const GUESTS_DATA: Guest[] = [
  { id:1, name:"Jordan Kim",   ini:"JK", status:"confirmed", dietary:["Vegetarian"],       cuisine:["Japanese","Italian"],         budget:"$$",  vibe:"Chill dinner with good cocktails" },
  { id:2, name:"Maya Patel",   ini:"MP", status:"confirmed", dietary:["Vegan","GF"],        cuisine:["Thai","Vietnamese"],           budget:"$",   vibe:"Healthy but fun" },
  { id:3, name:"Theo Walsh",   ini:"TW", status:"confirmed", dietary:[],                    cuisine:["Italian","American"],          budget:"$$$", vibe:"Upscale, impressing someone" },
  { id:4, name:"Priya Nair",   ini:"PN", status:"confirmed", dietary:["Halal"],             cuisine:["Mediterranean","Indian"],      budget:"$$",  vibe:"Cozy, easy conversation" },
  { id:5, name:"Sam Torres",   ini:"ST", status:"confirmed", dietary:[],                    cuisine:["Mexican","American"],          budget:"$$",  vibe:"Loud and fun for groups" },
  { id:6, name:"Aria Leung",   ini:"AL", status:"pending",   dietary:["Vegetarian"],        cuisine:["Japanese","Korean"],           budget:"$$",  vibe:null },
  { id:7, name:"Dev Sharma",   ini:"DS", status:"confirmed", dietary:[],                    cuisine:["Any"],                         budget:"$$$", vibe:"I trust the algorithm" },
  { id:8, name:"Zoe Blanc",    ini:"ZB", status:"declined",  dietary:["GF"],                cuisine:["French","Italian"],            budget:"$$$", vibe:"Romantic bistro energy" },
];

export const RESTAURANTS_DATA: Restaurant[] = [
  { id:1, name:"Nobu Kitchen",      cuisine:"Japanese Fusion",  price:"$$$", dist:"0.8mi", rating:4.8, match:94, tags:["Vegan Options","Halal Friendly","GF Available"], addr:"182 Hudson St",  hours:"5pm–11pm",  reasoning:"Optimal centroid match. 94% dietary satisfaction. TOPSIS 0.87. Monte Carlo failure: 4%.", accent:"#E8857A" },
  { id:2, name:"Altro Paradiso",    cuisine:"Italian",          price:"$$",  dist:"1.2mi", rating:4.6, match:88, tags:["Vegetarian Menu","Cozy","Award-winning Pasta"],  addr:"234 Spring St",  hours:"6pm–12am",  reasoning:"Strong cuisine alignment. Budget optimized. TOPSIS 0.81. Walking distance centroid.",       accent:"#7BAF8C" },
  { id:3, name:"Employees Only",    cuisine:"Mediterranean Bar",price:"$$",  dist:"0.4mi", rating:4.7, match:82, tags:["Cocktail Forward","Halal","Late Night"],          addr:"510 Hudson St",  hours:"6pm–4am",   reasoning:"Highest vibe alignment. Closest to group centroid. TOPSIS 0.78. Best for group energy.",   accent:"#8B7AB8" },
];

export const INITIAL_ACTIVITIES: Activity[] = [
  { id:6, type:"system", ini:"✦", name:"GroupPlan",    msg:"Event created · The Friday Gathering",              time:"1h ago",  read:true  },
  { id:5, type:"rsvp",   ini:"ST", name:"Sam Torres",  msg:"confirmed attendance",                              time:"42m ago", read:true  },
  { id:4, type:"rsvp",   ini:"PN", name:"Priya Nair",  msg:"confirmed · added Halal restriction",               time:"31m ago", read:true  },
  { id:3, type:"rsvp",   ini:"MP", name:"Maya Patel",  msg:"confirmed · submitted vibe",                        time:"18m ago", read:false },
  { id:2, type:"vibe",   ini:"TW", name:"Theo Walsh",  msg:`submitted vibe: "Upscale, impressing someone"`,     time:"9m ago",  read:false },
  { id:1, type:"rsvp",   ini:"JK", name:"Jordan Kim",  msg:"confirmed attendance",                              time:"2m ago",  read:false },
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
