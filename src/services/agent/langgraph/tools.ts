import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getToolRegistry } from '@/services/agent/tools/registry';
import { executeTool } from '@/services/agent/tools/executor';
import type { ToolDefinition } from '@/services/agent/tools/types';
import type { LangGraphToolUpdate } from './types';

function toLangGraphToolSchema(definition: ToolDefinition) {
  return definition.inputSchema as z.ZodTypeAny;
}

export function isToolRunnable(definition: ToolDefinition): boolean {
  return typeof definition.execute === 'function';
}

export function createLangGraphTool(
  definition: ToolDefinition,
  onProgress?: (update: LangGraphToolUpdate) => void
) {
  const schema = toLangGraphToolSchema(definition);

  return tool(
    async (input: unknown, { configurable }) => {
      const context = configurable ?? {};
      const sessionId = context.sessionId ?? 'unknown-session';
      const userId = context.userId ?? 'default-user';
      const workspaceRoot = context.workspaceRoot ?? '';

      onProgress?.({
        toolName: definition.name,
        status: 'starting',
        message: `Starting ${definition.name}...`,
      });

      const result = await executeTool({
        toolName: definition.name,
        sessionId,
        userId,
        workspaceRoot,
        input,
      } as any);

      if (result.success) {
        onProgress?.({
          toolName: definition.name,
          status: 'complete',
          message: `Completed ${definition.name}`,
          progress: 100,
        });
      } else {
        onProgress?.({
          toolName: definition.name,
          status: 'error',
          message: result.error,
        });
      }

      if (!result.success) {
        throw new Error(result.error || `Tool ${definition.name} failed`);
      }

      return result.output;
    },
    {
      name: definition.name,
      description: definition.description,
      schema,
    }
  );
}

export function buildLangGraphTools(onProgress?: (update: LangGraphToolUpdate) => void) {
  const registry = getToolRegistry();
  const tools = registry.listAll();
  return tools.filter(isToolRunnable).map((toolDef) => createLangGraphTool(toolDef, onProgress));
}
