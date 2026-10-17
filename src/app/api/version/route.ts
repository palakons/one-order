import { NextResponse } from "next/server";
import { execSync } from "child_process";

function getBuildInfo() {
  let commitHash = process.env.NEXT_PUBLIC_GIT_COMMIT || "";
  let commitDate = "";
  let commitMessage = "";

  try {
    commitHash = execSync("git rev-parse --short HEAD").toString().trim();
    commitDate = execSync('git log -1 --format="%cd" --date=format:"%d %b %H:%M"').toString().trim();
    commitMessage = execSync('git log -1 --format="%s"').toString().trim();
  } catch {
    commitHash = commitHash || "unknown";
    commitDate = new Date().toISOString();
  }

  return {
    version: commitHash,
    commitHash,
    commitDate,
    commitMessage,
    builtAt: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  };
}

export async function GET() {
  const info = getBuildInfo();
  return NextResponse.json(info, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
