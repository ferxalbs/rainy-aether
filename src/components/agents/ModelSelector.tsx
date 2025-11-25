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
                "h-9 w-[240px] border border-white/10 bg-white/5 backdrop-blur-md shadow-lg text-xs font-medium hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-lg text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0",
                className
            )}>
                <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px] bg-zinc-850/20 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1">
                {/* Gemini Standard Models */}
                {geminiStandardModels.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-2">
                            Gemini - Standard
                        </SelectLabel>
                        {geminiStandardModels.map((model) => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-xs cursor-pointer rounded-lg focus:bg-white/10 focus:text-white my-0.5"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    {getModelIcon(model)}
                                    <span className="flex-1 font-medium">{model.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}

                {/* Gemini Thinking Models */}
                {geminiThinkingModels.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-2 flex items-center gap-1.5 mt-2 border-t border-white/5 pt-3">
                            <Brain className="h-3 w-3 text-purple-500" />
                            Gemini - Thinking Models
                        </SelectLabel>
                        {geminiThinkingModels.map((model) => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-xs cursor-pointer rounded-lg focus:bg-white/10 focus:text-white my-0.5"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    {getModelIcon(model)}
                                    <span className="flex-1 font-medium">{model.name}</span>
                                    {getThinkingBadge(model)}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}

                {/* Groq Models */}
                {groqModels.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-2 mt-2 border-t border-white/5 pt-3">
                            Groq
                        </SelectLabel>
                        {groqModels.map((model) => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-xs cursor-pointer rounded-lg focus:bg-white/10 focus:text-white my-0.5"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <Zap className="h-3.5 w-3.5 text-green-500" />
                                    <span className="flex-1 font-medium">{model.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}

                {/* Cerebras Models */}
                {cerebrasModels.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider px-2 py-2 mt-2 border-t border-white/5 pt-3">
                            Cerebras
                        </SelectLabel>
                        {cerebrasModels.map((model) => (
                            <SelectItem
                                key={model.id}
                                value={model.id}
                                className="text-xs cursor-pointer rounded-lg focus:bg-white/10 focus:text-white my-0.5"
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <Zap className="h-3.5 w-3.5 text-orange-500" />
                                    <span className="flex-1 font-medium">{model.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}
            </SelectContent>
        </Select>
    );
}
