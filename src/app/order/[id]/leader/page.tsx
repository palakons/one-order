import { Suspense } from "react";
import { connection } from "next/server";
import { getBatchById } from "@/lib/store";
import LeaderPageClient from "./LeaderPageClient";

interface Props {
  params: Promise<{ id: string }>;
}

async function LeaderPageLoader({ params }: Props) {
  await connection();
  const { id } = await params;
  try {
    // Unsanitized batch for leader role so phone numbers and full order details are accessible
    const initialBatch = await getBatchById(id, false);
    return <LeaderPageClient batchId={id} initialBatch={initialBatch || null} />;
  } catch (err) {
    console.error("LeaderPageLoader error:", err);
    return <LeaderPageClient batchId={id} initialBatch={null} />;
  }
}

export default function LeaderPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">
          กำลังโหลดแผงควบคุมหัวหน้าตี้...
        </div>
      }
    >
      <LeaderPageLoader params={params} />
    </Suspense>
  );
}
