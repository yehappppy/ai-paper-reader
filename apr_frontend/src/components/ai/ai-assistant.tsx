"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Loader2, Sparkles, X, MessageSquare, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHotkeys } from "react-hotkeys-hook";
import { chatApi } from "@/lib/api";
import { useChatStore } from "@/store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface AiAssistantProps {
  paperId: string;
}

const SUGGESTIONS = [
  "Summarize this paper",
  "Explain the methodology",
  "What are the main contributions?",
  "What are the limitations?",
];

export function AiAssistant({ paperId }: AiAssistantProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    getCurrentSession,
    addMessage,
    setOpen,
    isOpen,
  } = useChatStore();

  const currentSession = getCurrentSession();

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSession?.messages]);

  // Focus input with Cmd+K
  useHotkeys("mod+k", () => {
    inputRef.current?.focus();
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    if (!currentSession) return;

    // Add user message
    addMessage(currentSession.id, {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    });

    setIsLoading(true);

    try {
      const response = await chatApi.send(paperId, userMessage);

      // Add assistant message
      addMessage(currentSession.id, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = currentSession?.messages || [];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-sm font-medium">AI Assistant</h2>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Ask anything about this paper</p>
                <p className="text-xs text-muted-foreground">
                  I can summarize, explain concepts, or answer questions
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Lightbulb className="w-3 h-3 mr-1" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center",
                      message.role === "user"
                        ? "bg-indigo-600"
                        : "bg-gradient-to-br from-indigo-500 to-purple-500"
                    )}
                  >
                    {message.role === "user" ? (
                      <span className="text-xs text-white font-medium">JD</span>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 max-w-[80%] text-sm",
                      message.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-muted"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this paper..."
            className="flex-1 rounded-full"
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="rounded-full bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">⌘</kbd> +{" "}
          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">K</kbd> to focus
        </p>
      </div>
    </div>
  );
}
