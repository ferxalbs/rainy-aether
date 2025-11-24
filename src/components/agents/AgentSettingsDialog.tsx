import { useState, useEffect } from "react";
import { Settings, Key, Check, Loader2, Eye, EyeOff } from "lucide-react";
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
import { saveCredential, loadCredential } from "@/services/agent/AgentService";
import { toast } from "sonner";

interface ApiKeyStatus {
  gemini: boolean;
  groq: boolean;
}

export function AgentSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // API Keys
  const [geminiKey, setGeminiKey] = useState("");
  const [groqKey, setGroqKey] = useState("");

  // Key status
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus>({
    gemini: false,
    groq: false,
  });

  // Show/hide keys
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);

  // Load existing keys on open
  useEffect(() => {
    if (open) {
      loadKeys();
    }
  }, [open]);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const [gemini, groq] = await Promise.all([
        loadCredential("gemini_api_key"),
        loadCredential("groq_api_key"),
      ]);

      // Set keys (show masked version if they exist)
      if (gemini) {
        setGeminiKey(maskKey(gemini));
        setKeyStatus((prev) => ({ ...prev, gemini: true }));
      }
      if (groq) {
        setGroqKey(maskKey(groq));
        setKeyStatus((prev) => ({ ...prev, groq: true }));
      }
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

      // Only save if the key was modified (not masked)
      if (geminiKey && !geminiKey.includes("•")) {
        promises.push(saveCredential("gemini_api_key", geminiKey));
      }
      if (groqKey && !groqKey.includes("•")) {
        promises.push(saveCredential("groq_api_key", groqKey));
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

  const handleClear = (provider: "gemini" | "groq") => {
    if (provider === "gemini") {
      setGeminiKey("");
      setKeyStatus((prev) => ({ ...prev, gemini: false }));
    } else {
      setGroqKey("");
      setKeyStatus((prev) => ({ ...prev, groq: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Agent Settings</DialogTitle>
          <DialogDescription>
            Configure API keys for AI providers. Keys are stored securely and never sent anywhere except to the respective AI services.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Gemini API Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="gemini-key">Google Gemini API Key</Label>
                  {keyStatus.gemini && (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Get API Key
                </a>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="gemini-key"
                    type={showGeminiKey ? "text" : "password"}
                    placeholder="AIza..."
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                  >
                    {showGeminiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {geminiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClear("gemini")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Required for Gemini models (gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash)
              </p>
            </div>

            <Separator />

            {/* Groq API Key */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="groq-key">Groq API Key</Label>
                  {keyStatus.groq && (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Get API Key
                </a>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="groq-key"
                    type={showGroqKey ? "text" : "password"}
                    placeholder="gsk_..."
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                  >
                    {showGroqKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {groqKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClear("groq")}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Required for Groq models (llama-3.3-70b, llama-3.1-8b, mixtral-8x7b)
              </p>
            </div>

            <Separator />

            {/* Info Section */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <h4 className="text-sm font-semibold">Security & Privacy</h4>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li>API keys are stored securely using Tauri's credential manager</li>
                <li>Keys are encrypted and stored in your system's secure keychain</li>
                <li>Keys are never sent to any server except the AI provider you're using</li>
                <li>You can delete keys at any time by clearing the field and saving</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
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
