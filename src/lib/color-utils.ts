import { useState, useEffect } from "react";

export function getDeterministicColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
}

// Convert Tailwind bg color classes like "bg-[#B4213A]", "bg-purple-900" or raw hex "#432874" to CSS color value
export function getCssColorFromClass(colorClass?: string, fallback = "#7c3aed"): string {
  if (!colorClass) return fallback;
  const str = colorClass.trim();
  if (str.startsWith("#") || str.startsWith("rgb") || str.startsWith("hsl")) {
    return str;
  }
  // Match arbitrary hex bg-[#xxxxxx] or bg-[rgb(...)]
  const hexMatch = str.match(/bg-\[(#[a-fA-F0-9]{3,8}|[^\]]+)\]/);
  if (hexMatch) return hexMatch[1];

  // Tailwind standard color map fallback
  const map: Record<string, string> = {
    "bg-red-500": "#ef4444",
    "bg-red-600": "#dc2626",
    "bg-orange-500": "#f97316",
    "bg-orange-600": "#ea580c",
    "bg-amber-500": "#f59e0b",
    "bg-amber-600": "#d97706",
    "bg-emerald-500": "#10b981",
    "bg-emerald-600": "#059669",
    "bg-teal-500": "#14b8a6",
    "bg-teal-600": "#0d9488",
    "bg-sky-500": "#0ea5e9",
    "bg-sky-600": "#0284c7",
    "bg-blue-500": "#3b82f6",
    "bg-blue-600": "#2563eb",
    "bg-indigo-500": "#6366f1",
    "bg-indigo-600": "#4f46e5",
    "bg-purple-600": "#9333ea",
    "bg-purple-700": "#7e22ce",
    "bg-purple-900": "#581c87",
    "bg-violet-600": "#7c3aed",
    "bg-rose-600": "#e11d48",
  };

  return map[colorClass] || fallback;
}

export function useAverageColor(imageUrl?: string, fallbackSeed?: string, explicitColor?: string) {
  const [color, setColor] = useState<string | null>(explicitColor || null);

  useEffect(() => {
    if (explicitColor) {
      setColor(explicitColor);
      return;
    }
    if (!imageUrl) {
      setColor(fallbackSeed ? getDeterministicColor(fallbackSeed) : "#7c3aed");
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          if (isMounted) {
            setColor(`rgb(${r}, ${g}, ${b})`);
          }
        }
      } catch {
        if (isMounted) {
          setColor(fallbackSeed ? getDeterministicColor(fallbackSeed) : "#7c3aed");
        }
      }
    };

    img.onerror = () => {
      if (isMounted) {
        setColor(fallbackSeed ? getDeterministicColor(fallbackSeed) : "#7c3aed");
      }
    };

    return () => {
      isMounted = false;
    };
  }, [imageUrl, fallbackSeed, explicitColor]);

  return color || (fallbackSeed ? getDeterministicColor(fallbackSeed) : "#7c3aed");
}
