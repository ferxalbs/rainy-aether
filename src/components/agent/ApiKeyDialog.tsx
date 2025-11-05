/**
 * API Key Management Dialog
 *
 * Allows users to configure API keys for different AI providers.
 */

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { CredentialService } from '@/services/agent/credentialService';

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerName: string;
  onKeyConfigured?: () => void;
}

export const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({
  open,
  onOpenChange,
  providerId,
  providerName,
  onKeyConfigured,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const credentialService = CredentialService.getInstance();

  // Load existing API key when dialog opens
  useEffect(() => {
    if (open) {
      const existingKey = credentialService.getApiKey(providerId);
      if (existingKey) {
        setApiKey(existingKey);
        setValidationStatus('valid');
      } else {
        setApiKey('');
        setValidationStatus('idle');
      }
      setErrorMessage('');
    }
  }, [open, providerId]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setErrorMessage('API key cannot be empty');
      return;
    }

    // Save API key
    credentialService.setApiKey(providerId, apiKey.trim());

    // Validate the key (optional, depends on provider support)
    setIsValidating(true);
    setValidationStatus('idle');
    setErrorMessage('');

    try {
      // For now, just save without validation
      // TODO: Add provider-specific validation when available
      setValidationStatus('valid');
      onKeyConfigured?.();
      onOpenChange(false);
    } catch (error) {
      setValidationStatus('invalid');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to validate API key');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    credentialService.removeApiKey(providerId);
    setApiKey('');
    setValidationStatus('idle');
    setErrorMessage('');
  };

  const getProviderInstructions = (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'groq':
        return 'Get your API key from https://console.groq.com/keys';
      case 'openai':
        return 'Get your API key from https://platform.openai.com/api-keys';
      case 'anthropic':
        return 'Get your API key from https://console.anthropic.com/settings/keys';
      default:
        return `Get your ${provider} API key from the provider's console`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Configure {providerName} API Key
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>{getProviderInstructions(providerId)}</p>
            <p className="text-xs text-muted-foreground">
              Your API key is stored securely and never shared.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className={cn(
                  'pr-20',
                  validationStatus === 'valid' && 'border-green-500',
                  validationStatus === 'invalid' && 'border-red-500'
                )}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {validationStatus === 'valid' && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {validationStatus === 'invalid' && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {errorMessage && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Provider Info */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Provider</span>
              <Badge variant="secondary">{providerName}</Badge>
            </div>
            {validationStatus === 'valid' && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>API key configured</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {apiKey && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
            >
              Remove Key
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isValidating || !apiKey.trim()}
          >
            {isValidating ? 'Validating...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
