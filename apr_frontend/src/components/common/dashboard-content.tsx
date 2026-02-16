"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  Upload,
  Sparkles,
  File,
  Clock,
  MessageSquare,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { papersApi } from "@/lib/api";
import { usePapersStore } from "@/store";
import type { Paper } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface DashboardContentProps {
  initialPapers: Paper[];
  error: string | null;
}

export function DashboardContent({ initialPapers, error }: DashboardContentProps) {
  const router = useRouter();
  const { papers, setPapers, addPaper, removePaper } = usePapersStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const displayPapers = (papers?.length > 0 ? papers : initialPapers) || [];

  const filteredPapers = displayPapers.filter((paper) =>
    (paper.title || paper.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const paper = await papersApi.upload(file);
      addPaper(paper);
      toast.success("Paper uploaded successfully!");
      router.push(`/reader/${paper.id}`);
    } catch (error) {
      toast.error("Failed to upload paper. Please try again.");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, paperId: string) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDeleting(paperId);
    try {
      await papersApi.delete(paperId);
      removePaper(paperId);
      toast.success("Paper deleted");
    } catch (error) {
      toast.error("Failed to delete paper");
    } finally {
      setIsDeleting(null);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-6 py-12">
        <Card className="max-w-md mx-auto border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (displayPapers.length === 0) {
    return (
      <EmptyState isUploading={isUploading} onUpload={handleUpload} />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="container mx-auto px-6 py-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your Papers</h1>
          <p className="text-muted-foreground mt-1">
            {displayPapers.length} paper{displayPapers.length !== 1 ? "s" : ""} in your library
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filter papers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 rounded-full bg-muted/50 border-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Papers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPapers.map((paper, index) => (
          <motion.div
            key={paper.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <Link href={`/reader/${paper.id}`}>
              <Card className="group aspect-[3/4] flex flex-col overflow-hidden cursor-pointer hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
                {/* Thumbnail */}
                <div className="relative flex-1 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 flex items-center justify-center overflow-hidden">
                  {paper.thumbnail_url ? (
                    <img
                      src={paper.thumbnail_url}
                      alt={paper.title || paper.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-16 h-16 text-indigo-200 dark:text-indigo-800" />
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" className="rounded-full">
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full"
                      onClick={(e) => handleDelete(e, paper.id)}
                      disabled={isDeleting === paper.id}
                    >
                      {isDeleting === paper.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {paper.title || paper.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(paper.upload_date || "")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {paper.notes_count ?? 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}

        {/* Upload Card */}
        <label className="cursor-pointer">
          <Card className="aspect-[3/4] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-all duration-300 group">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Upload Paper
            </span>
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              disabled={isUploading}
              className="hidden"
            />
          </Card>
        </label>
      </div>
    </motion.div>
  );
}

function EmptyState({
  isUploading,
  onUpload,
}: {
  isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6 max-w-md"
      >
        {/* Animated Icon */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="inline-flex"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-indigo-500" />
          </div>
        </motion.div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome to AI Paper Reader
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload your first paper to get started. Read, annotate, and ask AI for explanations.
          </p>
        </div>

        {/* CTA */}
        <label className="inline-block">
          <Button
            size="lg"
            className="rounded-full px-8 gap-2 bg-indigo-600 hover:bg-indigo-700 text-base"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload First Paper
              </>
            )}
          </Button>
          <input
            type="file"
            accept=".pdf"
            onChange={onUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>

        <p className="text-xs text-muted-foreground">Supports PDF files</p>
      </motion.div>
    </div>
  );
}
