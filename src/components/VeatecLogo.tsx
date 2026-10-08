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
  const VISTEC_PURPLE = "#5D3085";
  const VISTEC_RED = "#B4213A";

  if (variant === "icon-only") {
    const iconSize = size === "sm" ? 28 : size === "lg" ? 44 : size === "xl" ? 56 : 36;
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
      >
        {/* Geometric Hexagonal Shield with subtle food curve */}
        <defs>
          <linearGradient id="veatec-grad-p" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6C399B" />
            <stop offset="100%" stopColor="#5D3085" />
          </linearGradient>
          <linearGradient id="veatec-grad-r" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C92A45" />
            <stop offset="100%" stopColor="#B4213A" />
          </linearGradient>
        </defs>

        {/* Background rounded squircle / geometric tile */}
        <rect width="100" height="100" rx="24" fill="#FAF7FB" stroke="#EFE6F3" strokeWidth="2" />

        {/* Geometric V Outer Facets (Purple) */}
        {/* Left wing of geometric V */}
        <path
          d="M20 22 L38 22 L50 62 L40 62 Z"
          fill={VISTEC_PURPLE}
        />
        {/* Right wing of geometric V (Red) */}
        <path
          d="M80 22 L62 22 L50 62 L60 62 Z"
          fill={VISTEC_RED}
        />

        {/* Subtle curve in otherwise geometric: The Smiling Dining Bowl Arc */}
        <path
          d="M26 62 Q50 86 74 62"
          stroke={VISTEC_RED}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />

        {/* Center food dot / steam accent */}
        <circle cx="50" cy="40" r="5" fill={VISTEC_RED} />
      </svg>
    );
  }

  // Text scaling factors
  const isSm = size === "sm";
  const isLg = size === "lg";
  const isXl = size === "xl";

  const iconDim = isSm ? 32 : isLg ? 44 : isXl ? 52 : 38;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon: Geometric V + Dining Smile Arc */}
      <svg
        width={iconDim}
        height={iconDim}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-2xs"
      >
        <rect width="100" height="100" rx="22" fill="#FAF6FB" stroke="#EDE4F2" strokeWidth="2.5" />
        
        {/* Left geometric arm: VISTEC Purple */}
        <path d="M22 24 L38 24 L49 60 L37 60 Z" fill={VISTEC_PURPLE} />

        {/* Right geometric arm: VISTEC Crimson */}
        <path d="M78 24 L62 24 L51 60 L63 60 Z" fill={VISTEC_RED} />

        {/* Subtle curve: Dining Bowl / Smile Arc */}
        <path
          d="M25 60 Q50 85 75 60"
          stroke={VISTEC_RED}
          strokeWidth="6.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Golden/Warm accent dot in center */}
        <circle cx="50" cy="42" r="5" fill={VISTEC_PURPLE} />
      </svg>

      {/* Brand Wordmark & CI Subtitle */}
      <div className="flex flex-col justify-center">
        {/* VEATEC Wordmark */}
        <div className="flex items-baseline leading-none font-black tracking-tight">
          {/* VEA in VISTEC Purple */}
          <span
            className="tracking-tighter"
            style={{
              color: VISTEC_PURPLE,
              fontSize: isSm ? "1.25rem" : isLg ? "1.85rem" : isXl ? "2.25rem" : "1.5rem",
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: "-0.03em",
            }}
          >
            VEA
          </span>
          {/* TEC in VISTEC Crimson */}
          <span
            className="tracking-tighter relative"
            style={{
              color: VISTEC_RED,
              fontSize: isSm ? "1.25rem" : isLg ? "1.85rem" : isXl ? "2.25rem" : "1.5rem",
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              letterSpacing: "-0.03em",
            }}
          >
            TEC
          </span>

          {/* Badge: VISTEC EATS */}
          <span
            className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
            style={{
              backgroundColor: "#FBECEE",
              color: VISTEC_RED,
              border: "1px solid #F5CDD3",
            }}
          >
            Eats
          </span>
        </div>

        {/* Subtitle in VISTEC CI Tracked Style */}
        {showSubtitle && (
          <div
            className="flex items-center gap-1 mt-0.5 font-bold uppercase tracking-widest leading-none"
            style={{
              fontSize: isSm ? "8px" : isLg ? "10px" : "9px",
              color: VISTEC_PURPLE,
              letterSpacing: "0.14em",
            }}
          >
            <span>VISTEC</span>
            <span style={{ color: VISTEC_RED }}>·</span>
            <span>Campus Food Pool</span>
          </div>
        )}
      </div>
    </div>
  );
}
