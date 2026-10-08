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

  const iconDim = isSm ? 32 : isLg ? 46 : isXl ? 56 : 40;
  const wordFontSize = isSm ? "1.25rem" : isLg ? "1.9rem" : isXl ? "2.4rem" : "1.55rem";

  // Reusable SVG Icon: Geometric VISTEC V with the "Fun Eat / Happy Food Smile" inside!
  const LogoIcon = ({ dim }: { dim: number }) => (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-2xs select-none"
    >
      <defs>
        {/* Soft appetizing glow */}
        <linearGradient id="veatec-tile-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCF8FE" />
          <stop offset="100%" stopColor="#F8EEF5" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Tile */}
      <rect
        width="100"
        height="100"
        rx="24"
        fill="url(#veatec-tile-grad)"
        stroke="#EBE0F0"
        strokeWidth="2.5"
      />

      {/* 1. Geometric University Wings (VISTEC "V") */}
      {/* Left geometric arm (VISTEC Purple) */}
      <path
        d="M17 22 L34 22 L46 64 L33 64 Z"
        fill={VISTEC_PURPLE}
      />

      {/* Right geometric arm (VISTEC Crimson) */}
      <path
        d="M83 22 L66 22 L54 64 L67 64 Z"
        fill={VISTEC_RED}
      />

      {/* 2. THE FUN EAT INSIDE: Smiling Dining Bowl & Happy Face */}
      {/* Translucent delicious bowl interior */}
      <path
        d="M26 56 Q50 86 74 56 Z"
        fill={VISTEC_RED}
        fillOpacity="0.14"
      />

      {/* Smiling Dining Bowl Bottom Arc (Happy Smile Curve) */}
      <path
        d="M25 56 Q50 86 75 56"
        stroke={VISTEC_RED}
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cute Little Tongue (Yum / Delicious Bite) */}
      <path
        d="M45 68 Q50 78 55 68 Z"
        fill={VISTEC_RED}
      />

      {/* Two Happy Cheerful Eyes inside the V (Playful Anime Yum Face: ^ ^) */}
      <path
        d="M37 42 Q41 35 45 42"
        stroke={VISTEC_PURPLE}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M55 42 Q59 35 63 42"
        stroke={VISTEC_RED}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Rising Steam Wisps (Hot & Fresh Food) */}
      <path
        d="M45 23 Q42 16 46 12"
        stroke={VISTEC_PURPLE}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.85"
      />
      <path
        d="M55 23 Q58 16 54 12"
        stroke={VISTEC_RED}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.85"
      />

      {/* Tiny appetizing sparkle dot */}
      <circle cx="50" cy="27" r="2" fill="#E8604C" />
    </svg>
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
