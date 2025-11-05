/**
 * Agent Tools Panel Component
 *
 * Main container for agent tools functionality with tabbed interface.
 */

import React, { useState } from 'react';
import {
  Activity,
  Shield,
  FileText,
  Info,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ToolExecutionViewer } from './ToolExecutionViewer';
import { AuditLogViewer } from './AuditLogViewer';
import { PermissionElevationDialog, usePermissionElevation } from './PermissionElevationDialog';
import { getPermissionManager } from '@/services/agent/tools/permissions';
import { getToolRegistry } from '@/services/agent/tools/registry';
import { Card } from '@/components/ui/card';

interface AgentToolsPanelProps {
  className?: string;
  defaultTab?: string;
}

export const AgentToolsPanel: React.FC<AgentToolsPanelProps> = ({
  className,
  defaultTab = 'executions',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const permissionElevation = usePermissionElevation();

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Permission Elevation Dialog */}
      {permissionElevation.pendingRequest && (
        <PermissionElevationDialog
          open={permissionElevation.isOpen}
          onOpenChange={permissionElevation.setIsOpen}
          toolName={permissionElevation.pendingRequest.toolName}
          requiredLevel={permissionElevation.pendingRequest.requiredLevel}
          currentLevel={getPermissionManager().getGlobalPermissionLevel()}
          onApprove={permissionElevation.handleApprove}
          onDeny={permissionElevation.handleDeny}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 border-b border-border rounded-none h-12">
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Executions</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Permissions</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Audit Log</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Statistics</span>
          </TabsTrigger>
        </TabsList>

        {/* Executions Tab */}
        <TabsContent value="executions" className="flex-1 overflow-hidden m-0">
          <ToolExecutionViewer />
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="flex-1 overflow-auto m-0 p-4">
          <PermissionsManager />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="flex-1 overflow-hidden m-0">
          <AuditLogViewer />
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="flex-1 overflow-auto m-0 p-4">
          <StatisticsView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/**
 * Permissions Manager Component
 */
const PermissionsManager: React.FC = () => {
  const permissionManager = getPermissionManager();
  const currentLevel = permissionManager.getGlobalPermissionLevel();

  const handleSetGlobalLevel = (level: 'user' | 'admin' | 'restricted') => {
    permissionManager.setGlobalPermissionLevel(level);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Global Permission Level</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set the default permission level for all tool executions.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Card
            className={cn(
              'p-4 cursor-pointer transition-all border-2',
              currentLevel === 'user'
                ? 'border-green-500 bg-green-500/10'
                : 'hover:border-muted-foreground/50'
            )}
            onClick={() => handleSetGlobalLevel('user')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-green-500" />
              <h4 className="font-semibold text-foreground">User</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Read-only operations. Safe for autonomous agents.
            </p>
          </Card>

          <Card
            className={cn(
              'p-4 cursor-pointer transition-all border-2',
              currentLevel === 'admin'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'hover:border-muted-foreground/50'
            )}
            onClick={() => handleSetGlobalLevel('admin')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              <h4 className="font-semibold text-foreground">Admin</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Write operations. Requires confirmation for destructive actions.
            </p>
          </Card>

          <Card
            className={cn(
              'p-4 cursor-pointer transition-all border-2',
              currentLevel === 'restricted'
                ? 'border-red-500 bg-red-500/10'
                : 'hover:border-muted-foreground/50'
            )}
            onClick={() => handleSetGlobalLevel('restricted')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-red-500" />
              <h4 className="font-semibold text-foreground">Restricted</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Terminal execution. Maximum trust required.
            </p>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Permission System</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Permissions are hierarchical: <code className="text-xs bg-muted px-1 py-0.5 rounded">restricted</code> includes{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">admin</code> and{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">user</code>.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Tools requiring higher permissions will prompt for elevation when the global level is insufficient.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Permission grants can be time-limited for enhanced security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Statistics View Component
 */
const StatisticsView: React.FC = () => {
  const registry = getToolRegistry();
  const registryStats = registry.getStats();

  const allTools = registry.listAll();
  const toolsByCategory = {
    filesystem: allTools.filter(t => t.category === 'filesystem').length,
    git: allTools.filter(t => t.category === 'git').length,
    workspace: allTools.filter(t => t.category === 'workspace').length,
    terminal: allTools.filter(t => t.category === 'terminal').length,
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-foreground mb-1">
              {registryStats.totalExecutions}
            </div>
            <div className="text-xs text-muted-foreground">Total Executions</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-500 mb-1">
              {registryStats.totalExecutions}
            </div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-500 mb-1">
              0
            </div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-foreground mb-1">
              {registry.size}
            </div>
            <div className="text-xs text-muted-foreground">Registered Tools</div>
          </Card>
        </div>
      </div>

      {/* Tools by Category */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Tools by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">File System</span>
              <Badge variant="secondary">{toolsByCategory.filesystem}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">Read, write, edit files</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Git</span>
              <Badge variant="secondary">{toolsByCategory.git}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">Version control operations</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Workspace</span>
              <Badge variant="secondary">{toolsByCategory.workspace}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">Code navigation, search</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Terminal</span>
              <Badge variant="secondary">{toolsByCategory.terminal}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">Command execution</div>
          </Card>
        </div>
      </div>

      {/* Registered Tools */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Registered Tools</h3>
        <div className="space-y-2">
          {allTools.slice(0, 10).map((tool, index) => (
            <Card key={tool.name} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-mono text-foreground">{tool.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {tool.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {tool.permissionLevel}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
