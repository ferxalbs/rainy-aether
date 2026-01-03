/**
 * MCP Tool Approval Service
 * 
 * Manages security approvals for MCP tool calls.
 * Servers marked with autoApprove=true bypass user confirmation.
 * 
 * Flow:
 * 1. Agent requests MCP tool execution
 * 2. ApprovalService checks if server is auto-approved
 * 3. If not, creates pending approval and emits event
 * 4. UI shows approval prompt to user
 * 5. User approves/rejects, promise resolves
 * 6. Tool execution proceeds or fails
 */

import { EventEmitter } from 'events';
import { getMCPConfigs, getConfigByName } from './config';
import { getProjectMCPConfigs } from './config-loader';

// ===========================
// Types
// ===========================

export interface PendingApproval {
    id: string;
    serverName: string;
    toolName: string;
    args: Record<string, unknown>;
    timestamp: number;
    description?: string;
}

export interface ApprovalRequest extends PendingApproval {
    resolve: (approved: boolean) => void;
}

export interface ApprovalEvent {
    type: 'approval:requested' | 'approval:resolved';
    approval: PendingApproval;
    result?: boolean;
}

// ===========================
// Approval Service
// ===========================

class MCPApprovalService extends EventEmitter {
    private pendingApprovals = new Map<string, ApprovalRequest>();
    private autoApproveOverrides = new Map<string, boolean>();

    /**
     * Set auto-approve override for a server (session-level)
     */
    setAutoApprove(serverName: string, enabled: boolean): void {
        this.autoApproveOverrides.set(serverName, enabled);
    }

    /**
     * Check if a server's tools are auto-approved
     */
    isAutoApproved(serverName: string, workspace?: string): boolean {
        // First check session overrides
        if (this.autoApproveOverrides.has(serverName)) {
            return this.autoApproveOverrides.get(serverName)!;
        }

        // Check built-in configs
        const builtInConfig = getConfigByName(serverName);
        if (builtInConfig) {
            return builtInConfig.autoApprove ?? false;
        }

        // Check project configs
        if (workspace) {
            const projectConfigs = getProjectMCPConfigs(workspace);
            const projectConfig = projectConfigs.find(c => c.name === serverName);
            if (projectConfig) {
                return projectConfig.autoApprove ?? false;
            }
        }

        // Default: require approval
        return false;
    }

    /**
     * Request approval for a tool call
     * Returns immediately if auto-approved, otherwise waits for user response
     */
    async requestApproval(
        serverName: string,
        toolName: string,
        args: Record<string, unknown>,
        options?: { workspace?: string; description?: string; timeout?: number }
    ): Promise<boolean> {
        // Check auto-approve first
        if (this.isAutoApproved(serverName, options?.workspace)) {
            return true;
        }

        // Create approval request
        const id = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const approval: PendingApproval = {
            id,
            serverName,
            toolName,
            args,
            timestamp: Date.now(),
            description: options?.description,
        };

        // Create promise that resolves when user responds
        return new Promise((resolve) => {
            const request: ApprovalRequest = { ...approval, resolve };
            this.pendingApprovals.set(id, request);

            // Emit event for UI
            this.emit('approval:requested', {
                type: 'approval:requested',
                approval,
            } as ApprovalEvent);

            // Optional timeout (default: 5 minutes)
            const timeout = options?.timeout ?? 300000;
            setTimeout(() => {
                if (this.pendingApprovals.has(id)) {
                    this.rejectRequest(id, 'Approval timed out');
                }
            }, timeout);
        });
    }

    /**
     * Approve a pending request
     */
    approveRequest(approvalId: string): void {
        const request = this.pendingApprovals.get(approvalId);
        if (request) {
            this.pendingApprovals.delete(approvalId);
            request.resolve(true);

            this.emit('approval:resolved', {
                type: 'approval:resolved',
                approval: {
                    id: request.id,
                    serverName: request.serverName,
                    toolName: request.toolName,
                    args: request.args,
                    timestamp: request.timestamp,
                    description: request.description,
                },
                result: true,
            } as ApprovalEvent);
        }
    }

    /**
     * Reject a pending request
     */
    rejectRequest(approvalId: string, reason?: string): void {
        const request = this.pendingApprovals.get(approvalId);
        if (request) {
            this.pendingApprovals.delete(approvalId);
            request.resolve(false);

            this.emit('approval:resolved', {
                type: 'approval:resolved',
                approval: {
                    id: request.id,
                    serverName: request.serverName,
                    toolName: request.toolName,
                    args: request.args,
                    timestamp: request.timestamp,
                    description: request.description,
                },
                result: false,
            } as ApprovalEvent);
        }
    }

    /**
     * Get all pending approvals (for UI display)
     */
    getPendingApprovals(): PendingApproval[] {
        return Array.from(this.pendingApprovals.values()).map(req => ({
            id: req.id,
            serverName: req.serverName,
            toolName: req.toolName,
            args: req.args,
            timestamp: req.timestamp,
            description: req.description,
        }));
    }

    /**
     * Clear all pending approvals (e.g., on session end)
     */
    clearPendingApprovals(): void {
        for (const [id] of Array.from(this.pendingApprovals)) {
            this.rejectRequest(id, 'Session ended');
        }
        this.pendingApprovals.clear();
    }

    /**
     * Get approval stats
     */
    getStats(): { pending: number; autoApproveServers: string[] } {
        return {
            pending: this.pendingApprovals.size,
            autoApproveServers: Array.from(this.autoApproveOverrides.entries())
                .filter(([, enabled]) => enabled)
                .map(([name]) => name),
        };
    }
}

// Singleton instance
export const approvalService = new MCPApprovalService();
