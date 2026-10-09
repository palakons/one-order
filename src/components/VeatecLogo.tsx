"use client";

import React from "react";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  variant?: "horizontal" | "vertical" | "icon-only";
}

export default function VeatecLogo({
  className = "",
  size = "md",
  showSubtitle = true,
  variant = "horizontal",
}: Props) {
  // Brand Colors from VISTEC CI
  const VISTEC_PURPLE = "#5D3085"; // Deep Purple
  const VISTEC_RED = "#B4213A"; // Crimson Red

  // Text scaling factors
  const isSm = size === "sm";
  const isMd = size === "md";
  const isLg = size === "lg";
  const isXl = size === "xl";

  const iconDim = isSm ? 40 : isLg ? 54 : isXl ? 68 : 46;
  const wordFontSize = isSm ? "1.25rem" : isLg ? "1.9rem" : isXl ? "2.4rem" : "1.55rem";

  // Reusable Mascot Logo Icon
  const LogoIcon = ({ dim }: { dim: number }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/veatec-logo-sm.png"
      alt="VEATEC Mascot Logo"
      width={dim}
      height={dim}
      className="shrink-0 select-none object-contain drop-shadow-2xs transition-transform hover:scale-105"
      style={{ width: `${dim}px`, height: `${dim}px` }}
    />
  );

  if (variant === "icon-only") {
    return <LogoIcon dim={iconDim} />;
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Visual Icon: V with Fun Eat Inside */}
      <LogoIcon dim={iconDim} />

      {/* Brand Wordmark: V · EAT · EC */}
      <div className="flex flex-col justify-center text-left">
        {/* Wordmark row emphasizing the FUN "EAT" in the middle */}
        <div className="flex items-baseline leading-none font-black tracking-tight">
          {/* 'V' (VISTEC Tech Purple) */}
          <span
            className="tracking-tighter transition-colors"
            style={{
              color: VISTEC_PURPLE,
              fontSize: wordFontSize,
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            V
          </span>

          {/* 'EAT' (FUN, BOLD, APPETIZING CRIMSON WITH FOOD SMILE ARC!) */}
          <span className="relative inline-flex flex-col items-center mx-0.5 group">
            {/* Playful mini food steam sparkle indicator on hover/display */}
            <span
              className="relative z-10 font-black tracking-tight italic"
              style={{
                color: VISTEC_RED,
                fontSize: wordFontSize,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                textShadow: "0 1px 2px rgba(180, 33, 58, 0.15)",
              }}
            >
              EAT
            </span>

            {/* Cheerful dining smile curve directly under EAT */}
            <svg
              className="absolute -bottom-1.5 w-[92%] h-2 text-[#B4213A]"
              viewBox="0 0 36 7"
              fill="none"
            >
              <path
                d="M2 1.5 Q18 7 34 1.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </span>

          {/* 'EC' (VISTEC Tech Purple) */}
          <span
            className="tracking-tighter transition-colors"
            style={{
              color: VISTEC_PURPLE,
              fontSize: wordFontSize,
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            EC
          </span>

          {/* Fun Tag Badge: V · EAT · TEC */}
          <span
            className="ml-2 rounded-full px-1.5 sm:px-2 py-0.5 font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-2xs self-center"
            style={{
              fontSize: isSm ? "8px" : "9px",
              backgroundColor: "#FCECEF",
              color: VISTEC_RED,
              border: "1px solid #F5CDD3",
            }}
          >
            <span>V·EAT·TEC</span>
            <span className="text-[10px] leading-none">😋</span>
          </span>
        </div>

        {/* Subtitle with VISTEC CI Tracked Style */}
        {showSubtitle && (
          <div
            className="flex items-center gap-1.5 mt-0.5 font-bold uppercase tracking-widest leading-none"
            style={{
              fontSize: isSm ? "8px" : isLg ? "10px" : "9px",
              color: VISTEC_PURPLE,
              letterSpacing: "0.14em",
            }}
          >
            <span>VISTEC</span>
            <span style={{ color: VISTEC_RED }}>·</span>
            <span>CAMPUS FOOD POOL</span>
          </div>
        )}
      </div>
    </div>
  );
}
