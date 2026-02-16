"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { MessageSquare, ChevronLeft, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/reader/pdf-viewer";
import { NotesEditor } from "@/components/notes/notes-editor";
import { AiAssistant } from "@/components/ai/ai-assistant";
import { useChatStore, useNotesStore } from "@/store";
import type { PaperDetails } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReaderContentProps {
  paper: PaperDetails;
  initialNotes: string;
}

export function ReaderContent({ paper, initialNotes }: ReaderContentProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const { setContent: setNotesContent } = useNotesStore();
  const { createSession } = useChatStore();

  useEffect(() => {
    setNotesContent(initialNotes);
    createSession(paper.id);
  }, [paper.id, initialNotes, setNotesContent, createSession]);

  return (
    <div className="h-full">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h1 className="text-sm font-medium truncate max-w-[200px]">{paper.title || paper.name || paper.id}</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAiOpen(!aiOpen)}
          className={cn(aiOpen && "bg-indigo-50 dark:bg-indigo-950")}
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>

      <div className="h-[calc(100vh-3.5rem)] lg:h-full">
        <PanelGroup direction="horizontal" className="h-full">
          {/* PDF Viewer - Left Panel */}
          <Panel defaultSize={60} minSize={30}>
            <div className="h-full overflow-hidden">
              <PdfViewer paperId={paper.id} />
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Notes Editor - Right Panel */}
          <Panel defaultSize={40} minSize={20}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={60} minSize={30}>
                <div className="h-full overflow-hidden border-l">
                  <NotesEditor paperId={paper.id} />
                </div>
              </Panel>

              {/* AI Assistant - Collapsible Bottom on Desktop, Toggle on Mobile */}
              <AnimatePresence>
                {aiOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "40%", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t overflow-hidden lg:hidden"
                  >
                    <AiAssistant paperId={paper.id} />
                  </motion.div>
                )}
              </AnimatePresence>
            </PanelGroup>
          </Panel>

          {/* AI Assistant - Side Panel on Desktop */}
          <AnimatePresence>
            {aiOpen && (
              <>
                <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors hidden lg:block" />
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "35%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="hidden lg:block h-full overflow-hidden"
                >
                  <AiAssistant paperId={paper.id} />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </PanelGroup>
      </div>

      {/* Floating AI Toggle - Desktop */}
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-6 right-6 rounded-full w-12 h-12 shadow-lg bg-indigo-600 hover:bg-indigo-700 lg:flex items-center justify-center"
        onClick={() => setAiOpen(!aiOpen)}
      >
        {aiOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </Button>
    </div>
  );
}
