"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Loader2,
  Highlighter,
  Undo2,
  Redo2,
  Sidebar,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pdfApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Highlight } from "@/lib/types";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  paperId: string;
}

export function PdfViewer({ paperId }: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const pdfUrlRef = useRef<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightHistory, setHighlightHistory] = useState<Highlight[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Highlight[][]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const blob = await pdfApi.getBlob(paperId);
        const url = URL.createObjectURL(blob);
        if (mounted) {
          pdfUrlRef.current = url;
          setPdfUrl(url);
        }
      } catch (err) {
        if (mounted) {
          setError("Failed to load PDF");
          console.error("PDF load error:", err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      mounted = false;
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, [paperId]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    pageRefs.current = Array(numPages).fill(null);
  }, []);


  const scrollToPage = (page: number) => {
    if (pageRefs.current[page - 1]) {
      pageRefs.current[page - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(page);
    }
  };

  const handlePageScroll = useCallback(() => {
    if (!containerRef.current || numPages === 0) return;
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const pageHeight = container.scrollHeight / numPages;
    const newCurrentPage = Math.min(Math.max(1, Math.ceil(scrollTop / pageHeight)), numPages);
    if (newCurrentPage !== currentPage) {
      setCurrentPage(newCurrentPage);
    }
  }, [numPages, currentPage]);

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  // Handle text selection for highlighting
  const handleTextSelection = useCallback(() => {
    if (!isHighlightMode) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    const position = {
      x: rect.left - containerRect.left + containerRef.current.scrollLeft,
      y: rect.top - containerRect.top + containerRef.current.scrollTop,
      width: rect.width,
      height: rect.height,
    };

    const newHighlight: Highlight = {
      id: `highlight-${Date.now()}`,
      page: currentPage,
      text: text.slice(0, 100),
      color: "#fef08a",
      position,
    };

    // Save to history for undo and clear redo
    setHighlightHistory((prev) => [...prev, highlights]);
    setRedoHistory([]);
    setHighlights((prev) => [...prev, newHighlight]);
    selection.removeAllRanges();
  }, [isHighlightMode, currentPage, highlights]);

  const undoHighlight = useCallback(() => {
    if (highlightHistory.length === 0) return;
    const previousState = highlightHistory[highlightHistory.length - 1];
    setRedoHistory((prev) => [...prev, highlights]);
    setHighlights(previousState);
    setHighlightHistory((prev) => prev.slice(0, -1));
  }, [highlightHistory, highlights]);

  const redoHighlight = useCallback(() => {
    if (redoHistory.length === 0) return;
    const nextState = redoHistory[redoHistory.length - 1];
    setHighlightHistory((prev) => [...prev, highlights]);
    setHighlights(nextState);
    setRedoHistory((prev) => prev.slice(0, -1));
  }, [redoHistory, highlights]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoHighlight();
      }
      // Redo: Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && (e.key === "Z" || (e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        redoHighlight();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undoHighlight, redoHighlight]);

  const getHighlightsForPage = (pageNum: number) => highlights.filter((h) => h.page === pageNum);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || "Failed to load PDF"}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex bg-muted/30">
        {/* Sidebar - Page Thumbnails */}
        {showSidebar && (
          <div className="w-40 border-r bg-background flex flex-col shrink-0">
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pages</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSidebar(false)}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {pdfUrl && (
                  <Document file={pdfUrl} loading={null}>
                    {Array.from(new Array(numPages), (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => scrollToPage(pageNum)}
                        className={cn(
                          "w-full aspect-[3/4] rounded-lg border-2 transition-all relative overflow-hidden bg-white",
                          currentPage === pageNum ? "border-indigo-500 ring-2 ring-indigo-200" : "border-transparent hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                          <Page
                            pageNumber={pageNum}
                            scale={0.15}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="max-w-full max-h-full"
                          />
                        </div>
                        {currentPage === pageNum && (
                          <div className="absolute bottom-0 left-0 right-0 bg-indigo-500 text-white text-xs py-0.5">
                            {pageNum}
                          </div>
                        )}
                      </button>
                    ))}
                  </Document>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-background/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2">
              {!showSidebar && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSidebar(true)}>
                  <Sidebar className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {currentPage} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage >= numPages}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={zoomOut} className="h-8 w-8">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>
              <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={zoomIn} className="h-8 w-8">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1">
              {/* Undo */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={undoHighlight}
                    disabled={highlightHistory.length === 0}
                    className="h-8 w-8"
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>

              {/* Redo */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={redoHighlight}
                    disabled={redoHistory.length === 0}
                    className="h-8 w-8"
                  >
                    <Redo2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
              </Tooltip>

              {/* Highlight Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isHighlightMode ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setIsHighlightMode(!isHighlightMode)}
                    className={cn("h-8 w-8", isHighlightMode && "bg-yellow-500 hover:bg-yellow-600")}
                  >
                    <Highlighter className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Highlight</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={rotate} className="h-8 w-8">
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fullscreen</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Highlight Mode Banner */}
          {isHighlightMode && (
            <div className="px-4 py-1.5 bg-yellow-50 dark:bg-yellow-950/30 border-b text-xs text-yellow-800 dark:text-yellow-200 flex items-center justify-between">
              <span>Highlight Mode - Select text to highlight</span>
              <span>{highlights.length} highlight{highlights.length !== 1 ? "s" : ""}</span>
            </div>
          )}

          {/* PDF Content */}
          <div
            ref={containerRef}
            className={cn("flex-1 overflow-auto", isHighlightMode && "cursor-text")}
            onScroll={handlePageScroll}
            onMouseUp={handleTextSelection}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4 p-8"
            >
              <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
                {Array.from(new Array(numPages), (_, index) => (
                  <div
                    key={`page-${index + 1}`}
                    ref={(el) => { pageRefs.current[index] = el; }}
                    className="flex justify-center relative"
                  >
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      rotate={rotation}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      className="shadow-lg"
                    />

                    {/* Render Highlights */}
                    {getHighlightsForPage(index + 1).map((highlight) => (
                      <div
                        key={highlight.id}
                        className="absolute pointer-events-none rounded-sm bg-yellow-400/40"
                        style={{
                          left: highlight.position.x / scale,
                          top: highlight.position.y / scale,
                          width: highlight.position.width / scale,
                          height: highlight.position.height / scale,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </Document>
            </motion.div>
          </div>

          {/* Page Slider */}
          <div className="flex items-center gap-3 px-4 py-2 border-t bg-background/80 backdrop-blur-sm shrink-0">
            <span className="text-xs text-muted-foreground">1</span>
            <input
              type="range"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => scrollToPage(parseInt(e.target.value))}
              className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-xs text-muted-foreground">{numPages}</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
