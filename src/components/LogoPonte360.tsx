import React from "react";

interface LogoProps {
  className?: string;
  variant?: "light" | "dark";
  showText?: boolean;
}

export default function LogoPonte360({ className = "h-12", variant = "light", showText = true }: LogoProps) {
  const isDark = variant === "dark";
  const textColor = isDark ? "text-white" : "text-[#0F4C81]";
  const lineColor = isDark ? "border-slate-700" : "border-slate-200";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Dynamic, High-fidelity SVG recreation of the Ponte 360 Logo */}
      <svg
        viewBox="0 0 160 160"
        className="h-full w-auto shrink-0 select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Circular Dashed Arrow Rim */}
        <path
          d="M 50,20 A 65,65 0 1,1 25,120"
          stroke="#0F4C81"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="1 7"
        />
        <path
          d="M 50,20 A 65,65 0 0,1 125,45"
          stroke="#0F4C81"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Clockwise Arrow Tip */}
        <path
          d="M 115,48 L 128,43 L 123,30"
          stroke="#0F4C81"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The Bridge (Ponte) spanning across */}
        <path
          d="M 22,64 Q 50,45 80,64"
          stroke="#0F4C81"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M 22,64 Q 50,53 80,64"
          stroke="#0F4C81"
          strokeWidth="1.5"
        />
        {/* Bridge pillars */}
        <line x1="33" y1="58" x2="33" y2="78" stroke="#0F4C81" strokeWidth="3" />
        <line x1="68" y1="58" x2="68" y2="78" stroke="#0F4C81" strokeWidth="3" />

        {/* Hand supporting from the bottom (Mão da escuta) */}
        <path
          d="M 26,110 Q 50,130 85,120 C 70,116 65,110 52,112 C 45,113 40,111 36,108"
          fill="#0F4C81"
        />

        {/* Human Figure with raised arms (O colaborador) */}
        <circle cx="50" cy="85" r="7.5" fill="#0F4C81" />
        {/* Body & Arms */}
        <path
          d="M 33,83 Q 50,92 67,83 Q 50,115 33,83"
          fill="#0F4C81"
        />

        {/* Connection hubs (Transformação digital/educacional) */}
        <line x1="68" y1="83" x2="88" y2="83" stroke="#0F4C81" strokeWidth="2.5" />
        <line x1="65" y1="89" x2="85" y2="101" stroke="#0F4C81" strokeWidth="2.5" />
        <line x1="62" y1="95" x2="80" y2="113" stroke="#0F4C81" strokeWidth="2.5" />
        
        {/* Nodes */}
        <circle cx="91" cy="83" r="3" fill="#F58220" />
        <circle cx="88" cy="101" r="3" fill="#0F4C81" />
        <circle cx="83" cy="113" r="3" fill="#F58220" />

        {/* Sparkle orange energy dots */}
        <circle cx="95" cy="110" r="3.5" fill="#F58220" />
        <circle cx="102" cy="118" r="4.5" fill="#F58220" />
      </svg>

      {/* Text Branding */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1 select-none">
            <span className={`text-xl font-bold tracking-tight ${textColor} leading-none`}>
              Ponte
            </span>
            <span className="text-2xl font-black text-[#F58220] leading-none">
              360
            </span>
          </div>
          {/* Horizontal line */}
          <div className={`w-full border-b ${lineColor} my-1 relative`}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#F58220]" />
          </div>
          <span className={`text-[9px] font-extrabold uppercase tracking-wide opacity-80 ${isDark ? "text-slate-300" : "text-[#0F4C81]"} whitespace-nowrap leading-none`}>
            Da escuta à transformação
          </span>
        </div>
      )}
    </div>
  );
}
