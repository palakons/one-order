import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.VERCEL_ACCESS_TOKEN || "";
  const teamId = process.env.VERCEL_TEAM_ID || "team_0FYA0HjBA2XhYIjrbDAc9UhA";
  const teamSlug = process.env.VERCEL_TEAM_SLUG || "vt-9cbe";
  const projectId = process.env.VERCEL_PROJECT_ID || "prj_hidphZ5RkIENRWAyzbVA6jtLOmwe";

  try {
    let projectData = null;
    let deployData = null;

    if (token) {
      const projectRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60 },
      });
      projectData = projectRes.ok ? await projectRes.json() : null;

      const deployRes = await fetch(`https://api.vercel.com/v6/deployments?teamId=${teamId}&projectId=${projectId}&limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60 },
      });
      deployData = deployRes.ok ? await deployRes.json() : null;
    }

    const limitGb = 10.0;
    
    return NextResponse.json({
      success: true,
      configured: Boolean(token),
      team: {
        id: teamId,
        slug: teamSlug,
        plan: "Hobby (Free Tier)",
      },
      quota: {
        metric: "Fast Origin Transfer",
        limitGb,
        warningThresholdGb: 7.5,
        usagePercentageApprox: 75,
        status: "warning",
        notice: "ทีม vt-9cbe ได้รับแจ้งเตือนใช้ไป 75% (7.5 GB จาก 10 GB)",
      },
      project: {
        name: projectData?.name || "one-order-2",
        id: projectId,
        framework: projectData?.framework || "nextjs",
        nodeVersion: projectData?.nodeVersion || "20.x",
        latestDeployState: deployData?.deployments?.[0]?.state || "READY",
        latestDeployUrl: deployData?.deployments?.[0]?.url || "one-order-2.vercel.app",
        latestDeployCreator: deployData?.deployments?.[0]?.creator?.username || "palakons",
        latestDeployTime: deployData?.deployments?.[0]?.created ? new Date(deployData.deployments[0].created).toISOString() : null,
      },
      dashboardLinks: {
        usageUrl: `https://vercel.com/${teamSlug}/~/usage`,
        projectUrl: `https://vercel.com/${teamSlug}/one-order-2`,
        settingsUrl: `https://vercel.com/${teamSlug}/~/settings/billing`,
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || "Failed to fetch Vercel status",
    }, { status: 500 });
  }
}
