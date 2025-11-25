import { Brain, Zap } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AVAILABLE_MODELS, ModelConfig } from "@/services/agent/providers"
import { cn } from "@/lib/utils"

interface ModelSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}

export function ModelSelector({ value, onValueChange, className }: ModelSelectorProps) {
    // Group models by category and provider
    const geminiStandardModels = AVAILABLE_MODELS.filter(
        m => m.provider === 'gemini' && m.category === 'standard'
    );

    const geminiThinkingModels = AVAILABLE_MODELS.filter(
        m => m.provider === 'gemini' && m.category === 'thinking'
    );

    const groqModels = AVAILABLE_MODELS.filter(m => m.provider === 'groq');
    const cerebrasModels = AVAILABLE_MODELS.filter(m => m.provider === 'cerebras');

    const getModelIcon = (model: ModelConfig) => {
        if (model.category === 'thinking' && model.supportsThinking) {
            return <Brain className="h-3.5 w-3.5 text-purple-500" />;
        }
        return <Zap className="h-3.5 w-3.5 text-blue-500" />;
    };

    const getThinkingBadge = (model: ModelConfig) => {
        if (!model.supportsThinking || model.thinkingMode === 'none') {
            return null;
        }

        const badgeStyles = {
            auto: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
            low: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
            high: 'bg-pink-500/20 text-pink-600 dark:text-pink-400',
            none: '',
        };

        const labels = {
            auto: 'Auto',
            low: 'Low',
            high: 'High',
            none: '',
        };

        return (
            <span className={cn(
                "ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium",
                badgeStyles[model.thinkingMode || 'none']
            )}>
                {labels[model.thinkingMode || 'none']}
            </span>
        );
    };

    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className={cn(
                "h-7 w-[220px] border-0 bg-background/50 shadow-none text-xs hover:bg-background transition-colors",
                className
            )}>
                <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
                {/* Gemini Standard Models */}
                {geminiStandardModels.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                            Gemini - Standard
                        </SelectLabel>
                        {geminiStandardModels.map((model) => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-xs cursor-pointer"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    {getModelIcon(model)}
                                    <span className="flex-1">{model.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}

                {/* Gemini Thinking Models */}
                {geminiThinkingModels.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
                            <Brain className="h-3.5 w-3.5 text-purple-500" />
                            Gemini - Thinking Models
                        </SelectLabel>
                        {geminiThinkingModels.map((model) => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-xs cursor-pointer"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    {getModelIcon(model)}
                                    <span className="flex-1">{model.name}</span>
                                    {getThinkingBadge(model)}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}

                {/* Groq Models */}
                {groqModels.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                            Groq
                        </SelectLabel>
                        {groqModels.map((model) => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-xs cursor-pointer"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <Zap className="h-3.5 w-3.5 text-green-500" />
                                    <span className="flex-1">{model.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}

                {/* Cerebras Models */}
                {cerebrasModels.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                            Cerebras
                        </SelectLabel>
                        {cerebrasModels.map((model) => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-xs cursor-pointer"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <Zap className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="flex-1">{model.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}
            </SelectContent>
        </Select>
    );
}
