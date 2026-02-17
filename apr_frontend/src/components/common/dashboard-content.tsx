"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  Upload,
  Sparkles,
  File,
  Clock,
  StickyNote,
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PaperCardProps {
  paper: Paper;
  index: number;
}

function PaperCard({ paper, index }: PaperCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Full URL for thumbnail - prepend API base URL if relative path
  const thumbnailSrc = paper.thumbnail_url
    ? paper.thumbnail_url.startsWith("http")
      ? paper.thumbnail_url
      : `${API_URL}${paper.thumbnail_url}`
    : null;

  const hasThumbnail = thumbnailSrc && !imageError;

  // Reset error state when thumbnail_url changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(false);
  }, [paper.thumbnail_url]);

  const title = paper.title || paper.name || "Untitled";
  const firstLetter = title.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/reader/${paper.id}`}>
        <Card
          className="group aspect-[3/4] flex flex-col overflow-hidden cursor-pointer hover:shadow-apple-lg transition-all duration-300 hover:-translate-y-1 border-border/50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Thumbnail - fixed aspect ratio container */}
          <div className="relative flex-1 min-h-[140px] bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 flex items-center justify-center overflow-hidden">
            {imageLoading && (
              <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
              </div>
            )}

            {hasThumbnail ? (
              <img
                src={thumbnailSrc}
                alt={title}
                className="w-full h-full object-cover"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
                onLoadStart={() => setImageLoading(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50">
                <div className="w-20 h-20 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-4xl font-bold text-indigo-600 dark:text-indigo-300">
                  {firstLetter}
                </div>
              </div>
            )}

            {/* Hover Overlay - visual feedback on hover, click navigates to reader */}
            <div
              className={cn(
                "absolute inset-0 z-10 bg-black/30 transition-opacity",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            />
          </div>

          {/* Info */}
          <CardContent className="p-4 space-y-2">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(paper.upload_date || "")}
              </span>
              <span className="flex items-center gap-1">
                <StickyNote className="w-3 h-3" />
                {paper.notes_count ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

interface DashboardContentProps {
  initialPapers: Paper[];
  error: string | null;
}

export function DashboardContent({ initialPapers, error }: DashboardContentProps) {
  const router = useRouter();
  const { papers, setPapers, addPaper } = usePapersStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

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
        {/* Upload Card - First position */}
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

        {/* Paper Cards */}
        {filteredPapers.map((paper, index) => (
          <PaperCard
            key={paper.id}
            paper={paper}
            index={index}
          />
        ))}
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
