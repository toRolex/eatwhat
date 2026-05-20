"use client";

import React from "react";

export default function PlannerView({ onSync }: { onSync: () => void }) {
  return (
    <div className="text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed bg-surface min-h-screen">
      <header className="fixed top-0 w-full z-50 bg-[#fcf9f8]/80 dark:bg-stone-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 h-16 w-full max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-[#4b44da] dark:text-[#6560f5] hover:scale-105 transition-transform duration-200 cursor-pointer">menu</span>
            <span className="text-2xl font-black text-[#1b1b1c] dark:text-[#fcf9f8] tracking-tighter font-headline">GroupPlan</span>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-8 text-[10px] font-semibold uppercase tracking-widest text-[#1b1b1c]/40">
              <button onClick={onSync} className="flex flex-col items-center justify-center bg-[#4b44da] text-white rounded-full px-5 py-2">Sync Updates</button>
            </nav>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform cursor-pointer">
              <img alt="User profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgz7Wz6WUXvDv6zrb7r0izFtNUD00q3dzap0j8WCY9ZdkzwAPjJBON3NCDjeoXxZBitpW9JF4UblC88eMCIR7zTaBvZF1N0btD9JqJJXPLOQfdjSwPTCN9ldja1A3on_1lJWpAhHNNQci1SAuWWUGRnD7JmYQ39Wgr3A2a6g6SDC0hmJwMILIq0fAJ8WDMIWg36Y5kQuHPiIL55dr1VJsoRsxC_D08ag6eg1ya6L_g6136-OyfX2Z4HtudOFAuBoG6M59dIcnztjS4" />
            </div>
          </div>
        </div>
      </header>
      <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto">
        <section className="py-12 mb-8">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-on-surface mb-4 leading-[0.9]">
            The Friday <br/>Gathering
          </h1>
          <div className="flex flex-wrap items-center gap-4">
            <span className="px-5 py-2 bg-secondary-fixed text-on-secondary-fixed rounded-full text-xs font-bold uppercase tracking-widest">Active Plan</span>
            <span className="text-outline text-lg font-medium">8 Members Participating</span>
          </div>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-surface-container-low rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8">
              <span className="material-symbols-outlined text-error text-3xl opacity-20 group-hover:opacity-100 transition-opacity" style={{fontVariationSettings: "'FILL' 1"}}>lock</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 bg-error rounded-full"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Restrict vs Suggest</span>
              </div>
              <h2 className="text-4xl font-bold text-on-surface mb-2 leading-tight">Cuisine Selection</h2>
              <p className="text-on-surface-variant mb-8 max-w-xs">This parameter is locked by the organizer to ensure compatibility with dietary restrictions.</p>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-outline-variant uppercase mb-1 block">Status</span>
                  <div className="inline-flex items-center gap-3 bg-surface-container-lowest px-6 py-4 rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-primary">restaurant</span>
                    <span className="text-xl font-bold font-headline">Italian</span>
                    <span className="material-symbols-outlined text-error text-lg">lock_person</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          </div>
          <div className="md:col-span-5 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/15 flex flex-col justify-between hover:shadow-xl transition-shadow duration-500">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 bg-secondary-container rounded-full"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Suggestion Engine</span>
              </div>
              <h2 className="text-3xl font-bold text-on-surface mb-2 tracking-tight">Temporal Anchor</h2>
              <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">The group is currently gravitating towards an evening start time.</p>
            </div>
            <div className="space-y-6">
              <div className="p-6 bg-surface-container-low rounded-lg relative">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-secondary text-3xl">schedule</span>
                  <div>
                    <span className="block text-2xl font-black font-headline">Friday, 8:00 PM</span>
                    <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Suggested</span>
                  </div>
                </div>
              </div>
              <button className="inline-flex items-center gap-2 text-[#4b44da] font-bold text-sm uppercase tracking-widest hover:gap-4 transition-all group">
                Modify Suggestion
                <span className="material-symbols-outlined text-sm transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
          <div className="md:col-span-12 bg-surface-container-low rounded-xl overflow-hidden group">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-8">
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2 block">Proposed Venue</span>
                <h3 className="text-2xl font-bold font-headline mb-4">L&apos;Osteria del Porto</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-6">Authentic Roman cuisine with a waterfront view. Perfect for mid-sized groups.</p>
              </div>
              <div className="h-48 md:h-full relative overflow-hidden">
                <img alt="Restaurant Interior" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-OqCyy88QwOYopaC7fKuyCOCsS1O-zmLckNj8NLsJ65vsu0fAOurl8t0FBuRtXPL8y3ZeNQU-ffo3RFQ9wRUe_Pm3pAKh9ohUzpKj48VFSrkRtvTUFwIOd9HdtUKJQbPW8J7NnQFBF9yHKg8PDpjlfEXF07xGCrNYk-IXrV6hMX1UvSYS6WexOtsTEIVF6CH0e-BGq3SNTzUjLv0a5yBcZe0e3nobf01l8hBruFgCshgBL0ATU6t-5raDLYBCoE5Io67__dORs4Jy" />
              </div>
            </div>
          </div>
        </div>
      </main>
      <div className="fixed bottom-10 right-10 z-[60] hidden md:block">
        <button onClick={onSync} className="bg-primary text-white px-6 h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform duration-300">
          <span className="font-bold">Generate Magic Link</span>
        </button>
      </div>
    </div>
  );
}
