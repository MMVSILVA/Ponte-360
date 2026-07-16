import React from "react";

interface LogoProps {
  className?: string;
  variant?: "light" | "dark";
  showText?: boolean;
}

export default function LogoPonte360({ className = "", showText = true }: LogoProps) {
  // Always use the real, fidedigne colors of the official logo:
  // Blue: #0F4C81
  // Orange: #F58220
  // Background: white with rounded corners to resemble the original photo exactly as requested.
  return (
    <div className={`flex items-center justify-center gap-2.5 bg-white px-3 py-2.5 rounded-xl border border-slate-100 shadow-sm select-none w-full h-auto max-w-full ${className}`}>
      {/* Real & Fidedigno High-fidelity SVG recreation of the Ponte 360 Logo from the uploaded image */}
      <svg
        viewBox="0 0 200 200"
        className="w-12 h-12 sm:w-14 sm:h-14 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Circular Dashed Arrow Rim */}
        {/* Top solid arc from 9 o'clock to 2 o'clock */}
        <path
          d="M 25,100 A 75,75 0 0,1 153,47"
          stroke="#0F4C81"
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* Clockwise Arrow Tip */}
        <path
          d="M 141,43 L 165,51 L 157,26"
          stroke="#0F4C81"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dotted path on the left */}
        <path
          d="M 25,100 A 75,75 0 0,0 55,155"
          stroke="#0F4C81"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1 13"
        />

        {/* Orange dots on the bottom right (curving up) */}
        {/* Dot 1 */}
        <circle cx="143" cy="161" r="5" fill="#F58220" />
        {/* Dot 2 */}
        <circle cx="155" cy="151" r="6.5" fill="#F58220" />
        {/* Dot 3 */}
        <circle cx="164" cy="139" r="8" fill="#F58220" />
        {/* Dot 4 */}
        <circle cx="171" cy="124" r="9.5" fill="#F58220" />

        {/* The Bridge (Ponte) */}
        {/* Deck */}
        <path
          d="M 35,76 C 55,79 145,79 165,76"
          stroke="#0F4C81"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        {/* Suspension Cable */}
        <path
          d="M 35,76 Q 47,56 60,48 Q 100,76 140,48 Q 153,56 165,76"
          stroke="#0F4C81"
          strokeWidth="3"
        />
        {/* Towers */}
        <line x1="60" y1="48" x2="60" y2="82" stroke="#0F4C81" strokeWidth="4.5" />
        <line x1="140" y1="48" x2="140" y2="82" stroke="#0F4C81" strokeWidth="4.5" />
        {/* Suspenders */}
        <line x1="75" y1="57" x2="75" y2="78" stroke="#0F4C81" strokeWidth="1.5" />
        <line x1="90" y1="64" x2="90" y2="78" stroke="#0F4C81" strokeWidth="1.5" />
        <line x1="110" y1="64" x2="110" y2="78" stroke="#0F4C81" strokeWidth="1.5" />
        <line x1="125" y1="57" x2="125" y2="78" stroke="#0F4C81" strokeWidth="1.5" />

        {/* Human Figure */}
        <circle cx="100" cy="100" r="10.5" fill="#0F4C81" />
        <path
          d="M 69,87 C 80,94 92,104 94,112 C 94,124 93,132 94,136 C 97,138 103,138 106,136 C 107,132 106,124 106,112 C 108,104 120,94 131,87 C 125,83 115,92 107,101 C 104,105 102,109 101,111 C 99,109 97,105 94,101 C 86,92 76,83 69,87 Z"
          fill="#0F4C81"
        />

        {/* Hand Supporting from bottom */}
        <path
          d="M 35,128 C 45,142 65,153 85,153 C 105,153 118,142 126,128 C 112,130 98,131 87,138 C 76,134 62,132 48,132 C 40,131 36,129 35,128 Z"
          fill="#0F4C81"
        />

        {/* Connection hubs (Transformação digital) */}
        <path d="M 130,85 L 140,85 L 148,77 L 165,77" stroke="#0F4C81" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="169" cy="77" r="5" fill="#0F4C81" />

        <path d="M 132,91 L 165,91" stroke="#F58220" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="169" cy="91" r="5" fill="#F58220" />

        <path d="M 130,97 L 140,97 L 148,105 L 165,105" stroke="#0F4C81" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="169" cy="105" r="5" fill="#0F4C81" />
      </svg>

      {/* Real Text Branding layout from official logo */}
      {showText && (
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-[17px] font-bold tracking-tight text-[#0F4C81] leading-none font-sans">
            Ponte
          </span>
          <span className="text-[23px] font-black text-[#F58220] leading-none font-sans mt-0.5">
            360
          </span>
          {/* Horizontal line under logo text */}
          <div className="w-full relative mt-1.5 mb-1 h-[1.5px] bg-[#0F4C81]">
            <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#F58220]" />
          </div>
          <span className="text-[8px] font-extrabold tracking-wide text-[#0F4C81] whitespace-nowrap leading-none font-sans">
            Da escuta à transformação
          </span>
        </div>
      )}
    </div>
  );
}
