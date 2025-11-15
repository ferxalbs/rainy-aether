import {
  PaperclipIcon,
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

/**
 * Renders a chat input area with tooling, a model selector, and a send control.
 *
 * @param message - Current input text shown in the textarea
 * @param onMessageChange - Called with the updated text when the textarea value changes
 * @param onSend - Called to submit the current message (also triggered by Enter without Shift)
 * @param selectedModel - Currently selected model id for the model selector
 * @param onModelChange - Called with a model id when a different model is selected
 * @param showTools - When true, displays additional tool buttons and the model selector (defaults to `true`)
 * @param placeholder - Placeholder text for the textarea (defaults to 'Ask anything...')
 * @returns The chat input box React element with controls for attachments, search/think tools, model selection, and sending
 */
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
    <div className="rounded-xl border border-border bg-card shadow-lg backdrop-blur-xl supports-backdrop-filter:bg-card/80">
      <div className="p-1">
        <Textarea
          placeholder={placeholder}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          className="min-h-[100px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />

        <div className="flex items-center justify-between px-3 py-2 border-t border-border">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <PaperclipIcon className="size-4" />
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
                    className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <CodeIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach code</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <MicIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Voice input</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            {showTools && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <div className="size-4 rounded bg-primary flex items-center justify-center">
                      <Logo className="size-3 text-primary-foreground" />
                    </div>
                    <span className="hidden sm:inline text-xs">
                      {aiModels.find((m) => m.id === selectedModel)?.label}
                    </span>
                    <ChevronDownIcon className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {aiModels.map((model) => {
                    const ModelIcon = model.icon;
                    const isSelected = selectedModel === model.id;
                    return (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => onModelChange(model.id)}
                        className="gap-2 cursor-pointer"
                      >
                        <ModelIcon className="size-4" />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{model.label}</span>
                            {model.pro && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              size="sm"
              onClick={onSend}
              disabled={isMessageEmpty}
              className="h-7 px-3 gap-1.5"
            >
              <span className="text-xs">Send</span>
              <SendIcon className="size-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}