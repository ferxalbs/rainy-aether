import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/cn';
import {
  ZapIcon,
  MessageCircleDashedIcon,
  WandSparklesIcon,
  BoxIcon,
} from 'lucide-react';
import { ChatInputBox } from './ChatInputBox';

const chatModes = [
  { id: 'fast', label: 'Fast', icon: ZapIcon },
  { id: 'in-depth', label: 'In-depth', icon: MessageCircleDashedIcon },
  { id: 'magic', label: 'Magic AI', icon: WandSparklesIcon, pro: true },
  { id: 'holistic', label: 'Holistic', icon: BoxIcon },
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
    <div className="flex h-full flex-col items-center justify-center px-4 md:px-8 py-8">
      <div className="w-full max-w-[680px] space-y-8">
        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center">
            <Logo className="size-16 md:size-20" />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Hey! I&apos;m your AI Agent
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              How can I help you today?
            </p>
          </div>
        </div>

        {/* Input Box */}
        <ChatInputBox
          message={message}
          onMessageChange={onMessageChange}
          onSend={onSend}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          showTools={true}
        />

        {/* Chat Modes */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {chatModes.map((mode) => (
            <Button
              key={mode.id}
              variant={selectedMode === mode.id ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'gap-1.5 h-8 transition-all',
                selectedMode === mode.id && 'bg-accent shadow-sm'
              )}
              onClick={() => onModeChange(mode.id)}
            >
              <mode.icon className="size-3.5" />
              <span className="text-xs">{mode.label}</span>
              {mode.pro && (
                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium">
                  Pro
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground/70">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
