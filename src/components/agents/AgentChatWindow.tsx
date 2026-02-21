import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  Cpu,
  ChevronRight,
  Brain,
  Image,
  X,
  ArrowRight,
  ChevronDown,
  Plus,
} from "lucide-react";
import { useEffect, useRef, memo, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useTauriDragDrop } from "@/hooks/useTauriDragDrop";
import { cn } from "@/lib/utils";
import { useActiveSession, agentActions } from "@/stores/agentStore";
import { AVAILABLE_MODELS } from "@/services/agent/providers";
import { loadCredential } from "@/services/agent/AgentService";
import { CodeBlock } from "./CodeBlock";
import { ToolExecutionList } from "./ToolExecutionList";
import { ImageAttachment } from "@/types/chat";
import { getIDEState, useIDEState } from "@/stores/ideStore";
import {
  getCachedServerStatus,
  subscribeToServerReady,
} from "@/services/agentServer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AgentChatWindowProps {
  compact?: boolean;
  isSidebarCollapsed?: boolean;
}

// Types for subagent selection
interface SubagentInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// ============================================
// ISOLATED INPUT COMPONENT - CRITICAL FOR PERF
// Uses uncontrolled input to avoid re-renders
// ============================================
interface ChatInputAreaProps {
  compact: boolean;
  isLoading: boolean;
  onSend: (message: string, images?: ImageAttachment[]) => void;
  activeSessionId?: string;
  activeSessionModel?: string;
  selectedSubagent: string | null;
  onSubagentChange: (id: string | null) => void;
  subagents: SubagentInfo[];
}

