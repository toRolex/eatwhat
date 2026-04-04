"use client";

import React from "react";

export default function InviteeView({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed antialiased overflow-x-hidden min-h-screen">
      <nav className="fixed top-0 w-full z-50 bg-[#fcf9f8]/80 dark:bg-stone-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 h-16 w-full max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4b44da] dark:text-[#6560f5]" data-icon="menu">menu</span>
          </div>
          <span className="text-2xl font-black text-[#1b1b1c] dark:text-[#fcf9f8] uppercase tracking-tighter font-headline">Curator</span>
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/10">
            <img alt="User profile avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRAKjzZh4bc7P00jPP6Vb7rvLI8eqBCmocMdWGc7mTHDLkbcV4R9C0rbg8xrZbUPAw4_go4Ryp_CwsYdn7TY_HeIK3HBYbO5CQUKYK0FMOoUN2LIXGsDV58yqyWbqJr996wNsQqM3VNgn0_PR2WtG3Olz2ibJHVsTfurGE5k0fRcWDC3UlbofjB52HlaJrNJhj6PxEmV1RyDPIB3PpK_EN0kp_lmEn_Hu_Bk23cMuMhx7nAj-zc6yhvn0lbfG-Xlc0FCmYVcSx6f2c" />
          </div>
        </div>
      </nav>
      <main className="pt-16 pb-32 max-w-md mx-auto min-h-screen relative">
        <section className="relative px-6 pt-12 pb-8">
          <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden editorial-shadow mb-8 group transition-transform duration-500 hover:scale-[1.01]">
            <img className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmvampBrvFcnEUiUipHzfV2n_aB9E0Bl4gO7pUmMhYkz5o_NLtWFiqL6fjcHTgKl5U4YcKppTi7Z10n6panDjfJ52gyG-67C1ctUL7LG2-oIGMO6LYeURNulNt-9DOdnX6MnIMpYl30E4lm25HMb_AyX-o3Ixs_zHoogOxj4ELHv07DIv-PCLWxA1IJe7biRB0nq2xMsVfz_TKoop4OT5ealU44uSEoETiS9N2KJhc8tk-EGyTlO56fl8taIQkeHXGUIDbXgQ-ADbc"/>
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-block px-3 py-1 mb-3 rounded-full bg-primary text-surface font-label text-[10px] font-bold uppercase tracking-widest">Exclusive Invite</span>
              <h1 className="font-headline text-4xl font-black text-surface tracking-tighter leading-none uppercase">The Midnight Soirée</h1>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-surface-container-lowest p-5 rounded-lg editorial-shadow flex flex-col justify-between">
              <span className="material-symbols-outlined text-primary mb-3">event_note</span>
              <div>
                <p className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Date &amp; Time</p>
                <p className="font-headline text-sm font-bold text-on-surface">Dec 24, 08:00 PM</p>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-lg editorial-shadow flex flex-col justify-between">
              <span className="material-symbols-outlined text-secondary mb-3">location_on</span>
              <div>
                <p className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">Location</p>
                <p className="font-headline text-sm font-bold text-on-surface">The Glass Atelier, NY</p>
              </div>
            </div>
          </div>
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-lg font-bold tracking-tight text-on-surface">Live Guestlist</h3>
              <span className="bg-primary-container text-on-primary-container font-label text-[10px] px-2 py-0.5 rounded-full font-bold">12 Attending</span>
            </div>
            <div className="flex items-center space-x-[-12px] overflow-hidden">
              <img className="w-12 h-12 rounded-full border-4 border-surface object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUbDo5l4HE1RiAorktETwAYHTqBUgPSmKnIjMPmOuZz84NiQXm7TNaKKWE5S8AdoWrGO1RaGEg5UBs2_KLHdV5m7JS9QAxI-cP7OiyZV8az1plS-lDuQPibfNsRmX63hkRN2dhX16x-T0XP9lVFZiXs6e0xi5EkOdV53yRLzO_lFXOY_qqKUtlvTxcgGUp_wwsO4QV2wf8HJuohXqyBZVrzrGfIUZfWrzLyjk1LvPPyinwCiV8jQDGiFD8hxUuOMaxKewqzvNLQZmW"/>
              <img className="w-12 h-12 rounded-full border-4 border-surface object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1Krp-hPPukg7RXJNHVeeRpOz-gA7TSBXxkNhQQ44s6ChQ_GrgEOjChWIV8C_3anks2rPvpcqWUIwH6SAOYlV4iO3t_jXkx2nPyl_n7rtea6A4FUAY5YmkUtHiRPQABAw_XlKcQsVEy_whXfx2VWWTkLBs4QPbvID8zeG0h_o7-h1gpI6OX2rmccWZNPuh0Cx7zyOQcep-0guQ5tuKyRWyOt08Q3wD8kptidiLINrZK0F_HgqX09aLWOtjeR-DSlla3J3qjRDt9xfp"/>
              <div className="w-12 h-12 rounded-full border-4 border-surface bg-surface-container-high flex items-center justify-center font-bold text-on-surface-variant text-xs">
                +8
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={onAccept} className="w-full py-5 bg-on-surface text-surface rounded-full font-headline font-bold text-base tracking-tight hover:scale-[1.02] transition-transform duration-200 editorial-shadow flex items-center justify-center gap-2">
              Accept Invitation
              <span className="material-symbols-outlined text-sm">check_circle</span>
            </button>
            <button className="w-full py-5 bg-transparent text-on-surface border border-outline-variant/30 rounded-full font-headline font-bold text-base tracking-tight hover:bg-surface-container-low transition-colors duration-200">
              Decline
            </button>
          </div>
        </section>
        <section className="px-6 py-8 border-t border-outline-variant/10">
          <h4 className="font-headline text-xl font-bold mb-4 tracking-tight">The Agenda</h4>
          <div className="space-y-6">
            <div className="flex gap-4">
              <span className="font-headline text-primary font-bold">20:00</span>
              <div>
                <p className="font-headline font-bold text-on-surface">Arrival &amp; Crystal Toast</p>
                <p className="text-on-surface-variant text-sm mt-1">A curated reception.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
