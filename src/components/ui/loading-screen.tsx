import React from 'react';
import { Loader2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export type LoadingStage = {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  error?: string;
};

interface LoadingScreenProps {
  stages: LoadingStage[];
  title?: string;
  subtitle?: string;
  className?: string;
  context?: 'global' | 'workspace' | null;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  stages,
  title = 'Rainy Aether',
  subtitle,
  className,
  context
}) => {
  // Auto-generate subtitle based on context if not provided
  const defaultSubtitle = context === 'workspace'
    ? 'Opening your workspace'
    : 'Initializing IDE';
  const displaySubtitle = subtitle || defaultSubtitle;
  const getStageIcon = (stage: LoadingStage) => {
    switch (stage.status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground opacity-30" />;
    }
  };

  const currentStageIndex = stages.findIndex(s => s.status === 'loading');
  const completedCount = stages.filter(s => s.status === 'completed').length;
  const totalCount = stages.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <div className={cn(
      "fixed inset-0 bg-background flex items-center justify-center z-50",
      className
    )}>
      <div className="w-full max-w-md px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 text-primary">{title}</h1>
          <p className="text-lg text-muted-foreground">{displaySubtitle}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              {currentStageIndex >= 0 ? stages[currentStageIndex].label : 'Preparing...'}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Stages List */}
        <div className="space-y-3">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-all duration-300",
                stage.status === 'loading' && "bg-primary/5 border border-primary/20",
                stage.status === 'completed' && "opacity-60",
                stage.status === 'error' && "bg-destructive/5 border border-destructive/20"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStageIcon(stage)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium",
                  stage.status === 'loading' && "text-foreground",
                  stage.status === 'completed' && "text-muted-foreground",
                  stage.status === 'error' && "text-destructive",
                  stage.status === 'pending' && "text-muted-foreground"
                )}>
                  {stage.label}
                </p>
                {stage.error && (
                  <p className="text-xs text-destructive mt-1">{stage.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            Please wait while we prepare your environment
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