const ChatInputArea = memo(function ChatInputArea({
  compact,
  isLoading,
  onSend,
  activeSessionId,
  activeSessionModel,
  selectedSubagent,
  onSubagentChange,
  subagents,
}: ChatInputAreaProps) {
  // Use uncontrolled input with ref - NO STATE = NO RE-RENDERS
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasContent, setHasContent] = useState(false);
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const value = inputRef.current?.value.trim() || "";
        if ((value || pendingImages.length > 0) && !isLoading) {
          onSend(
            value || "Analyze this image",
            pendingImages.length > 0 ? pendingImages : undefined,
          );
          if (inputRef.current) {
            inputRef.current.value = "";
            setHasContent(false);
          }
          setPendingImages([]);
        }
      }
    },
    [isLoading, onSend, pendingImages],
  );

  const handleSendClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const value = inputRef.current?.value.trim() || "";
      if ((value || pendingImages.length > 0) && !isLoading) {
        onSend(
          value || "Analyze this image",
          pendingImages.length > 0 ? pendingImages : undefined,
        );
        if (inputRef.current) {
          inputRef.current.value = "";
          setHasContent(false);
        }
        setPendingImages([]);
      }
    },
    [isLoading, onSend, pendingImages],
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setPendingImages((prev) => [
            ...prev,
            {
              base64,
              mimeType: file.type,
              filename: file.name,
            },
          ]);
        };
        reader.readAsDataURL(file);
      });

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [],
  );

  const removeImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ============================================
  // NATIVE TAURI DRAG-DROP INTEGRATION
  // Uses Tauri's native onDragDropEvent for cross-platform support
  // Falls back to HTML5 drag-drop when Tauri is not available
  // ============================================

  // Handler for images dropped via Tauri native events
  const handleTauriImagesDrop = useCallback((images: ImageAttachment[]) => {
    console.log("[ChatInput] Tauri native drop - images:", images.length);
    setPendingImages((prev) => [...prev, ...images]);
  }, []);

  // Handler for Tauri drag-drop errors
  const handleTauriDropError = useCallback((error: string) => {
    console.error("[ChatInput] Tauri drop error:", error);
    // Could show a toast notification here
  }, []);

  // Use Tauri native drag-drop hook
  const {
    isDragging: isTauriDragging,
    draggedImagePaths,
    isAvailable: isTauriDragDropAvailable,
  } = useTauriDragDrop({
    enabled: true,
    maxFileSizeMB: 10,
    onImagesDrop: handleTauriImagesDrop,
    onError: handleTauriDropError,
  });

  // HTML5 fallback state (used when Tauri is not available)
  const [isHtml5Dragging, setIsHtml5Dragging] = useState(false);
  const dragCounter = useRef(0);

  // Combined isDragging state
  const isDragging = isTauriDragging || isHtml5Dragging;

  // HTML5 fallback handlers (only active when Tauri drag-drop is not available)
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only use HTML5 fallback if Tauri is not available
      if (!isTauriDragDropAvailable) {
        dragCounter.current++;
        if (e.dataTransfer.types.includes("Files")) {
          setIsHtml5Dragging(true);
        }
      }
    },
    [isTauriDragDropAvailable],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isTauriDragDropAvailable) {
        dragCounter.current--;
        if (dragCounter.current === 0) {
          setIsHtml5Dragging(false);
        }
      }
    },
    [isTauriDragDropAvailable],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only use HTML5 fallback if Tauri is not available
      if (!isTauriDragDropAvailable) {
        setIsHtml5Dragging(false);
        dragCounter.current = 0;

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        console.log("[ChatInput] HTML5 fallback drop - files:", files.length);

        Array.from(files).forEach((file) => {
          if (!file.type.startsWith("image/")) return;

          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            setPendingImages((prev) => [
              ...prev,
              {
                base64,
                mimeType: file.type,
                filename: file.name,
              },
            ]);
          };
          reader.readAsDataURL(file);
        });
      }
      // When Tauri is available, the native handler processes the drop
    },
    [isTauriDragDropAvailable],
  );

  const handleInput = useCallback(() => {
    const hasText = !!inputRef.current?.value.trim();
    if (hasText !== hasContent) {
      setHasContent(hasText);
    }
  }, [hasContent]);

  const handleModelChange = useCallback(
    (modelId: string) => {
      if (activeSessionId) {
        agentActions.updateSessionModel(activeSessionId, modelId);
      }
    },
    [activeSessionId],
  );

  return (
    <div
      className={cn(
        "shrink-0",
        compact ? "bg-card border-t border-border" : "p-3 sm:p-5",
      )}
    >
      <div className="max-w-4xl mx-auto w-full relative">
        <div
          className={cn(
            "relative transition-colors duration-200",
            compact
              ? "bg-transparent border-0 rounded-none shadow-none focus-within:ring-0"
              : "bg-background/60 dark:bg-background/20 backdrop-blur-2xl backdrop-saturate-150 border rounded-xl border-border focus-within:border-primary/40 shadow-sm",
            isDragging ? "border-primary/50 bg-primary/5 border-dashed" : "",
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-xl z-10 pointer-events-none border border-primary/30">
              <div className="flex items-center gap-3 text-primary font-semibold animate-in zoom-in-95 duration-300">
                <Image className="h-6 w-6 animate-pulse" />
                <span className="text-sm uppercase tracking-widest">
                  {draggedImagePaths.length > 0
                    ? `Drop ${draggedImagePaths.length} image${
                        draggedImagePaths.length > 1 ? "s" : ""
                      }`
                    : "Drop image here"}
                </span>
              </div>
            </div>
          )}
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Image Preview Area */}
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-3 p-4 border-b border-primary/10">
              {pendingImages.map((img, index) => (
                <div
                  key={img.filename || img.base64.substring(0, 32)}
                  className="relative group/img animate-in zoom-in-90 duration-300"
                >
                  <div className="h-16 w-16 rounded-lg overflow-hidden border border-primary/20 shadow-md group-hover/img:border-primary/40 group-hover/img:shadow-lg group-hover/img:shadow-primary/10 transition-all duration-300">
                    <img
                      src={`data:${img.mimeType};base64,${img.base64}`}
                      alt={img.filename || "Uploaded image"}
                      className="h-full w-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-background border border-primary/30 text-foreground/70 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive/50 transition-all shadow-sm z-10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={inputRef}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={
              pendingImages.length > 0
                ? "Message..."
                : compact
                  ? "Ask anything..."
                  : "How can I help you build?"
            }
            className={cn(
              "w-full resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none placeholder:text-muted-foreground/40 text-foreground/90 leading-relaxed scrollbar-hide",
              compact
                ? "min-h-[48px] max-h-[300px] px-4 py-3 text-xs"
                : "min-h-[44px] max-h-[180px] px-4 sm:px-5 py-3 sm:py-3.5 text-[13px] sm:text-sm",
            )}
            disabled={isLoading}
          />

          {/* Bottom Actions Bar */}
          <div
            className={cn(
              "flex items-center justify-between",
              compact ? "px-3 pb-3" : "px-3 sm:px-4 pb-2.5 sm:pb-3",
            )}
          >
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {/* Auto / Model Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-primary/10 transition-all group text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider text-left border border-transparent hover:border-primary/20" />
                  }
                >
                  {!compact && (
                    <span className="truncate max-w-[100px] group-hover:text-foreground/90 transition-colors">
                      {activeSessionModel
                        ? AVAILABLE_MODELS.find(
                            (m) => m.id === activeSessionModel,
                          )?.name || "Auto"
                        : "Auto"}
                    </span>
                  )}
                  <ChevronDown className="h-2.5 w-2.5 opacity-50 shrink-0 group-hover:opacity-80 transition-opacity" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[240px] max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2 py-1.5">
                      Select Model
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="mx-1 opacity-50" />
                    {AVAILABLE_MODELS.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className="flex items-center justify-between cursor-pointer rounded-lg px-2.5 py-2 text-sm"
                      >
                        <span className="font-medium">{model.name}</span>
                        {activeSessionModel === model.id && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Subagent Selector - Always visible with Auto option */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all group text-[11px] font-semibold uppercase tracking-wider text-left border",
                        selectedSubagent
                          ? "text-primary bg-primary/10 border-primary/30"
                          : "text-muted-foreground/70 hover:bg-primary/10 border-transparent hover:border-primary/20",
                      )}
                    />
                  }
                >
                  {!compact && (
                    <span className="truncate max-w-[100px] group-hover:text-foreground/90 transition-colors">
                      {selectedSubagent
                        ? subagents.find((s) => s.id === selectedSubagent)
                            ?.name || "Agent"
                        : "Auto"}
                    </span>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-50 shrink-0 group-hover:opacity-80 transition-opacity" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[220px] max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2 py-1.5">
                      Agent Routing
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="mx-1 opacity-50" />
                    <DropdownMenuItem
                      onClick={() => onSubagentChange(null)}
                      className="flex items-center justify-between cursor-pointer rounded-lg px-2.5 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          Auto (Smart Routing)
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Routes based on task keywords
                        </p>
                      </div>
                      {!selectedSubagent && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  {subagents.length > 0 && (
                    <DropdownMenuGroup>
                      <DropdownMenuSeparator className="mx-1 opacity-50" />
                      <DropdownMenuLabel className="text-[9px] text-muted-foreground/50 font-semibold uppercase tracking-wider px-2 py-1">
                        Custom Agents
                      </DropdownMenuLabel>
                      {subagents.map((agent) => (
                        <DropdownMenuItem
                          key={agent.id}
                          onClick={() => onSubagentChange(agent.id)}
                          className="flex items-center justify-between cursor-pointer rounded-lg px-2.5 py-2 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate block">
                              {agent.name}
                            </span>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {agent.description}
                            </p>
                          </div>
                          {selectedSubagent === agent.id && (
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-sm shadow-primary/50 ml-2 shrink-0" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-3 w-px bg-primary/10 mx-0.5 hidden sm:block" />

              {/* Image Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg transition-all group text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider border border-transparent",
                  pendingImages.length > 0
                    ? "text-primary bg-primary/10 border-primary/20"
                    : "text-muted-foreground/60 hover:bg-primary/10 hover:text-primary hover:border-primary/20",
                )}
              >
                <Image
                  className={cn(
                    "h-3 sm:h-3.5 w-3 sm:w-3.5 transition-colors",
                    pendingImages.length > 0
                      ? "text-primary"
                      : "text-muted-foreground/40 group-hover:text-primary",
                  )}
                />
                {!compact && (
                  <span className="hidden sm:inline">
                    {pendingImages.length > 0
                      ? `${pendingImages.length} Attached`
                      : "Image"}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-all duration-300",
                  hasContent || pendingImages.length > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-95"
                    : "bg-muted/20 text-muted-foreground/30 hover:bg-muted/30 border border-border cursor-not-allowed",
                  compact && "h-6 w-6 rounded-md",
                )}
                onClick={handleSendClick}
                disabled={
                  isLoading || (!hasContent && pendingImages.length === 0)
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight
                    className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      (hasContent || pendingImages.length > 0) &&
                        "translate-x-0",
                      compact && "h-3 w-3",
                    )}
                  />
                )}
              </Button>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="text-center mt-2 flex items-center justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity"></div>
        )}
      </div>
    </div>
  );
});

// ============================================
// THINKING ACCORDION - Collapsible thoughts
// ============================================
interface ThinkingAccordionProps {
  thoughts: string;
  isStreaming?: boolean;
  compact?: boolean;
}

const ThinkingAccordion = memo(function ThinkingAccordion({
  thoughts,
  isStreaming,
  compact,
}: ThinkingAccordionProps) {
  const [isOpen, setIsOpen] = useState(isStreaming);

  // Auto-open when streaming starts
  useEffect(() => {
    if (isStreaming) setIsOpen(true);
  }, [isStreaming]);

  if (!thoughts) return null;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden mb-4 border border-primary/10 bg-primary/5 transition-all duration-300",
        compact && "mb-2",
        isOpen
          ? "ring-1 ring-primary/20 shadow-sm"
          : "hover:bg-primary/10 hover:border-primary/20",
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-primary/70 hover:text-primary transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1">
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 ease-out",
              isOpen && "rotate-90",
            )}
          />
          <span className="font-medium tracking-tight uppercase">
            Thought Process
          </span>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-2 text-[10px] bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            <span className="font-semibold uppercase tracking-wider">
              Analyzing
            </span>
          </span>
        )}
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "px-4 py-3 text-[13px] text-foreground/70 border-t border-primary/10 bg-background/20 leading-relaxed font-light prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:text-foreground/90",
              compact && "text-[11px] px-3 py-2",
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {thoughts}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
});

const MessageContent = memo(function MessageContent({
  content,
  compact,
}: {
  content: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-sm text-foreground/90 leading-relaxed max-w-none",
        compact && "text-xs leading-normal",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ className, children, ...props }) => (
            <h1
              className={cn(
                "text-2xl font-bold tracking-tight mb-4 mt-6 first:mt-0 text-foreground",
                compact && "text-lg mb-2 mt-3",
                className,
              )}
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ className, children, ...props }) => (
            <h2
              className={cn(
                "text-xl font-bold tracking-tight mb-3 mt-5 text-foreground",
                compact && "text-base mb-1.5 mt-2",
                className,
              )}
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ className, children, ...props }) => (
            <h3
              className={cn(
                "text-lg font-semibold tracking-tight mb-2 mt-4 text-foreground",
                compact && "text-sm mb-1.5 mt-2",
                className,
              )}
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ className, children, ...props }) => (
            <h4
              className={cn(
                "text-base font-semibold tracking-tight mb-2 mt-3 text-foreground",
                className,
              )}
              {...props}
            >
              {children}
            </h4>
          ),

          // Paragraphs and Lists
          p: ({ className, children, ...props }) => (
            <p
              className={cn(
                "mb-3 last:mb-0 leading-relaxed",
                compact && "mb-2",
                className,
              )}
              {...props}
            >
              {children}
            </p>
          ),
          ul: ({ className, children, ...props }) => (
            <ul
              className={cn(
                "my-2 ml-6 list-disc [&>li]:mt-0.5",
                compact && "ml-4 my-1",
                className,
              )}
              {...props}
            >
              {children}
            </ul>
          ),
          ol: ({ className, children, ...props }) => (
            <ol
              className={cn(
                "my-2 ml-6 list-decimal [&>li]:mt-0.5",
                compact && "ml-4 my-1",
                className,
              )}
              {...props}
            >
              {children}
            </ol>
          ),
          li: ({ className, children, ...props }) => (
            <li className={cn("mb-0.5 pl-0.5", className)} {...props}>
              {children}
            </li>
          ),

          // Block-level elements
          blockquote: ({ className, children, ...props }) => (
            <blockquote
              className={cn(
                "mt-4 mb-4 border-l-4 border-primary/20 pl-4 italic text-muted-foreground",
                compact && "mt-2 mb-2 pl-2 border-l-2",
                className,
              )}
              {...props}
            >
              {children}
            </blockquote>
          ),
          hr: ({ className, ...props }) => (
            <hr
              className={cn("my-6 border-border", compact && "my-3", className)}
              {...props}
            />
          ),

          // Tables
          table: ({ className, children, ...props }) => (
            <div className="my-4 w-full overflow-y-auto rounded-lg border border-border">
              <table
                className={cn(
                  "w-full text-sm",
                  compact && "text-xs",
                  className,
                )}
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ className, children, ...props }) => (
            <thead
              className={cn(
                "bg-muted/50 border-b border-border text-left font-medium",
                className,
              )}
              {...props}
            >
              {children}
            </thead>
          ),
          tbody: ({ className, children, ...props }) => (
            <tbody
              className={cn("divide-y divide-border/50", className)}
              {...props}
            >
              {children}
            </tbody>
          ),
          tr: ({ className, children, ...props }) => (
            <tr
              className={cn("transition-colors hover:bg-muted/30", className)}
              {...props}
            >
              {children}
            </tr>
          ),
          th: ({ className, children, ...props }) => (
            <th
              className={cn(
                "h-10 px-4 align-middle font-medium text-muted-foreground",
                compact && "h-8 px-2",
                className,
              )}
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ className, children, ...props }) => (
            <td
              className={cn(
                "p-4 align-middle [&:has([role=checkbox])]:pr-0",
                compact && "p-2",
                className,
              )}
              {...props}
            >
              {children}
            </td>
          ),

          // Inline elements
          a: ({ className, children, ...props }) => (
            <a
              className={cn(
                "font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors",
                className,
              )}
              target="_blank"
              rel="noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            if (!inline && match) {
              return (
                <CodeBlock
                  language={language}
                  value={String(children).replace(/\n$/, "")}
                  {...props}
                />
              );
            }
            return (
              <code
                className={cn(
                  "bg-muted/50 px-1.5 py-0.5 rounded-md font-mono text-[13px] text-foreground border border-border/40",
                  compact && "text-[11px]",
                  className,
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export function AgentChatWindow({
  compact = false,
  isSidebarCollapsed = false,
}: AgentChatWindowProps) {
  const {
    messages,
    isLoading,
    sendMessage,
    streamingContent,
    streamingThoughts,
  } = useAgentChat();
  const activeSession = useActiveSession();
  const ideState = useIDEState();

  // Show topbar if sidebar is collapsed OR if we are not in the main agents view mode (standalone)
  const showTopbar = isSidebarCollapsed || ideState.viewMode !== "agents";

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subagent state
  const [subagents, setSubagents] = useState<SubagentInfo[]>([]);
  const [selectedSubagent, setSelectedSubagent] = useState<string | null>(null);
  // Track whether the agent server is ready
  const [serverReady, setServerReady] = useState(
    () => getCachedServerStatus()?.running ?? false,
  );

  // Subscribe to server ready state
  useEffect(() => {
    const unsub = subscribeToServerReady((ready) => setServerReady(ready));
    return unsub;
  }, []);

  // Fetch enabled subagents — only runs when the server is confirmed ready
  useEffect(() => {
    if (!serverReady) return; // wait until server is up

    let cancelled = false;

    const doFetch = async () => {
      try {
        console.log("[AgentChat] Fetching subagents...");
        const workspacePath = getIDEState().workspace?.path;
        const url = workspacePath
          ? `http://localhost:3847/api/agentkit/subagents?enabled=true&workspace=${encodeURIComponent(
              workspacePath,
            )}`
          : "http://localhost:3847/api/agentkit/subagents?enabled=true";

        const fetchFn = window.fetch;
        const res = await fetchFn(url);
        if (res.ok) {
          const data = await res.json();
          console.log(
            "[AgentChat] Loaded subagents:",
            data.agents?.length || 0,
            data.agents?.map((a: SubagentInfo) => a.name),
          );
          if (!cancelled) {
            setSubagents(data.agents || []);
          }
        } else {
          console.error("[AgentChat] Failed to fetch subagents:", res.status);
        }
      } catch (err) {
        console.error("[AgentChat] Failed to fetch subagents:", err);
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [serverReady]); // re-runs whenever server comes online

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, streamingThoughts]);

  // Callback for sending messages from the isolated input
  // Routes to subagent execute API when subagent is selected
  const handleSend = useCallback(
    async (message: string, images?: ImageAttachment[]) => {
      if (!activeSession) return;

      // If a subagent is selected, use the backend execute API
      if (selectedSubagent) {
        console.log(`[AgentChat] Routing to subagent: ${selectedSubagent}`);
        agentActions.setLoading(true);

        // Add user message
        const userMessage: import("@/types/chat").ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: message,
          timestamp: new Date(),
          images: images && images.length > 0 ? images : undefined,
        };
        agentActions.addMessage(activeSession.id, userMessage);

        try {
          // Load API key from credential manager
          const apiKey = await loadCredential("gemini_api_key");

          // Get workspace path for tool access
          const workspacePath = getIDEState().workspace?.path;

          const response = await fetch(
            `http://localhost:3847/api/agentkit/subagents/${selectedSubagent}/execute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                task: message,
                apiKey,
                workspace: workspacePath, // CRITICAL: Required for file/directory tools
              }),
            },
          );

          const data = await response.json();

          if (data.success) {
            // Add assistant message with subagent response
            const agentMessage: import("@/types/chat").ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.output || "No response from agent.",
              timestamp: new Date(),
            };
            agentActions.addMessage(activeSession.id, agentMessage);

            // Hand off to main agent - reset subagent selector to Auto
            setSelectedSubagent(null);
            console.log(
              `[AgentChat] Subagent ${data.agentName} completed, returning to Auto mode`,
            );
          } else {
            // Show error
            const errorMessage: import("@/types/chat").ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `Error from subagent: ${data.error}`,
              timestamp: new Date(),
            };
            agentActions.addMessage(activeSession.id, errorMessage);
          }
        } catch (err) {
          console.error("[AgentChat] Subagent execution failed:", err);
          const errorMessage: import("@/types/chat").ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Failed to execute subagent: ${
              err instanceof Error ? err.message : "Unknown error"
            }`,
            timestamp: new Date(),
          };
          agentActions.addMessage(activeSession.id, errorMessage);
        } finally {
          agentActions.setLoading(false);
        }
      } else {
        // Normal flow - use the default agent service
        sendMessage(message, images);
      }
    },
    [activeSession, selectedSubagent, sendMessage],
  );

  // Filter out system messages for display
  const displayMessages = messages.filter((msg) => msg.role !== "system");
  const hasUserMessages = displayMessages.length > 0;

  return (
    <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden">
      {/* Topbar - only shown when sidebar is collapsed or standalone */}
      {showTopbar && (
        <div
          className={cn(
            "h-10 border-b border-border px-4 flex items-center justify-between z-10 shrink-0 sticky top-0 py-2",
            compact && "h-8 px-3",
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center border border-border shrink-0 shadow-inner",
                compact && "h-6 w-6 rounded-md",
              )}
            >
              <Brain
                className={cn(
                  "h-3.5 w-3.5 text-primary/70",
                  compact && "h-3 w-3",
                )}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className={cn(
                  "text-[12px] font-semibold text-foreground/90 truncate tracking-tight",
                  compact && "text-[11px]",
                )}
              >
                {activeSession?.name || "AGENT"}
              </span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => agentActions.createSession("AGENT")}
            className={cn(
              "h-8 w-8 rounded-xl bg-card hover:bg-accent text-primary border border-border transition-all duration-300 group shadow-sm active:scale-95",
              compact && "h-6 w-6 rounded-md",
            )}
          >
            <Plus
              className={cn(
                "h-4 w-4 group-hover:scale-110 transition-transform",
                compact && "h-3 w-3",
              )}
            />
          </Button>
        </div>
      )}
      {/* Top Bar removed - moved to AgentsLayout */}

      {/* Messages Area - padding bottom for floating input */}
      <div
        className="flex-1 overflow-y-auto p-0 pb-32 scroll-smooth selection:bg-primary/10"
        ref={scrollRef}
      >
        {!hasUserMessages ? (
          <div
            className={cn(
              "h-full flex flex-col items-center justify-center p-6 sm:p-8",
              compact && "p-4",
            )}
          >
            <div
              className={cn(
                "flex flex-col items-center gap-4 sm:gap-5 max-w-2xl text-center self-center",
                compact && "gap-3",
              )}
            >
              <div
                className={cn(
                  "h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-muted/20 flex items-center justify-center border border-border/40 transition-colors",
                  compact && "h-10 w-10 rounded-lg",
                )}
              >
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-foreground/50" />
              </div>
              <div className={cn("space-y-2", compact && "space-y-1.5")}>
                <h3
                  className={cn(
                    "text-lg sm:text-xl font-medium tracking-tight text-foreground/80",
                    compact && "text-base",
                  )}
                >
                  What would you like to build?
                </h3>
                <p
                  className={cn(
                    "text-muted-foreground/60 text-[13px] font-normal max-w-sm mx-auto leading-relaxed",
                    compact && "text-xs max-w-[200px]",
                  )}
                >
                  I am ready to help you write code, debug issues, and
                  architecture your project.
                </p>
              </div>

              {!compact && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-6 sm:mt-8 px-4 sm:px-0">
                  {[
                    {
                      icon: Sparkles,
                      label: "Generate React Component",
                      description: "Build modern, accessible UI elements",
                    },
                    {
                      icon: Cpu,
                      label: "Explain the repository",
                      description: "Deep dive into logic and architecture",
                    },
                    {
                      icon: Bot,
                      label: "Refactor Function",
                      description: "Optimize and clean up existing code",
                    },
                    {
                      icon: Send,
                      label: "Find Bugs",
                      description: "Debug and fix issues instantly",
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="flex flex-col gap-2 p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/30 hover:border-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group text-left"
                      onClick={() => handleSend(item.label)}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors duration-300" />
                      <div className="space-y-0.5">
                        <p className="font-medium text-xs sm:text-[13px] text-foreground/90">
                          {item.label}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground/60 leading-normal">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0 min-h-full">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "mx-auto w-full max-w-4xl flex gap-4 sm:gap-6 px-4 py-4 sm:px-6 sm:py-6 group transition-colors relative",
                  compact && "gap-3 px-4 py-3",
                )}
              >
                {!compact && (
                  <div className="shrink-0 mt-1">
                    <div
                      className={cn(
                        "h-7 w-7 rounded-sm flex items-center justify-center transition-colors",
                        msg.role === "user"
                          ? "bg-transparent"
                          : "bg-transparent",
                      )}
                    >
                      {msg.role === "user" ? (
                        <div className="h-4 w-4 rounded-full border border-border/60 bg-muted/30" />
                      ) : (
                        <Bot className="h-5 w-5 text-primary/60" />
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] text-muted-foreground/40 font-medium tabular-nums tracking-tight">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "relative transition-all duration-200",
                      msg.role === "user"
                        ? "bg-muted/20 border border-border/40 rounded-lg px-4 py-3"
                        : "w-full py-1",
                    )}
                  >
                    {/* Show stored thoughts in accordion */}
                    {msg.thoughts && (
                      <ThinkingAccordion
                        thoughts={msg.thoughts}
                        compact={compact}
                      />
                    )}
                    <div
                      className={cn(
                        "text-[14px] leading-relaxed selection:bg-primary/20 prose prose-sm dark:prose-invert max-w-none antialiased",
                        msg.role === "user"
                          ? "text-foreground/90 font-normal"
                          : "text-foreground/80 font-normal",
                      )}
                    >
                      <MessageContent content={msg.content} compact={compact} />
                    </div>
                  </div>

                  {/* Render Tool Calls */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/10 w-full">
                      <ToolExecutionList
                        tools={msg.toolCalls}
                        compact={compact}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div
                className={cn(
                  "mx-auto w-full max-w-4xl flex gap-4 sm:gap-6 px-4 py-6 sm:px-6 sm:py-8 group transition-colors animate-in fade-in duration-500",
                  compact && "gap-3 px-4 py-4",
                )}
              >
                {!compact && (
                  <div className="shrink-0 mt-1">
                    <div className="h-7 w-7 rounded-sm flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-primary/60 animate-spin" />
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  {streamingThoughts && (
                    <ThinkingAccordion
                      thoughts={streamingThoughts}
                      isStreaming={true}
                      compact={compact}
                    />
                  )}
                  {streamingContent ? (
                    <div className="text-[14px] text-foreground/80 leading-relaxed font-normal selection:bg-primary/20 prose prose-sm dark:prose-invert max-w-none">
                      <MessageContent
                        content={streamingContent}
                        compact={compact}
                      />
                      <span className="inline-block w-1 h-4 bg-primary/60 animate-pulse ml-1 align-middle rounded-sm" />
                    </div>
                  ) : !streamingThoughts ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-4 w-4 text-muted-foreground/50 animate-spin" />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Floating Input Area - ISOLATED COMPONENT FOR PERFORMANCE */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <ChatInputArea
          compact={compact}
          isLoading={isLoading}
          onSend={handleSend}
          activeSessionId={activeSession?.id}
          activeSessionModel={activeSession?.model}
          selectedSubagent={selectedSubagent}
          onSubagentChange={setSelectedSubagent}
          subagents={subagents}
        />
      </div>
    </div>
  );
}
