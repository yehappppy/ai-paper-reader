"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { pdfApi } from "@/lib/api";
import { cn } from "@/lib/utils";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  paperId: string;
}

export function PdfViewer({ paperId }: PdfViewerProps) {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const blob = await pdfApi.getBlob(paperId);
        const arrayBuffer = await blob.arrayBuffer();
        if (mounted) {
          setPdfData(arrayBuffer);
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
    };
  }, [paperId]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const pdfFile = useMemo(() => ({ data: pdfData as ArrayBuffer | undefined }), [pdfData]);

  // Handle scroll to detect current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current || numPages === 0) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const pageHeight = container.scrollHeight / numPages;
    const newCurrentPage = Math.min(
      Math.max(1, Math.ceil(scrollTop / pageHeight)),
      numPages
    );

    if (newCurrentPage !== currentPage) {
      setCurrentPage(newCurrentPage);
    }
  }, [numPages, currentPage]);

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const scrollToPage = (page: number) => {
    if (!containerRef.current || numPages === 0) return;
    const pageHeight = containerRef.current.scrollHeight / numPages;
    containerRef.current.scrollTop = (page - 1) * pageHeight;
  };

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

  if (error || !pdfData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || "Failed to load PDF"}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-muted/30">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background/80 backdrop-blur-sm shrink-0">
          {/* Page Indicator */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {numPages}
            </span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={zoomOut}>
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
                <Button variant="ghost" size="icon" onClick={zoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </div>

          {/* Other Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={rotate}>
                  <RotateCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rotate</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* PDF Content - Continuous Scroll */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4"
          onScroll={handleScroll}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            <Document
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              }
            >
              {Array.from(new Array(numPages), (_, index) => (
                <div
                  key={`page-${index + 1}`}
                  className="flex justify-center"
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    rotate={rotation}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-lg rounded-lg overflow-hidden"
                  />
                </div>
              ))}
            </Document>
          </motion.div>
        </div>

        {/* Page Jump Slider */}
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
    </TooltipProvider>
  );
}
