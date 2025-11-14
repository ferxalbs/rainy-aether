import {
  PaperclipIcon,
  CircleDashedIcon,
  SparklesIcon,
  ChevronDownIcon,
  CheckIcon,
  SendIcon,
  MicIcon,
  CodeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Logo } from '@/components/ui/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

const aiModels = [
  { id: 'rainy-3', label: 'Rainy AI 3.0', icon: SparklesIcon, description: 'Most capable' },
  { id: 'rainy-turbo', label: 'Rainy Turbo', icon: SparklesIcon, description: 'Fastest responses' },
  { id: 'rainy-pro', label: 'Rainy Pro', icon: SparklesIcon, description: 'Advanced reasoning', pro: true },
  { id: 'rainy-ultra', label: 'Rainy Ultra', icon: SparklesIcon, description: 'Maximum intelligence', pro: true },
];

interface ChatInputBoxProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  showTools?: boolean;
  placeholder?: string;
}

export function ChatInputBox({
  message,
  onMessageChange,
  onSend,
  selectedModel,
  onModelChange,
  showTools = true,
  placeholder = 'Ask anything...',
}: ChatInputBoxProps) {
  const isMessageEmpty = !message.trim();

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-secondary/50 to-secondary/30 backdrop-blur-sm p-1 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="rounded-xl border border-border/30 bg-background/80 backdrop-blur-sm">
        <Textarea
          placeholder={placeholder}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          className="min-h-[100px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />

        <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/30">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <PaperclipIcon className="size-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach files</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <CodeIcon className="size-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach code context</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <MicIcon className="size-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Voice input</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {showTools && (
              <div className="flex items-center gap-1 ml-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-7 rounded-lg hover:bg-accent/50 px-2.5 transition-colors"
                      >
                        <CircleDashedIcon className="size-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
                          Search
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Deep search mode</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-7 rounded-lg hover:bg-accent/50 px-2.5 transition-colors"
                      >
                        <SparklesIcon className="size-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
                          Think
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Advanced reasoning</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showTools && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 h-8 px-2 hover:bg-accent/50 rounded-lg transition-colors"
                  >
                    <div className="size-5 rounded-md bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center">
                      <Logo className="size-3.5 text-white" />
                    </div>
                    <span className="hidden sm:inline text-xs font-medium">
                      {aiModels.find((m) => m.id === selectedModel)?.label}
                    </span>
                    <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 backdrop-blur-xl bg-background/95">
                  {aiModels.map((model) => {
                    const ModelIcon = model.icon;
                    const isSelected = selectedModel === model.id;
                    return (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => onModelChange(model.id)}
                        className="gap-2 cursor-pointer py-2.5"
                      >
                        <div className="size-8 rounded-md bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center">
                          <ModelIcon className="size-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{model.label}</span>
                            {model.pro && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                                Pro
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{model.description}</p>
                        </div>
                        {isSelected && <CheckIcon className="size-4 text-primary" />}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-xs text-muted-foreground">
                    <SparklesIcon className="size-3.5" />
                    <span>Manage models</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              size="sm"
              onClick={onSend}
              disabled={isMessageEmpty}
              className="h-8 px-4 gap-1.5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-medium">Send</span>
              <SendIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
