/**
 * Audit Log Viewer Component
 *
 * Comprehensive audit log interface with filtering, search, and export capabilities.
 */

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getAuditLogger, type AuditLogEntry } from '@/services/agent/tools/audit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AuditLogViewerProps {
  className?: string;
}

type FilterType = 'all' | 'success' | 'failed';
type SortField = 'timestamp' | 'duration' | 'toolName';
type SortDirection = 'asc' | 'desc';

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ className }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });

  // Load logs
  useEffect(() => {
    const auditLogger = getAuditLogger();
    const allLogs = auditLogger.getAllLogs();
    setLogs(allLogs);

    // Calculate stats
    const success = allLogs.filter(log => log.success).length;
    const failed = allLogs.filter(log => !log.success).length;
    setStats({ total: allLogs.length, success, failed });
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...logs];

    // Apply filter
    if (filterType === 'success') {
      filtered = filtered.filter(log => log.success);
    } else if (filterType === 'failed') {
      filtered = filtered.filter(log => !log.success);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        log =>
          log.tool.toLowerCase().includes(query) ||
          log.user?.toLowerCase().includes(query) ||
          log.inputSummary?.toLowerCase().includes(query) ||
          log.outputSummary?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'toolName':
          comparison = a.tool.localeCompare(b.tool);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredLogs(filtered);
  }, [logs, searchQuery, filterType, sortField, sortDirection]);

  const handleExportJSON = () => {
    // Export logs as JSON
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    // Export logs as CSV
    const headers = ['Timestamp', 'Tool', 'User', 'Permission', 'Success', 'Duration', 'Error'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.tool,
      log.user || 'N/A',
      log.permissionLevel,
      log.success ? 'Yes' : 'No',
      `${log.duration}ms`,
      log.error || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all audit logs? This action cannot be undone.')) {
      // Just clear local state - actual clearing would need backend support
      setLogs([]);
      setFilteredLogs([]);
      setStats({ total: 0, success: 0, failed: 0 });
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const getPermissionColor = (level: string): string => {
    switch (level) {
      case 'restricted':
        return 'bg-red-500/20 text-red-500';
      case 'admin':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'user':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Audit Log</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {stats.total} total
            </Badge>
            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500">
              {stats.success} success
            </Badge>
            <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-500">
              {stats.failed} failed
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearLogs} className="text-red-500">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterType} onValueChange={value => setFilterType(value as FilterType)}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Logs</SelectItem>
            <SelectItem value="success">Success Only</SelectItem>
            <SelectItem value="failed">Failed Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th
                className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('timestamp')}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Timestamp</span>
                  {sortField === 'timestamp' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    ))}
                </div>
              </th>
              <th
                className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('toolName')}
              >
                <div className="flex items-center gap-1">
                  <Wrench className="h-4 w-4" />
                  <span>Tool</span>
                  {sortField === 'toolName' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    ))}
                </div>
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">Permission</th>
              <th className="text-left p-3 font-medium text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>User</span>
                </div>
              </th>
              <th
                className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('duration')}
              >
                <div className="flex items-center gap-1">
                  <span>Duration</span>
                  {sortField === 'duration' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    ))}
                </div>
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  No logs found
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr
                  key={log.id}
                  className="border-b border-border hover:bg-accent/50 transition-colors"
                >
                  <td className="p-3">
                    {log.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-xs">{log.tool}</span>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className={cn('text-xs', getPermissionColor(log.permissionLevel))}>
                      {log.permissionLevel}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {log.user || 'N/A'}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs font-mono">
                    {formatDuration(log.duration)}
                  </td>
                  <td className="p-3">
                    <div className="max-w-xs truncate text-xs text-muted-foreground">
                      {log.success ? log.outputSummary : log.error || 'No details'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
