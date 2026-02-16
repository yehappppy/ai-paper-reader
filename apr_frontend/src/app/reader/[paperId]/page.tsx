import { papersApi, notesApi } from "@/lib/api";
import { ReaderContent } from "@/components/reader/reader-content";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ paperId: string }>;
}

export default async function ReaderPage({ params }: PageProps) {
  const { paperId } = await params;

  let paper = null;
  let notes = "";

  try {
    paper = await papersApi.get(paperId);
  } catch (error) {
    console.error("Failed to load paper:", error);
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load paper. Please try again.</p>
      </div>
    );
  }

  try {
    notes = await notesApi.get(paperId);
  } catch (error) {
    // Notes are optional, continue without them
    console.warn("No notes found for paper:", paperId);
    notes = "";
  }

  return <ReaderContent paper={paper} initialNotes={notes} />;
}
