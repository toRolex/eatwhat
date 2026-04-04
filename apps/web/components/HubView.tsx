"use client";

import React from "react";

export default function HubView({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed min-h-screen">
      <header className="fixed top-0 w-full z-50 bg-[#fcf9f8]/80 dark:bg-stone-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 h-16 w-full max-w-md mx-auto">
          <button className="hover:scale-105 transition-transform duration-200 text-[#1b1b1c]/60 dark:text-[#fcf9f8]/60">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-2xl font-black text-[#1b1b1c] dark:text-[#fcf9f8] uppercase tracking-tighter font-headline">Curator</h1>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 hover:scale-105 transition-transform duration-200">
            <img alt="User avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-LHgvR9p05_RGL4wwMQHsGd9cxywvdS6TCtEkiyJVcG6-Jaj8TnH1HzXXADQkVIofbb-KydlpuF1SGssSwbMNsCtuSgwHAZITIsCKxI7YG5v2KOkhnobGqMJItbPWZWdKRfqFBGWN90WFWXWHJcQJg2aK8OC-FQiCoJFXsm4ofBl5J34K7N-A07xxkDPXVFlzxMn4h-MMxz2MrnzbifFP_4nvghy7XSvwaHbDM17xtV5c784p4VWAQc5VMhbGyCUssppbJXaKZ6iy" />
          </div>
        </div>
      </header>
      <main className="pt-24 pb-32 px-6 max-w-md mx-auto min-h-screen">
        <section className="mb-12 text-center">
          <h2 className="font-headline font-black text-4xl tracking-tight leading-tight mb-4 text-on-surface">
            Find Your Group's <span className="text-primary">Perfect Rhythm</span>
          </h2>
          <p className="text-on-surface-variant font-medium leading-relaxed">
            Your AI agent is harmonizing schedules and preferences in real-time.
          </p>
        </section>
        <div className="relative group mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-tertiary/20 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition duration-1000"></div>
          <div className="relative bg-surface-container-lowest rounded-xl p-6 editorial-shadow border border-outline-variant/10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container/20 text-secondary font-semibold text-xs tracking-wider uppercase mb-3">
                  Live Consensus
                </span>
                <h3 className="font-headline font-bold text-2xl text-on-surface">Dinner at L'Avenue</h3>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-primary">85%</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Match</span>
              </div>
            </div>
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden mb-6 flex">
              <div className="h-full bg-gradient-to-r from-primary to-primary-container" style={{ width: "85%" }}></div>
            </div>
            <div className="flex -space-x-2">
              <img className="w-8 h-8 rounded-full border-2 border-surface-container-lowest overflow-hidden" src="https://lh3.googleusercontent.com/aida-public/AB6AXuANkBZa3pQ0tKNUu-nereN2ZuEgJZ8-4336JxKln5oqj1rj-QKxjyTyJuvH__YTTfaiH3ikbcY49pLPxcd5odkONeKQvEOvv-sU6DW4ioYdRhVRHVCDpRiteU8ha_YVCHKeeBvkMItmMRBv5MQUMxWknBNZYC3gy43pejzzgVToN5SXp8QP049IS9EQul3FpQSaGgYW-filwgAszEHzcQrj4-BXPxajHRoSf6OYCP4eaRYkh2kbPj3NftZExhJHfdCn_XSYCWX4Oyue" />
              <img className="w-8 h-8 rounded-full border-2 border-surface-container-lowest overflow-hidden" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-JcVMvGiroSQg78miWYH5Q0s1mhJfVmEQixycAH8l8m3ClV3yPizkQ9HusUKfQkMJ4_3dUvct0kfuZuuYxMGgBOFN0m_9dqLrLkEbruVOJXlPdGo1kv9bncmXlOLY1D6HG14zLrfXfYHiLZP-V0aJAl25ISjHBAgnkFk-hXP4D0W6WRapw_qch6BAfCLP2ye9ZCMzaGdeaMq4ewnHqAXO--zSb8B-8aGIJVUz1kdnAd7fmOyUUxHtn5pWacnSLHfpD9qUu-yah6_f" />
            </div>
          </div>
        </div>
        <div className="space-y-6 mb-12">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
              <span className="material-symbols-outlined text-white text-sm" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
            </div>
            <div className="flex-1">
              <div className="bg-surface-container-low rounded-tr-xl rounded-b-xl p-4 editorial-shadow">
                <p className="text-sm font-medium text-on-surface leading-relaxed">
                  Based on everyone's availability, I suggest booking for <span className="font-bold text-primary">7 PM this Friday</span>.
                </p>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/40 mt-1 ml-1 uppercase tracking-widest">AI Agent • Just now</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-end">
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => onNavigate("dashboard")} className="bg-on-surface text-surface px-6 py-3 rounded-full font-bold text-sm hover:scale-[1.02] transition-transform duration-200 editorial-shadow flex items-center gap-2">
                Works for me!
                <span className="material-symbols-outlined text-sm">done</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
