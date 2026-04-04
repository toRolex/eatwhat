"use client";

import { useState } from "react";
import PlannerView from "../components/PlannerView";
import InviteeView from "../components/InviteeView";
import HubView from "../components/HubView";

export default function LandingPage() {
  const [currentView, setCurrentView] = useState("dashboard");

  if (currentView === "planner") {
    return <PlannerView onSync={() => setCurrentView("invitee")} />;
  }

  if (currentView === "invitee") {
    return <InviteeView onAccept={() => setCurrentView("hub")} />;
  }

  if (currentView === "hub") {
    return <HubView onNavigate={(v) => setCurrentView(v)} />;
  }

  // Dashboard / Landing
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-headline font-black mb-8">GroupPlan</h1>
      <p className="text-on-surface-variant mb-12 max-w-sm">Select a starting point for the beta demonstration.</p>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button 
          onClick={() => setCurrentView("planner")}
          className="bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
        >
          Planner Flow
        </button>
        <button 
          onClick={() => setCurrentView("invitee")}
          className="bg-surface-container-low text-on-surface border border-outline/20 py-4 rounded-full font-bold hover:scale-105 transition-transform"
        >
          Invitee Magic Link
        </button>
      </div>
    </div>
  );
}
