import React, { useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Combobox } from '../ui/combobox';
import { cn } from '@/lib/utils';
import { CredentialService } from '@/services/agent/credentialService';

import type { AgentSession } from '@/stores/agentStore';

interface ChatInputProps {
  input: string;
  isSending: boolean;
  activeSession: AgentSession | null;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  variant?: 'default' | 'floating';
  className?: string;
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onNewSession: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  isSending,
  activeSession,
  onInputChange,
  onSendMessage,
  onKeyDown,
  variant = 'default',
  className,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  onNewSession,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFloating = variant === 'floating';
  
  const credentialService = CredentialService.getInstance();
  const hasApiKey = credentialService.hasApiKey(selectedProvider);
  
  const providerOptions = [
    { value: 'groq', label: 'Groq', description: 'Fast & Free AI models' },
    { value: 'openai', label: 'OpenAI', description: 'GPT models with advanced capabilities' },
    { value: 'anthropic', label: 'Anthropic', description: 'Claude models for complex reasoning' },
  ];
  
  const modelOptions = [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', description: 'Versatile high-performance' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', description: 'Fast and efficient' },
  ];
  
  const openAIModels = [
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Advanced reasoning' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and capable' },
  ];
  
  const anthropicModels = [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Complex reasoning' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Lightning fast' },
  ];
  
  const getCurrentModelOptions = () => {
    switch (selectedProvider) {
      case 'groq': return modelOptions;
      case 'openai': return openAIModels;
      case 'anthropic': return anthropicModels;
      default: return [];
    }
  };

  return (
    <div
      className={cn(
        isFloating
          ? 'pointer-events-auto w-full max-w-3xl sm:max-w-4xl transition-all'
          : 'border-t border-border bg-muted/15 px-3 py-3 sm:px-4 sm:py-4'
      ,
        className
      )}
    >
      <div
        className={cn(
          'mx-auto',
          isFloating ? 'w-full' : 'max-w-3xl xl:max-w-4xl'
        )}
      >
        {!activeSession && (
          <div className="mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Provider</label>
                <Combobox
                  options={providerOptions}
                  value={selectedProvider}
                  onValueChange={onProviderChange}
                  placeholder="Select provider"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Model</label>
                <Combobox
                  options={getCurrentModelOptions()}
                  value={selectedModel}
                  onValueChange={onModelChange}
                  placeholder="Select model"
                  disabled={!selectedProvider}
                />
              </div>
            </div>
            {selectedProvider && !hasApiKey && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <div className="text-amber-600 dark:text-amber-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.82 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  API key required for {providerOptions.find(p => p.value === selectedProvider)?.label}. Configure in Settings.
                </p>
              </div>
            )}
            <Button
              onClick={onNewSession}
              disabled={!selectedModel || !hasApiKey}
              className="w-full"
            >
              Create Session
            </Button>
          </div>
        )}
        <div
          className={cn(
            'overflow-hidden border bg-background transition-all',
            isFloating
              ? 'rounded-2xl border-border/50 shadow-xl shadow-black/15 backdrop-blur'
              : 'rounded-xl border-border/60 shadow-sm'
          )}
        >
          {activeSession && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
              <span className="text-xs text-muted-foreground">Session with:</span>
              <span className="text-xs font-medium text-foreground">
                {providerOptions.find(p => p.value === activeSession.providerId)?.label}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-medium text-foreground">
                {getCurrentModelOptions().find(m => m.value === activeSession.modelId)?.label}
              </span>
            </div>
          )}
          
          <Textarea
            ref={textareaRef}
            placeholder={
              activeSession
                ? 'Ask the agent to help with your code... (tools available)'
                : 'Create a session to start chatting...'
            }
            className={cn(
              'min-h-28 resize-none border-0 bg-transparent px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-0 sm:px-5 sm:py-4',
              'placeholder:text-muted-foreground/60'
            )}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!activeSession || isSending}
          />
          <div className="flex flex-col gap-3 border-t border-border/40 bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="text-xs text-muted-foreground">
              {activeSession ? (
                <span>
                  Press <kbd className="rounded bg-muted px-1">Enter</kbd> to send,{' '}
                  <kbd className="rounded bg-muted px-1">Shift+Enter</kbd> for new line
                </span>
              ) : (
                'Create a session to enable chat'
              )}
            </div>
            <Button
              size="sm"
              className={cn(
                isFloating && 'rounded-full px-5'
              )}
              onClick={onSendMessage}
              disabled={!activeSession || !input.trim() || isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};