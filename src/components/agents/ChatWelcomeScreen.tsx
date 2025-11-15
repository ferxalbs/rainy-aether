import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
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
    <div className="flex h-full flex-col items-center justify-center px-4 md:px-8 py-8">
      <div className="w-full max-w-[680px] space-y-8">
        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-5">
          <div className="size-16 md:size-20 rounded-xl bg-primary flex items-center justify-center">
            <Logo className="size-10 md:size-12 text-primary-foreground" />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Rainy AI
            </h1>
            <p className="text-base text-muted-foreground">
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
              className="gap-2 h-8"
              onClick={() => {
                onMessageChange(prompt.label);
                onSend();
              }}
            >
              <prompt.icon className="size-3.5" />
              <span className="text-xs">{prompt.label}</span>
            </Button>
          ))}
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
        <div className="space-y-3">
          <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">
            Mode
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {chatModes.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <Button
                  key={mode.id}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  className="flex flex-col gap-1 h-auto py-2.5"
                  onClick={() => onModeChange(mode.id)}
                >
                  <mode.icon className="size-4" />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium">
                      {mode.label}
                    </span>
                    {mode.pro && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        Pro
                      </Badge>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}