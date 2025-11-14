import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/cn';
import {
  ZapIcon,
  MessageCircleDashedIcon,
  WandSparklesIcon,
  BoxIcon,
  SparklesIcon,
} from 'lucide-react';
import { ChatInputBox } from './ChatInputBox';
import { Badge } from '@/components/ui/badge';

const chatModes = [
  { id: 'fast', label: 'Fast', icon: ZapIcon, description: 'Quick responses' },
  { id: 'in-depth', label: 'In-depth', icon: MessageCircleDashedIcon, description: 'Detailed analysis' },
  { id: 'magic', label: 'Magic AI', icon: WandSparklesIcon, pro: true, description: 'Advanced reasoning' },
  { id: 'holistic', label: 'Holistic', icon: BoxIcon, description: 'Complete solution' },
];

const quickPrompts = [
  { label: 'Explain this code', icon: MessageCircleDashedIcon },
  { label: 'Find bugs', icon: ZapIcon },
  { label: 'Optimize performance', icon: SparklesIcon },
  { label: 'Write tests', icon: BoxIcon },
];

interface ChatWelcomeScreenProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  selectedMode: string;
  onModeChange: (modeId: string) => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

/**
 * Render the chat welcome screen containing the app header, quick prompts, input box, mode selector, and footer note.
 *
 * @param message - Current text in the chat input
 * @param onMessageChange - Called with a new message value when input changes
 * @param onSend - Called to submit/send the current message
 * @param selectedMode - Currently selected chat mode id
 * @param onModeChange - Called with a mode id when the user selects a different mode
 * @param selectedModel - Currently selected model id
 * @param onModelChange - Called with a model id when the user selects a different model
 * @returns The welcome screen JSX element containing interactive controls and informational UI
 */
export function ChatWelcomeScreen({
  message,
  onMessageChange,
  onSend,
  selectedMode,
  onModeChange,
  selectedModel,
  onModelChange,
}: ChatWelcomeScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 md:px-8 py-8 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5 animate-pulse [animation-duration:8s]" />

      {/* Blur orbs for depth */}
      <div className="absolute top-1/4 left-1/4 size-64 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 size-64 bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-[720px] space-y-8 relative z-10">
        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
            <div className="relative size-20 md:size-24 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
              <Logo className="size-12 md:size-14 text-white" />
            </div>
          </div>

          <div className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent">
                Rainy AI
              </h1>
              <Badge variant="secondary" className="text-xs font-semibold">
                Beta
              </Badge>
            </div>
            <p className="text-base md:text-lg text-muted-foreground font-medium">
              Your intelligent coding assistant
            </p>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {quickPrompts.map((prompt) => (
            <Button
              key={prompt.label}
              variant="outline"
              size="sm"
              className="gap-2 h-9 backdrop-blur-sm bg-background/50 hover:bg-accent/50 border-border/50 transition-all duration-200 hover:shadow-sm"
              onClick={() => {
                onMessageChange(prompt.label);
                onSend();
              }}
            >
              <prompt.icon className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{prompt.label}</span>
            </Button>
          ))}
        </div>

        {/* Input Box */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 rounded-2xl blur-xl" />
          <div className="relative">
            <ChatInputBox
              message={message}
              onMessageChange={onMessageChange}
              onSend={onSend}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              showTools={true}
            />
          </div>
        </div>

        {/* Chat Modes */}
        <div className="space-y-3">
          <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-wider">
            Select Mode
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {chatModes.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <Button
                  key={mode.id}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'flex flex-col gap-1.5 h-auto py-3 transition-all duration-200 relative overflow-hidden',
                    isSelected && 'shadow-md bg-gradient-to-br from-primary to-primary/90',
                    !isSelected && 'backdrop-blur-sm bg-background/50 hover:bg-accent/50 border-border/50'
                  )}
                  onClick={() => onModeChange(mode.id)}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                  )}
                  <mode.icon className={cn('size-4', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')} />
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-xs font-semibold', isSelected && 'text-primary-foreground')}>
                      {mode.label}
                    </span>
                    {mode.pro && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                        Pro
                      </Badge>
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px]',
                    isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground/70'
                  )}>
                    {mode.description}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground/70">
            AI can make mistakes. Verify important information.
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted/50 border border-border/50 rounded">Enter</kbd> to send
          </p>
        </div>
      </div>
    </div>
  );
}