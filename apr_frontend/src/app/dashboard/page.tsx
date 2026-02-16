import { Suspense } from "react";
import { papersApi } from "@/lib/api";
import { DashboardContent } from "@/components/common/dashboard-content";
import type { Paper } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let papers: Paper[] = [];
  let error: string | null = null;

  try {
    papers = await papersApi.list();
  } catch (e) {
    error = "Failed to load papers. Please make sure the backend is running.";
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent initialPapers={papers} error={error} />
      </Suspense>
    </div>
  );
}

function DashboardContentSkeleton() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-muted rounded-lg w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
