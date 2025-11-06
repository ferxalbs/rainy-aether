import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Zap, 
  Cloud, 
  Settings,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { CredentialService } from '@/services/agent/credentialService';

interface AgentSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  keyPrefix: string;
  keyPlaceholder: string;
  models: string[];
}

export const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [activeTab, setActiveTab] = useState('groq');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});
  
  const credentialService = CredentialService.getInstance();

  const providers: ProviderConfig[] = [
    {
      id: 'groq',
      name: 'Groq',
      description: 'Fast & Free AI models',
      icon: <Zap className="h-4 w-4" />,
      keyPrefix: 'gsk_',
      keyPlaceholder: 'gsk_...',
      models: ['Llama 3.3 70B', 'Llama 3.1 8B'],
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT models with advanced capabilities',
      icon: <Cloud className="h-4 w-4" />,
      keyPrefix: 'sk-',
      keyPlaceholder: 'sk-...',
      models: ['GPT-4 Turbo', 'GPT-3.5 Turbo'],
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Claude models for complex reasoning',
      icon: <Settings className="h-4 w-4" />,
      keyPrefix: 'sk-ant-',
      keyPlaceholder: 'sk-ant-...',
      models: ['Claude 3.5 Sonnet', 'Claude 3 Haiku'],
    },
  ];

  useEffect(() => {
    if (open) {
      loadApiKeys();
    }
  }, [open]);

  const loadApiKeys = () => {
    const keys: Record<string, string> = {};
    providers.forEach(provider => {
      const key = credentialService.getApiKey(provider.id);
      keys[provider.id] = key || '';
    });
    setApiKeys(keys);
    setTestResults({});
  };

  const handleApiKeyChange = (providerId: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [providerId]: value }));
    setTestResults(prev => ({ ...prev, [providerId]: null }));
  };

  const toggleKeyVisibility = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const saveApiKey = async (providerId: string) => {
    setIsSaving(true);
    try {
      const key = apiKeys[providerId]?.trim();
      if (key) {
        await credentialService.setApiKey(providerId, key);
        setTestResults(prev => ({ ...prev, [providerId]: 'success' }));
      } else {
        await credentialService.removeApiKey(providerId);
        setTestResults(prev => ({ ...prev, [providerId]: null }));
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      setTestResults(prev => ({ ...prev, [providerId]: 'error' }));
    } finally {
      setIsSaving(false);
    }
  };

  const removeApiKey = async (providerId: string) => {
    setIsSaving(true);
    try {
      await credentialService.removeApiKey(providerId);
      setApiKeys(prev => ({ ...prev, [providerId]: '' }));
      setTestResults(prev => ({ ...prev, [providerId]: null }));
    } catch (error) {
      console.error('Failed to remove API key:', error);
      setTestResults(prev => ({ ...prev, [providerId]: 'error' }));
    } finally {
      setIsSaving(false);
    }
  };

  const hasValidKey = (providerId: string) => {
    const key = apiKeys[providerId]?.trim();
    return key && key.startsWith(providers.find(p => p.id === providerId)?.keyPrefix || '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Agent Settings
          </DialogTitle>
          <DialogDescription>
            Configure AI providers and API keys for agent sessions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {providers.map(provider => (
              <TabsTrigger key={provider.id} value={provider.id} className="flex items-center gap-2">
                {provider.icon}
                {provider.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {providers.map(provider => (
            <TabsContent key={provider.id} value={provider.id} className="space-y-4">
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {provider.icon}
                      {provider.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${provider.id}-key`}>API Key</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id={`${provider.id}-key`}
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          placeholder={provider.keyPlaceholder}
                          value={apiKeys[provider.id]}
                          onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => toggleKeyVisibility(provider.id)}
                        >
                          {showKeys[provider.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {apiKeys[provider.id] && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => saveApiKey(provider.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {testResults[provider.id] === 'success' && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        API key saved successfully
                      </div>
                    )}
                    
                    {testResults[provider.id] === 'error' && (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <X className="h-4 w-4" />
                        Failed to save API key
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Available Models</Label>
                    <div className="flex flex-wrap gap-2">
                      {provider.models.map(model => (
                        <Badge key={model} variant="secondary">
                          {model}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {hasValidKey(provider.id) && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <Key className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-200">
                        API key configured and ready to use
                      </span>
                    </div>
                  )}

                  {!hasValidKey(provider.id) && apiKeys[provider.id] && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-800 dark:text-amber-200">
                        API key format appears invalid. Should start with "{provider.keyPrefix}"
                      </span>
                    </div>
                  )}

                  {apiKeys[provider.id] && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeApiKey(provider.id)}
                      disabled={isSaving}
                    >
                      Remove API Key
                    </Button>
                  )}
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
