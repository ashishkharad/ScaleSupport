import React from 'react';

interface ScaleSupportLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'white' | 'badge';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export const ScaleSupportLogo: React.FC<ScaleSupportLogoProps> = ({
  variant = 'full',
  className = '',
  size = 'md',
  showTagline = true,
}) => {
  // Dimension scales
  const sizeMap = {
    sm: { iconSize: 24, textSize: 'text-base', tagSize: 'text-[9px]', height: 'h-7' },
    md: { iconSize: 32, textSize: 'text-xl', tagSize: 'text-[11px]', height: 'h-10' },
    lg: { iconSize: 42, textSize: 'text-2xl', tagSize: 'text-xs', height: 'h-12' },
    xl: { iconSize: 56, textSize: 'text-3xl', tagSize: 'text-sm', height: 'h-16' },
  };

  const { iconSize, textSize, tagSize, height } = sizeMap[size];

  // SVG Chart & Arrow Icon
  const LogoIcon = ({ isWhite = false }: { isWhite?: boolean }) => (
    <svg
      width={iconSize}
      height={iconSize * 0.82}
      viewBox="0 0 100 82"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform group-hover:scale-105"
    >
      {/* Blue Bar Charts */}
      <rect x="8" y="44" width="12" height="24" rx="2" fill={isWhite ? '#93c5fd' : '#0284c7'} />
      <rect x="24" y="32" width="13" height="36" rx="2" fill={isWhite ? '#60a5fa' : '#0369a1'} />
      <rect x="41" y="20" width="14" height="48" rx="2" fill={isWhite ? '#3b82f6' : '#0a58ca'} />
      <rect x="59" y="30" width="13" height="38" rx="2" fill={isWhite ? '#2563eb' : '#003366'} />

      {/* Swooping Base Curve */}
      <path
        d="M2 72C22 64 52 64 78 74C65 77 35 78 2 72Z"
        fill={isWhite ? '#93c5fd' : '#0a2540'}
      />

      {/* Dynamic Red Growth Arrow */}
      <path
        d="M4 64C20 48 46 28 68 18L64 9L88 15L78 38L73 30C54 40 32 56 16 68L4 64Z"
        fill={isWhite ? '#f87171' : '#dc2626'}
        filter="drop-shadow(0px 2px 3px rgba(220, 38, 38, 0.35))"
      />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <LogoIcon isWhite={false} />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs ${className}`}>
        <LogoIcon />
        <div className="flex items-baseline font-black tracking-tight leading-none">
          <span className="italic text-red-600 text-sm">Scale</span>
          <span className="text-[#0a2540] text-sm">Support</span>
        </div>
      </div>
    );
  }

  if (variant === 'white') {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <div className="flex items-center gap-2.5">
          <LogoIcon isWhite={true} />
          <div className="flex items-baseline font-black tracking-tight leading-none select-none">
            <span className={`italic text-red-400 ${textSize} font-extrabold`}>Scale</span>
            <span className={`text-white ${textSize} font-extrabold ml-0.5`}>Support</span>
          </div>
        </div>
        {showTagline && (
          <div className="mt-1 pt-0.5 border-t border-slate-700/60">
            <p className={`italic font-medium text-slate-300 tracking-tight text-[10px]`}>
              Your Growth, Powered by Our Support.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 select-none group cursor-pointer ${className}`}>
        <LogoIcon />
        <div className="flex items-baseline font-black tracking-tight leading-none">
          <span className={`italic text-[#dc2626] ${textSize} font-black`}>Scale</span>
          <span className={`text-[#0a2540] ${textSize} font-black ml-0.5`}>Support</span>
        </div>
      </div>
    );
  }

  // Full Standard Logo with Slogan & Underline
  return (
    <div className={`inline-flex flex-col select-none group ${className}`}>
      <div className="flex items-center gap-2.5">
        <LogoIcon />
        <div className="flex items-baseline font-black tracking-tight leading-none">
          <span className={`italic text-[#dc2626] ${textSize} font-black font-sans`}>Scale</span>
          <span className={`text-[#0a2540] ${textSize} font-black font-sans ml-0.5`}>Support</span>
        </div>
      </div>

      {showTagline && (
        <div className="w-full mt-1 pt-0.5 border-t border-[#0284c7]/40 flex justify-center">
          <span className={`italic font-medium text-[#0a2540] tracking-tight ${tagSize} whitespace-nowrap`}>
            Your Growth, Powered by Our Support.
          </span>
        </div>
      )}
    </div>
  );
};
