"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  FileText,
  Clock,
  MessageSquare,
  X,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { papersApi } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import type { Paper } from "@/lib/types";
import toast from "react-hot-toast";

export default function HomePage() {
  const router = useRouter();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch papers when search is focused
  useEffect(() => {
    if (isSearchFocused && !hasInitialized) {
      const fetchPapers = async () => {
        setIsLoading(true);
        try {
          const fetchedPapers = await papersApi.list();
          setPapers(fetchedPapers);
          setHasInitialized(true);
        } catch (error) {
          console.error("Failed to fetch papers:", error);
          toast.error("Failed to load papers");
        } finally {
          setIsLoading(false);
        }
      };
      fetchPapers();
    }
  }, [isSearchFocused, hasInitialized]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter papers based on search query
  const filteredPapers = papers.filter(
    (paper) =>
      (paper.title || paper.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (paper.author || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePaperClick = (paperId: string) => {
    router.push(`/reader/${paperId}`);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-start px-6 pt-8">
      <div className="w-full max-w-lg space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-5">
          <div className="inline-flex">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-500" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">AI Paper Reader</h1>
            <p className="text-muted-foreground text-sm">
              Read, annotate, and ask AI for explanations about your research papers.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div ref={searchRef} className="relative w-full">
          <div
            className={cn(
              "relative flex items-center transition-all duration-300",
              isSearchFocused ? "scale-[1.02]" : ""
            )}
          >
            <Search
              className={cn(
                "absolute left-3 w-4 h-4 transition-colors",
                isSearchFocused ? "text-indigo-500" : "text-muted-foreground"
              )}
            />
            <Input
              type="text"
              placeholder="Search your papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className={cn(
                "pl-10 pr-10 h-10 text-sm rounded-xl border-2 transition-all duration-300",
                isSearchFocused
                  ? "border-indigo-500 shadow-lg shadow-indigo-500/20"
                  : "border-transparent bg-muted/50 hover:bg-muted/70"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {isSearchFocused && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-background rounded-2xl border shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="ml-2 text-muted-foreground">Loading papers...</span>
                  </div>
                ) : filteredPapers.length > 0 ? (
                  <div className="py-2">
                    {filteredPapers.map((paper, index) => (
                      <motion.button
                        key={paper.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handlePaperClick(paper.id)}
                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-indigo-500 transition-colors">
                            {paper.title || paper.name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(paper.upload_date || "")}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {paper.notes_count ?? 0}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : papers.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No papers yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Upload papers from the dashboard to see them here
                    </p>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No papers match "{searchQuery}"</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
