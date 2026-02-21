import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getLSPBinaryStatuses,
  installLSPBinary,
  type LSPBinaryStatus,
} from "@/services/lsp/lspBinaryService";
import { initializeLSP } from "@/services/lsp";
import { notificationActions } from "@/stores/notificationStore";

type LSPInstallHistoryEntry = {
  id: string;
  timestamp: number;
  serverId: string;
  serverName: string;
  status: "success" | "failed" | "partial";
  command: string;
  message: string;
  output?: string;
};

export function LSPSettingsView() {
  const [lspBinaries, setLspBinaries] = useState<LSPBinaryStatus[]>([]);
  const [lspLoading, setLspLoading] = useState(false);
  const [installingServerId, setInstallingServerId] = useState<string | null>(
    null,
  );
  const [lspInstallHistory, setLspInstallHistory] = useState<
    LSPInstallHistoryEntry[]
  >([]);

  const pushLspHistory = useCallback(
    (entry: Omit<LSPInstallHistoryEntry, "id" | "timestamp">) => {
      setLspInstallHistory((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            ...entry,
          },
          ...prev,
        ].slice(0, 30),
      );
    },
    [],
  );

  const refreshLspBinaries = useCallback(async () => {
    setLspLoading(true);
    try {
      const binaries = await getLSPBinaryStatuses();
      setLspBinaries(binaries);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notificationActions.error(`Failed to load LSP binaries: ${message}`, {
        source: "lsp",
      });
    } finally {
      setLspLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLspBinaries();
  }, [refreshLspBinaries]);

  const handleInstallLspBinary = useCallback(
    async (server: LSPBinaryStatus) => {
      const confirmed = window.confirm(
        `Install ${server.name} now?\n\nThis will run install commands on your system.`,
      );
      if (!confirmed) {
        return;
      }

      setInstallingServerId(server.server_id);
      try {
        const result = await installLSPBinary(server.server_id);
        const output = [result.stdout, result.stderr]
          .filter(Boolean)
          .join("\n")
          .trim();
        const attempted = result.attempted_commands?.[0]?.join(" ");
        const command = attempted || result.command;

        if (result.installed) {
          notificationActions.success(result.message, {
            source: "lsp",
            autoHide: true,
            autoHideDelay: 5000,
          });
          pushLspHistory({
            serverId: server.server_id,
            serverName: server.name,
            status: "success",
            command,
            message: result.message,
            output: output || undefined,
          });
          await initializeLSP();
        } else {
          notificationActions.warning(result.message, { source: "lsp" });
          pushLspHistory({
            serverId: server.server_id,
            serverName: server.name,
            status: "partial",
            command,
            message: result.message,
            output: output || undefined,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        notificationActions.error(
          `Failed to install ${server.name}: ${message}`,
          { source: "lsp" },
        );
        pushLspHistory({
          serverId: server.server_id,
          serverName: server.name,
          status: "failed",
          command: server.command,
          message,
        });
      } finally {
        setInstallingServerId(null);
        await refreshLspBinaries();
      }
    },
    [pushLspHistory, refreshLspBinaries],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Language Server Binaries</CardTitle>
          <CardDescription>
            Manage native language server binaries used for external LSP
            support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Monaco built-in handles TS/JS. External binaries are used for
              Rust, Python, Go and others.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshLspBinaries()}
              disabled={lspLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${lspLoading ? "animate-spin" : ""}`}
              />
              Re-check
            </Button>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Server</th>
                  <th className="px-3 py-2 font-medium">Command</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {lspBinaries.map((server) => (
                  <tr
                    key={server.server_id}
                    className="border-t border-border/70"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium">{server.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {server.instructions}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {server.command}
                    </td>
                    <td className="px-3 py-2">
                      {server.installed ? (
                        <span className="text-emerald-500 font-medium">
                          Installed
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant={server.installed ? "outline" : "default"}
                        size="sm"
                        disabled={
                          server.installed ||
                          installingServerId === server.server_id
                        }
                        onClick={() => void handleInstallLspBinary(server)}
                      >
                        {installingServerId === server.server_id
                          ? "Installing..."
                          : server.installed
                            ? "Installed"
                            : "Install"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {lspBinaries.length === 0 && !lspLoading && (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                      No LSP binary entries available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install History</CardTitle>
          <CardDescription>
            Recent LSP installation attempts from this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lspInstallHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No installation attempts yet.
            </p>
          ) : (
            <ScrollArea className="h-[280px] w-full rounded-md border border-border">
              <div className="divide-y divide-border">
                {lspInstallHistory.map((entry) => (
                  <div key={entry.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {entry.serverName}
                        </span>
                        <Badge
                          variant={
                            entry.status === "success"
                              ? "default"
                              : entry.status === "partial"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {entry.command}
                    </p>
                    <p className="text-sm">{entry.message}</p>
                    {entry.output && (
                      <pre className="text-xs p-2 rounded-md bg-muted/40 overflow-x-auto whitespace-pre-wrap break-words">
                        {entry.output.length > 1000
                          ? `${entry.output.slice(0, 1000)}...`
                          : entry.output}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
