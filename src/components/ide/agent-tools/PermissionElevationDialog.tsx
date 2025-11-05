/**
 * Permission Elevation Dialog Component
 *
 * Dialog for requesting elevated permissions for tool execution.
 * Appears when AI agent attempts to execute admin or restricted operations.
 */

import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { getPermissionManager, type PermissionLevel } from '@/services/agent/tools/permissions';

interface PermissionElevationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolName: string;
  requiredLevel: PermissionLevel;
  currentLevel: PermissionLevel;
  onApprove: (duration?: number) => void;
  onDeny: () => void;
  reason?: string;
  className?: string;
}

export const PermissionElevationDialog: React.FC<PermissionElevationDialogProps> = ({
  open,
  onOpenChange,
  toolName,
  requiredLevel,
  currentLevel,
  onApprove,
  onDeny,
  reason,
  className,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number | undefined>(3600000); // 1 hour default

  const getPermissionIcon = (level: PermissionLevel) => {
    switch (level) {
      case 'restricted':
        return <ShieldAlert className="h-8 w-8 text-red-500" />;
      case 'admin':
        return <Shield className="h-8 w-8 text-yellow-500" />;
      case 'user':
        return <ShieldCheck className="h-8 w-8 text-green-500" />;
      default:
        return <Shield className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getPermissionColor = (level: PermissionLevel): string => {
    switch (level) {
      case 'restricted':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'admin':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'user':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPermissionDescription = (level: PermissionLevel): string => {
    switch (level) {
      case 'restricted':
        return 'Can execute potentially dangerous operations like terminal commands';
      case 'admin':
        return 'Can modify files and execute write operations';
      case 'user':
        return 'Can only read files and query information';
      default:
        return 'Unknown permission level';
    }
  };

  const durationOptions = [
    { label: '15 minutes', value: 900000 },
    { label: '1 hour', value: 3600000 },
    { label: '4 hours', value: 14400000 },
    { label: '8 hours', value: 28800000 },
    { label: 'This session', value: undefined },
  ];

  const handleApprove = () => {
    onApprove(selectedDuration);
    onOpenChange(false);
  };

  const handleDeny = () => {
    onDeny();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-md', className)}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getPermissionIcon(requiredLevel)}
            <DialogTitle className="text-xl">Permission Required</DialogTitle>
          </div>
          <DialogDescription>
            The AI agent is requesting elevated permissions to execute this tool.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tool Information */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Tool:</span>
              <span className="text-sm font-semibold text-foreground font-mono">{toolName}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Current Level:</span>
              <Badge variant="outline" className={cn('text-xs', getPermissionColor(currentLevel))}>
                {currentLevel}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Required Level:</span>
              <Badge variant="outline" className={cn('text-xs', getPermissionColor(requiredLevel))}>
                {requiredLevel}
              </Badge>
            </div>
          </div>

          {/* Warning */}
          {requiredLevel === 'restricted' && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-500 mb-1">Dangerous Operation</p>
                <p className="text-xs text-red-500/80">
                  This tool can execute commands on your system. Only approve if you trust the AI
                  agent's intent.
                </p>
              </div>
            </div>
          )}

          {/* Permission Description */}
          <div className="text-sm text-muted-foreground">{getPermissionDescription(requiredLevel)}</div>

          {/* Reason */}
          {reason && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Reason:</p>
              <p className="text-sm text-muted-foreground italic">{reason}</p>
            </div>
          )}

          {/* Duration Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4" />
              <span>Grant Permission For:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {durationOptions.map(option => (
                <Button
                  key={option.label}
                  variant={selectedDuration === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDuration(option.value)}
                  className="justify-start"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDeny} className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Deny
          </Button>
          <Button
            onClick={handleApprove}
            className={cn(
              'flex items-center gap-2',
              requiredLevel === 'restricted'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-yellow-500 hover:bg-yellow-600'
            )}
          >
            <Unlock className="h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Hook to manage permission elevation dialogs
 */
export const usePermissionElevation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{
    toolName: string;
    requiredLevel: PermissionLevel;
    resolve: (approved: boolean) => void;
  } | null>(null);

  const requestElevation = async (
    toolName: string,
    requiredLevel: PermissionLevel
  ): Promise<boolean> => {
    return new Promise(resolve => {
      setPendingRequest({ toolName, requiredLevel, resolve });
      setIsOpen(true);
    });
  };

  const handleApprove = (duration?: number) => {
    if (pendingRequest) {
      const permissionManager = getPermissionManager();

      // Grant permission
      permissionManager.grantToolPermission(
        'default-user', // TODO: Get actual user ID
        pendingRequest.toolName,
        pendingRequest.requiredLevel,
        duration
      );

      pendingRequest.resolve(true);
      setPendingRequest(null);
    }
    setIsOpen(false);
  };

  const handleDeny = () => {
    if (pendingRequest) {
      pendingRequest.resolve(false);
      setPendingRequest(null);
    }
    setIsOpen(false);
  };

  return {
    isOpen,
    setIsOpen,
    pendingRequest,
    requestElevation,
    handleApprove,
    handleDeny,
  };
};
