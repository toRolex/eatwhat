"use client";
import { useState } from 'react';

export default function LandingPage() {
  const [view, setView] = useState('dashboard');
  const [aiEnabled, setAiEnabled] = useState(true);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="glow-bg"></div>

      {view === 'dashboard' && (
        <div className="proto-container w-full max-w-xl p-8 space-y-6">
          <h1 className="text-3xl font-bold">Create a Group Plan</h1>
          <p className="text-[#9ca3af]">To show the vision, let's start by picking an event type.</p>
          <div className="flex flex-col gap-3">
            <button className="proto-btn w-full text-left p-4 rounded-xl font-medium" onClick={() => setView('planner')}>
              🍝 Dinner Event
            </button>
            <button className="proto-btn w-full text-left p-4 rounded-xl font-medium" onClick={() => setView('planner-custom')}>
              ✨ Custom Event
            </button>
          </div>
        </div>
      )}

      {view === 'planner' && (
        <div className="proto-container w-full max-w-xl p-8 space-y-6">
          <h2 className="text-2xl font-bold">Plan: Dinner Event</h2>
          <p className="text-[#9ca3af]">Set up the constraints. The AI agent will figure out the rest with your friends.</p>
          
          <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl">
            <div>
              <strong>AI Planner Mode</strong>
              <div className="text-sm text-[#9ca3af]">Allow friends to negotiate details with the AI</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="font-medium">Restrict Categories (Locked)</label>
            <input type="text" defaultValue="Italian Food, Downtown Area" className="w-full bg-black/20 border border-white/10 text-white p-3 rounded-lg outline-none" />
          </div>

          <div className="space-y-2">
            <label className="font-medium">Suggest Elements (Flexible)</label>
            <input type="text" defaultValue="Friday Night, casual dress code" className="w-full bg-black/20 border border-white/10 text-white p-3 rounded-lg outline-none" />
          </div>

          <button className="w-full bg-[#7c3aed] text-white p-3 rounded-xl font-medium hover:bg-[#6d28d9] transition-all" onClick={() => { alert("Magic Link created and sent via SMS!"); setView('invite'); }}>
            Generate Magic Link
          </button>
          <button className="w-full text-center text-[#9ca3af] hover:text-white mt-2" onClick={() => setView('dashboard')}>Back</button>
        </div>
      )}

      {view === 'planner-custom' && (
        <div className="proto-container w-full max-w-xl p-8 space-y-6">
          <h2 className="text-2xl font-bold">Plan: Custom Event</h2>
          
          <div className="space-y-2">
            <label className="font-medium">Event Core concept</label>
            <input type="text" placeholder="e.g. Ski trip in Tahoe" className="w-full bg-black/20 border border-white/10 text-white p-3 rounded-lg outline-none" />
          </div>

          <div className="space-y-2">
            <label className="font-medium">Restrictions & Constraints</label>
            <input type="text" placeholder="e.g. Under $500 total, next month" className="w-full bg-black/20 border border-white/10 text-white p-3 rounded-lg outline-none" />
          </div>

          <button className="w-full bg-[#7c3aed] text-white p-3 rounded-xl font-medium hover:bg-[#6d28d9] transition-all" onClick={() => { alert("Magic Link created and sent via SMS!"); setView('invite'); }}>
            Generate Magic Link
          </button>
          <button className="w-full text-center text-[#9ca3af] hover:text-white mt-2" onClick={() => setView('dashboard')}>Back</button>
        </div>
      )}

      {view === 'invite' && (
        <div className="proto-container w-full max-w-xl p-8 space-y-6">
          <h2 className="text-4xl font-bold">Dinner with Friends</h2>
          <p className="text-[#7c3aed]">Organized via GroupPlan</p>
          
          <div className="bg-black/30 p-4 rounded-xl space-y-2 mt-6">
            <div><strong>Event Status:</strong> Gathering ideas</div>
            <div><strong>Locked:</strong> Italian Food, Downtown Area</div>
            <div><strong>Suggested:</strong> Friday Night, casual</div>
          </div>

          <div className="flex gap-4 mt-6">
            <button className="flex-1 bg-[#22c55e]/20 border border-[#22c55e] p-3 rounded-xl hover:bg-[#22c55e]/30 transition-colors">Accept</button>
            <button className="flex-1 bg-[#ef4444]/20 border border-[#ef4444] p-3 rounded-xl hover:bg-[#ef4444]/30 transition-colors">Decline</button>
          </div>

          {aiEnabled && (
            <div className="mt-4 p-4 bg-[#7c3aed]/10 border border-[#7c3aed] rounded-xl">
              <h3 className="font-medium">✨ AI Agent Active</h3>
              <p className="text-sm text-[#9ca3af] my-2">Since the time is just suggested, do you prefer Saturday night instead?</p>
              <input type="text" placeholder="Talk to the AI to suggest changes..." className="w-full bg-black/20 border border-white/10 text-white p-2 rounded-lg outline-none" />
              <button className="w-full bg-[#7c3aed] text-white p-2 rounded-lg mt-3 text-sm hover:bg-[#6d28d9]" onClick={() => alert('AI is processing your suggestion!')}>Send Suggestion</button>
            </div>
          )}
          
          <button className="w-full text-center text-[#9ca3af] hover:text-white mt-8" onClick={() => setView('dashboard')}>Restart Prototype</button>
        </div>
      )}
    </main>
  );
}
