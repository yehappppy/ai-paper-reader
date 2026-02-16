import Link from "next/link";
import { FileText, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-lg">
        {/* Animated Icon */}
        <div className="inline-flex">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-indigo-500" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            AI Paper Reader
          </h1>
          <p className="text-muted-foreground text-lg">
            Read, annotate, and ask AI for explanations about your research papers.
          </p>
        </div>

        {/* CTA */}
        <div className="pt-4">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="rounded-full px-8 gap-2 bg-indigo-600 hover:bg-indigo-700 text-base"
            >
              <FileText className="w-5 h-5" />
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
