"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Save, Eye, Edit3, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { notesApi } from "@/lib/api";
import { useNotesStore, useChatStore } from "@/store";
import { debounce, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface NotesEditorProps {
  paperId: string;
}

export function NotesEditor({ paperId }: NotesEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const { content, setContent, isSaving, setSaving, lastSaved, setLastSaved } = useNotesStore();
  const { addMessage, currentSessionId } = useChatStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (paperId: string, content: string) => {
      setSaving(true);
      try {
        await notesApi.save(paperId, content);
        setLastSaved(Date.now());
        toast.success("Notes saved", { icon: "✓" });
      } catch (error) {
        console.error("Save error:", error);
        toast.error("Failed to save notes");
      } finally {
        setSaving(false);
      }
    }, 1500),
    []
  );

  // Auto-save on content change
  useEffect(() => {
    if (content) {
      debouncedSave(paperId, content);
    }
  }, [content, paperId, debouncedSave]);

  // Manual save
  const handleSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaving(true);
    try {
      await notesApi.save(paperId, content);
      setLastSaved(Date.now());
      toast.success("Notes saved");
    } catch (error) {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  // Copy notes to AI
  const handleCopyToAI = () => {
    if (currentSessionId) {
      addMessage(currentSessionId, {
        id: `temp-${Date.now()}`,
        role: "user",
        content: `Here's my notes on this paper:\n\n${content}`,
        timestamp: Date.now(),
      });
      toast.success("Copied to AI chat");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return "";
    const diff = Date.now() - lastSaved;
    if (diff < 60000) return "Saved just now";
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`;
    return `Saved ${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Notes</h2>
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
          {!isSaving && lastSaved && (
            <span className="text-xs text-muted-foreground">{formatLastSaved()}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy notes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCopyToAI} className="h-8 w-8">
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy to AI</TooltipContent>
          </Tooltip>
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Editor/Preview Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 w-auto">
          <TabsTrigger value="edit" className="gap-1">
            <Edit3 className="w-3 h-3" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1">
            <Eye className="w-3 h-3" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="flex-1 m-0 p-0">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            value={content}
            onChange={(value) => setContent(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineHeight: 1.6,
              wordWrap: "on",
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              renderLineHighlight: "none",
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
            }}
          />
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*No notes yet*"}</ReactMarkdown>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
