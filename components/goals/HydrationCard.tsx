import React, { useState } from 'react';

export const HydrationCard: React.FC = () => {
  // Pure client-side state for instant visual feedback loops
  const [currentMl, setCurrentMl] = useState(500);
  const targetMl = 2000;
  
  // Real-time rendering calculations
  const progressPercentage = Math.round((currentMl / targetMl) * 100);
  const remainingMl = Math.max(0, targetMl - currentMl);

  const handleAddWater = () => {
    setCurrentMl(prev => Math.min(prev + 250, targetMl));
  };

  const handleReset = () => {
    setCurrentMl(0);
  };

  return (
    <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-sky-400/10 to-blue-500/5 border border-sky-200/40 p-5 shadow-[0_8px_32px_0_rgba(56,189,248,0.08)] backdrop-blur-md relative overflow-hidden">
      
      {/* 🌊 Background Aquatic Sub-glow Orbs */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Label Meta Group */}
      <div className="flex justify-between items-start z-10 relative">
        <div>
          <h3 className="text-xs font-bold text-sky-500 tracking-wider uppercase flex items-center gap-1">
            💧 Hydration
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Fill your glass as you go</p>
        </div>
        <span className="text-[10px] font-bold bg-sky-500/10 text-sky-600 border border-sky-400/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
          Daily Log
        </span>
      </div>

      {/* Main Fluid Stat Typography Display */}
      <div className="my-5 flex items-baseline justify-between z-10 relative">
        <div>
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{currentMl} ml</span>
          <span className="text-xs text-slate-400 font-medium ml-1">of {targetMl / 1000}L goal</span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-sky-500 font-mono tracking-tight">{progressPercentage}%</span>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Completed</p>
        </div>
      </div>

      {/* 🌊 The Dynamic Liquid Fill Level Bar */}
      <div className="space-y-1.5 z-10 relative">
        <div className="w-full bg-slate-100/80 border border-slate-200/30 h-4 rounded-full overflow-hidden relative shadow-inner">
          {/* Wave Fluid Track Overlay */}
          <div 
            className="h-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-500 transition-all duration-700 ease-out relative rounded-full"
            style={{ width: `${progressPercentage}%` }}
          >
            {/* Water Surface Glare Highlights */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.2),transparent)]" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/40" />
          </div>
        </div>
        
        {/* Dynamic Descriptive Feedback Labels */}
        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
          <span>{remainingMl === 0 ? '🎉 Target hit!' : `${remainingMl} ml remaining`}</span>
          <span>Target: {targetMl} ml</span>
        </div>
      </div>

      {/* Quick-Tap Fluid Action Controls */}
      <div className="mt-5 pt-4 border-t border-sky-200/20 flex gap-2.5 z-10 relative">
        <button 
          onClick={handleAddWater}
          disabled={currentMl >= targetMl}
          className="flex-1 bg-gradient-to-b from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl text-xs tracking-wide shadow-[0_4px_12px_rgba(14,165,233,0.25)] hover:shadow-[0_6px_16px_rgba(14,165,233,0.35)] transition duration-200 flex flex-col items-center justify-center gap-0.5 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 disabled:shadow-none"
        >
          <span className="text-sm font-black">+ 250 ml</span>
          <span className="text-[9px] uppercase tracking-wider text-sky-100 font-medium">Per Tap</span>
        </button>

        <button 
          onClick={handleReset}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-bold px-4 rounded-xl text-[10px] uppercase tracking-wider transition duration-200 shadow-sm flex items-center justify-center"
        >
          Reset water
        </button>
      </div>
    </div>
  );
};
