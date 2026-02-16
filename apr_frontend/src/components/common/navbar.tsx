"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Sparkles, Search, Upload, Moon, Sun, LayoutDashboard } from "lucide-react";
import { useUIStore, usePapersStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { setSidebarOpen, themeToggleOpen, setThemeToggleOpen } = useUIStore();
  const { addPaper } = usePapersStore();
  const [mounted, setMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          const { papersApi } = await import("@/lib/api");
          const paper = await papersApi.upload(file);
          addPaper(paper);
          router.push(`/dashboard`);
        } catch (error) {
          console.error("Upload failed:", error);
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-subtle">
      <div className="flex h-14 items-center px-4 lg:px-6">
        {/* Logo & Title */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md group-hover:shadow-lg transition-shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight">AI Paper Reader</span>
        </Link>

        {/* Search - Center */}
        <div className="flex-1 flex justify-center px-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search papers..."
              className="w-full h-9 pl-9 pr-4 rounded-full bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Dashboard Link */}
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>

          {/* Upload Button */}
          <Button
            variant="default"
            size="sm"
            className="rounded-full gap-2 bg-indigo-600 hover:bg-indigo-700"
            onClick={handleUpload}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-9 h-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all" />
            ) : (
              <Moon className="w-4 h-4 rotate-0 scale-100 transition-all" />
            )}
          </Button>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-indigo-200 dark:border-indigo-800">
                  <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium">
                    JD
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">John Doe</p>
                  <p className="text-xs leading-none text-muted-foreground">john@example.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
