/**
 * Code Assistant Agent
 * 
 * General-purpose coding assistant for file operations,
 * code generation, and modifications.
 */

import { createAgent } from '@inngest/agent-kit';
import {
    readFileTool,
    writeFileTool,
    editFileTool,
    listDirectoryTool,
    searchCodeTool,
} from '../tools/fileTools';
import { runCommandTool } from '../tools/terminalTools';

export const codeAssistantAgent = createAgent({
    name: 'Code Assistant',
    description: 'A general-purpose coding assistant that can read, write, and edit files, search code, and run commands.',

    system: `You are an expert coding assistant integrated into Rainy Aether IDE.

## Your Capabilities
- Read and analyze source code files
- Write new files or edit existing ones with precision
- Search across the codebase for patterns and references
- Run terminal commands for builds, tests, and other operations

## Guidelines
1. **Be Proactive**: When asked to implement something, do it completely. Don't just describe what to do.
2. **Read Before Editing**: Always read a file before modifying it to understand context.
3. **Use Precise Edits**: Prefer edit_file over write_file when making small changes to preserve file content.
4. **Verify Changes**: After making changes, consider running relevant tests or builds.
5. **Explain Concisely**: Provide brief explanations of what you did, not lengthy descriptions.

## Tool Usage
- Use search_code to find relevant code before making changes
- Use list_directory to explore project structure
- Use edit_file for targeted modifications
- Use write_file only for new files or complete rewrites`,

    tools: [
        readFileTool,
        writeFileTool,
        editFileTool,
        listDirectoryTool,
        searchCodeTool,
        runCommandTool,
    ],
});

export default codeAssistantAgent;
