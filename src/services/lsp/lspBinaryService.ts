import { invoke } from '@tauri-apps/api/core';

export interface LSPBinaryStatus {
  server_id: string;
  name: string;
  command: string;
  installed: boolean;
  instructions: string;
}

export interface LSPBinaryInstallResult {
  server_id: string;
  command: string;
  attempted_commands: string[][];
  installed: boolean;
  already_installed: boolean;
  stdout: string;
  stderr: string;
  message: string;
}

export async function getLSPBinaryStatuses(): Promise<LSPBinaryStatus[]> {
  return invoke<LSPBinaryStatus[]>('lsp_get_binary_statuses');
}

export async function installLSPBinary(serverId: string): Promise<LSPBinaryInstallResult> {
  return invoke<LSPBinaryInstallResult>('lsp_install_server_binary', {
    serverId,
  });
}
