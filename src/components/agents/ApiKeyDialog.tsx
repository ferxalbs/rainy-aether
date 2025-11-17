/**
 * API Key Dialog
 *
 * Dialog for configuring API keys for AI providers (Google Gemini, Groq).
 * Uses Shadcn UI components for a polished interface.
 *
 * Features:
 * - Secure input fields with show/hide toggle
 * - Real-time validation
 * - Provider-specific instructions
 * - Secure storage via OS keychain
 *
 * @example
 * ```typescript
 * <ApiKeyDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   onComplete={() => console.log('Keys configured')}
 * />
 * ```
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Eye, EyeOff, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { apiKeyActions, useApiKeys, type ProviderId } from '@/stores/apiKeyStore';
import { cn } from '@/lib/cn';

interface ApiKeyDialogProps {
  /** Whether dialog is open */
  open: boolean;

  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;

  /** Callback when keys are successfully configured */
  onComplete?: () => void;

  /** Whether to require all keys (default: false) */
  requireAll?: boolean;
}

/**
 * API Key Dialog Component
 */
export function ApiKeyDialog({
  open,
  onOpenChange,
  onComplete,
  requireAll = false,
}: ApiKeyDialogProps) {
  const apiKeys = useApiKeys();
  const [groqKey, setGroqKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<ProviderId>('groq');

  // Initialize the store when dialog opens
  useEffect(() => {
    if (open && !apiKeys.initialized) {
      apiKeyActions.initialize();
    }
  }, [open, apiKeys.initialized]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setGroqKey('');
      setGoogleKey('');
      setShowGroqKey(false);
      setShowGoogleKey(false);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      const keysToSave: Array<{ provider: ProviderId; key: string }> = [];

      // Add keys that were entered
      if (groqKey.trim()) {
        keysToSave.push({ provider: 'groq', key: groqKey.trim() });
      }
      if (googleKey.trim()) {
        keysToSave.push({ provider: 'google', key: googleKey.trim() });
      }

      // Validate that at least one key is provided
      if (keysToSave.length === 0) {
        setError('Please enter at least one API key');
        setSaving(false);
        return;
      }

      // If requireAll, check both are provided
      if (requireAll && keysToSave.length < 2) {
        setError('Both API keys are required');
        setSaving(false);
        return;
      }

      // Save each key
      for (const { provider, key } of keysToSave) {
        await apiKeyActions.setKey(provider, key);
      }

      setSuccess(true);

      // Wait a moment to show success message
      setTimeout(() => {
        onOpenChange(false);
        onComplete?.();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API keys');
    } finally {
      setSaving(false);
    }
  };

  const canSave = (groqKey.trim() !== '' || googleKey.trim() !== '') && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configure API Keys</DialogTitle>
          <DialogDescription>
            Enter your API keys to enable AI agents. Keys are stored securely in your system
            keychain and never sent to our servers.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProviderId)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="groq" className="relative">
              Groq (Llama 3.3)
              {apiKeys.status.groq.configured && (
                <Check className="ml-2 h-4 w-4 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="google" className="relative">
              Google (Gemini)
              {apiKeys.status.google.configured && (
                <Check className="ml-2 h-4 w-4 text-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groq" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="groq-key">Groq API Key</Label>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Get API Key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="relative">
                <Input
                  id="groq-key"
                  type={showGroqKey ? 'text' : 'password'}
                  placeholder="gsk_..."
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {apiKeys.status.groq.configured && (
                <p className="text-sm text-muted-foreground">
                  Current key: {apiKeys.status.groq.keyPrefix}
                </p>
              )}
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                <strong>About Groq:</strong> Groq provides ultra-fast inference for Llama 3.3
                70B. Ideal for the Rainy and Abby agents. Free tier available with generous
                limits.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="google" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="google-key">Google AI API Key</Label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Get API Key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="relative">
                <Input
                  id="google-key"
                  type={showGoogleKey ? 'text' : 'password'}
                  placeholder="AIza..."
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleKey(!showGoogleKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {apiKeys.status.google.configured && (
                <p className="text-sm text-muted-foreground">
                  Current key: {apiKeys.status.google.keyPrefix}
                </p>
              )}
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                <strong>About Google:</strong> Google's Gemini 2.0 Flash provides advanced
                reasoning capabilities. Ideal for the Claude Code agent. Free tier available.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 text-green-600">
            <Check className="h-4 w-4" />
            <AlertDescription>API keys saved successfully!</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving...' : 'Save Keys'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
