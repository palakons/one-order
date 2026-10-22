"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";

export default function VersionBadge() {
  const clientCommit = process.env.NEXT_PUBLIC_GIT_COMMIT || "dev";
  const clientBuildTime = process.env.NEXT_PUBLIC_BUILD_TIME || "";

  const [serverCommit, setServerCommit] = useState<string | null>(null);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Only query backend version ONCE on initial page load / refresh
    const checkVersion = async () => {
      try {
        const res = await fetch("/api/version");
        if (!res.ok) return;
        const data = await res.json();
        if (data.commitHash) {
          setServerCommit(data.commitHash);
          // If server commit is known and differs from client bundle commit
          if (
            clientCommit !== "dev" &&
            data.commitHash !== "unknown" &&
            data.commitHash !== clientCommit
          ) {
            setHasNewVersion(true);
          }
        }
      } catch {
        // network or offline
      }
    };

    checkVersion();
  }, [clientCommit]);

  const handleHardRefresh = () => {
    setIsRefreshing(true);
    // Bust browser cache and hard reload
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  };

  const copyVersionInfo = () => {
    const text = `VEATEC Build: ${clientCommit}${clientBuildTime ? ` (${clientBuildTime})` : ""} | Server: ${serverCommit || "syncing"}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* 1. Floating Upgrade Alert Bar (Shows when Client is outdated compared to Server) */}
      {hasNewVersion && (
        <aside
          aria-label="New version available"
          className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 z-50 flex items-center justify-between gap-3 bg-purple-950 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl border border-purple-500/40 animate-in slide-in-from-bottom-3 duration-300 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-300">มีอัปเดตใหม่! </span>
              <span className="text-purple-200 hidden sm:inline">
                ({clientCommit} → {serverCommit})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleHardRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-purple-950 px-3 py-1 rounded-xl text-xs font-black transition-all active:scale-95 shrink-0 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "กำลังโหลด..." : "อัปเดตเลย"}</span>
          </button>
        </aside>
      )}

      {/* 2. Tiny Discreet Footer Badge */}
      <footer className="w-full py-4 px-2 flex flex-col items-center justify-center text-center space-y-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-2 flex-wrap justify-center font-mono">
          <button
            type="button"
            onClick={copyVersionInfo}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer border border-slate-200"
            title="แตะเพื่อคัดลอก Build Info"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700 font-bold">คัดลอกแล้ว</span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold text-purple-900">vEATec</span>
                <span>•</span>
                <span className="font-bold text-slate-800">{clientCommit}</span>
                {clientBuildTime && <span className="text-slate-400 hidden sm:inline">({clientBuildTime})</span>}
              </>
            )}
          </button>

          <a
            href="/api/version"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-400 hover:text-slate-600 hover:underline"
            title="เปิดดู API Version Info"
          >
            api/version
          </a>
        </div>
      </footer>
    </>
  );
}
