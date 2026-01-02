import { useState, useEffect } from "react";
import { Settings, Key, Check, Loader2, Eye, EyeOff, Server, Power, PowerOff, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { saveCredential, loadCredential } from "@/services/agent/AgentService";
import { useAgentServer } from "@/hooks/useAgentServer";
import { toast } from "sonner";

interface ApiKeyStatus {
  gemini: boolean;
  groq: boolean;
  openai: boolean;
  anthropic: boolean;
  cerebras: boolean;
}

interface ApiKeyConfig {
  id: string;
  name: string;
  storageKey: string;
  placeholder: string;
  getKeyUrl: string;
  description: string;
}

const API_PROVIDERS: ApiKeyConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    storageKey: 'gemini_api_key',
    placeholder: 'AIza...',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    description: 'Gemini 3 Flash, Gemini 3 Pro',
  },
  {
    id: 'groq',
    name: 'Groq',
    storageKey: 'groq_api_key',
    placeholder: 'gsk_...',
    getKeyUrl: 'https://console.groq.com/keys',
    description: 'Kimi K2 09-25 (ultra-fast inference)',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    storageKey: 'openai_api_key',
    placeholder: 'sk-...',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    description: 'GPT-5.2, GPT-Codex-5.2 and more',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    storageKey: 'anthropic_api_key',
    placeholder: 'sk-ant-...',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Claude 4.5 Sonnet, Claude 4.5 Opus and Claude 4.5 Haiku',
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    storageKey: 'cerebras_api_key',
    placeholder: 'csk-...',
    getKeyUrl: 'https://cloud.cerebras.ai/platform/',
    description: 'GML 4.5 and GPT-OSS (fastest inference)',
  },
];

export function AgentSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { status, isRunning, isStarting, isStopping, start, stop, refresh, error: serverError } = useAgentServer();

  // API Keys state
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus>({
    gemini: false,
    groq: false,
    openai: false,
    anthropic: false,
    cerebras: false,
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Load existing keys on open
  useEffect(() => {
    if (open) {
      loadKeys();
    }
  }, [open]);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const loadedKeys: Record<string, string> = {};
      const status: Record<string, boolean> = {};

      await Promise.all(
        API_PROVIDERS.map(async (provider) => {
          const key = await loadCredential(provider.storageKey);
          if (key) {
            loadedKeys[provider.id] = maskKey(key);
            status[provider.id] = true;
          }
        })
      );

      setKeys(loadedKeys);
      setKeyStatus(status as unknown as ApiKeyStatus);
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  const maskKey = (key: string): string => {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<void>[] = [];

      for (const provider of API_PROVIDERS) {
        const key = keys[provider.id];
        if (key && !key.includes("•")) {
          promises.push(saveCredential(provider.storageKey, key));
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        toast.success("API keys saved successfully");
        setOpen(false);
      } else {
        toast.info("No changes to save");
      }
    } catch (error) {
      console.error("Failed to save API keys:", error);
      toast.error("Failed to save API keys");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = (providerId: string) => {
    setKeys((prev) => ({ ...prev, [providerId]: "" }));
    setKeyStatus((prev) => ({ ...prev, [providerId]: false }));
  };

  const handleKeyChange = (providerId: string, value: string) => {
    setKeys((prev) => ({ ...prev, [providerId]: value }));
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Agent Settings</DialogTitle>
          <DialogDescription>
            Configure API keys and manage the agent server.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
            {/* Server Status Section */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Agent Server</Label>
                  {isRunning ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-[10px]">
                      Running
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                      Offline
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={refresh}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  {isRunning ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stop}
                      disabled={isStopping}
                      className="text-red-500 hover:text-red-500"
                    >
                      {isStopping ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <PowerOff className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={start}
                      disabled={isStarting}
                      className="text-green-500 hover:text-green-500"
                    >
                      {isStarting ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Start
                    </Button>
                  )}
                </div>
              </div>
              {status && (
                <div className="text-xs text-muted-foreground font-mono">
                  {status.url} • Inngest: {status.inngest_endpoint}
                </div>
              )}
              {serverError && (
                <div className="text-xs text-red-500">
                  Error: {serverError}
                </div>
              )}
            </div>

            <Separator />

            {/* API Keys Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">API Keys</Label>
              </div>

              {API_PROVIDERS.map((provider) => (
                <div key={provider.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${provider.id}-key`} className="text-sm">
                        {provider.name}
                      </Label>
                      {keyStatus[provider.id as keyof ApiKeyStatus] && (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </div>
                    <a
                      href={provider.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline"
                    >
                      Get Key
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`${provider.id}-key`}
                        type={showKeys[provider.id] ? "text" : "password"}
                        placeholder={provider.placeholder}
                        value={keys[provider.id] || ""}
                        onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                        className="pr-10 h-9 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => toggleShowKey(provider.id)}
                      >
                        {showKeys[provider.id] ? (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {keys[provider.id] && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleClear(provider.id)}
                        className="h-9"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {provider.description}
                  </p>
                </div>
              ))}
            </div>

            <Separator />

            {/* Security Info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <h4 className="text-sm font-medium">Security & Privacy</h4>
              <ul className="text-[11px] text-muted-foreground space-y-1 ml-4 list-disc">
                <li>API keys are stored securely using your system's keychain</li>
                <li>Keys are encrypted at rest and never leave your device</li>
                <li>Keys are only sent to the AI provider you're using</li>
                <li>Delete keys anytime by clearing the field and saving</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Keys"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
