# 🎨 HIGH-LEVEL CODING AGENT DESIGN

**Version**: 1.0
**Date**: November 15, 2025
**Status**: Proposed
**Author**: Gemini

---

## 1. OVERVIEW & GOAL

This document proposes the design for a **High-Level Coding Agent**, named **"Maestro"**. This agent acts as a sophisticated orchestrator within the existing "Rainy Agents" ecosystem defined in the `RAINY_AGENTS_MASTER_PLAN.md`.

The primary goal of "Maestro" is to handle complex, multi-step software development tasks specified in natural language. Instead of executing simple commands, Maestro will decompose high-level requests (e.g., "implement feature X", "refactor the state management", "add tests for the user service") into a coherent plan and orchestrate lower-level agents and tools to execute it.

This agent will leverage the **Supervisor pattern** from LangGraph, acting as the "manager" of a team of specialized agents.

## 2. RELATIONSHIP TO EXISTING ARCHITECTURE

Maestro integrates seamlessly into the dual-core architecture:

- **Orchestration Layer (TypeScript):** Maestro's main logic will reside here, implemented as a LangGraph graph. It will be registered in the `AgentRegistry`.
- **Core Services (Rust):** Maestro will not interact directly with the Rust core. Instead, it will delegate tasks to other agents (like `Rainy Agents` or `Claude Code`) which, in turn, use the Rust-powered tools (`filesystem`, `terminal`, `git`, etc.).

```
┌──────────────────────────────────┐
│          "Maestro" Agent         │
│ (LangGraph Supervisor)           │
└────────────────┬─────────────────┘
                 │ (Delegates Tasks)
     ┌───────────┴───────────┐
     │                       │
┌────▼─────────┐      ┌──────▼───────┐
│ Rainy Agents │      │ Claude Code  │
│ (Execution)  │      │ (Analysis)   │
└────┬─────────┘      └──────┬───────┘
     │                      │
     └───────────┬──────────┘
                 │ (Uses Tools)
           ┌─────▼─────┐
           │ Rust Core │
           │ (Tools)   │
           └───────────┘
```

## 3. CORE CAPABILITIES

- **Task Decomposition:** Break down a high-level user request into a sequence of logical sub-tasks (e.g., 1. Understand requirements -> 2. Analyze relevant code -> 3. Draft implementation -> 4. Write tests -> 5. Finalize).
- **Agent Delegation:** Intelligently route each sub-task to the most appropriate specialized agent (e.g., send analysis tasks to `Claude Code`, send file modification tasks to `Rainy Agents`).
- **State Management:** Maintain a comprehensive state for the entire task, including the overall plan, the status of each sub-task, relevant file paths, code snippets, and final results.
- **Iterative Refinement:** Review the output from worker agents and decide if it meets the requirements, needs revision, or is complete.
- **User Interaction:** Provide progress updates to the user and ask for clarification when the request is ambiguous.

## 4. PROPOSED LANGGRAPH WORKFLOW

Maestro will be implemented as a `LangGraph` supervisor. The graph will consist of a central **Supervisor** node and several **Worker** nodes.

### State Object

The graph's state will be critical and will contain:

```typescript
interface MaestroState {
  userInput: string;          // The initial high-level request
  plan: string[];             // A list of steps to accomplish the task
  currentStep: number;        // The index of the current step in the plan
  relevantFiles: string[];    // List of files relevant to the task
  codeDrafts: Map<string, string>; // Drafted code changes, keyed by file path
  analysisResult: string;     // Output from code analysis
  testResults: string;        // Output from the testing phase
  finalOutput: string;        // The final summary or result for the user
  history: BaseMessage[];     // Conversation history for context
}
```

### Graph Nodes & Edges

1. **PLANNER (Entry Point):**
    - **Action:** Receives the user input.
    - **Process:** Analyzes the request and creates a step-by-step plan.
    - **Next:** Routes to the first step in the plan.

2. **SUPERVISOR (Central Router):**
    - **Action:** Examines the current state and the plan.
    - **Process:** Based on the current step, decides which worker agent to call next (e.g., "analyze_code", "write_code").
    - **Next:** A conditional edge routes to the selected worker.

3. **WORKERS (Delegated Agents):**
    - **`code_analyst`:**
        - **Agent:** `Claude Code`
        - **Action:** Analyzes the codebase to find relevant files, understand existing logic, and identify dependencies.
        - **Updates State:** `relevantFiles`, `analysisResult`.
    - **`code_writer`:**
        - **Agent:** `Rainy Agents`
        - **Action:** Writes or modifies code in the files identified by the analyst. Uses `read_file`, `write_file`, `edit_file`.
        - **Updates State:** `codeDrafts`.
    - **`tester`:**
        - **Agent:** `Rainy Agents`
        - **Action:** Creates or runs tests related to the code changes. Uses `execute_command` to run the project's test script (e.g., `pnpm test`).
        - **Updates State:** `testResults`.

4. **FINALIZE (Exit Point):**
    - **Action:** Once all steps are complete, this node compiles the results.
    - **Process:** Generates a summary of the work done, including files changed and test outcomes.
    - **Next:** Ends the execution, returning `finalOutput` to the user.

The flow is cyclical, always returning to the **Supervisor** after a worker completes its task.

## 5. TOOLING

Maestro itself will not call tools directly. It will rely on the toolsets of the worker agents it delegates to, which are already defined in `RAINY_AGENTS_MASTER_PLAN.md` and powered by the Rust core. This promotes separation of concerns.

## 6. EXAMPLE USE CASE

**User Request:** "Add a 'Copy to Clipboard' button next to each code block in the chat view."

1. **Maestro (PLANNER):** Decomposes the request:
    1. "Identify the React component responsible for rendering chat messages and code blocks."
    2. "Analyze the component to find the right place to add a button."
    3. "Implement a 'Copy' button component with clipboard functionality."
    4. "Integrate the new button into the chat message component."
    5. "Verify the changes by running the application and testing the button." (Manual step for now)

2. **Maestro (SUPERVISOR):** Sees step 1. Routes to `code_analyst`.

3. **`code_analyst` (`Claude Code`):**
    - Uses `workspace_structure` and `search_files` to identify `AgentChatView.tsx` and `react-markdown` components as relevant.
    - **Updates State:** `relevantFiles: ['src/components/agents/AgentChatView.tsx']`, `analysisResult: "The code blocks are rendered using react-markdown. A custom renderer for the 'code' element is needed."`

4. **Maestro (SUPERVISOR):** Sees step 2 is complete. Moves to step 3. Routes to `code_writer`.

5. **`code_writer` (`Rainy Agents`):**
    - Reads `AgentChatView.tsx`.
    - Creates a new component `CopyButton.tsx` with `navigator.clipboard.writeText`.
    - Modifies `AgentChatView.tsx` to import `CopyButton` and add it to the custom code renderer.
    - **Updates State:** `codeDrafts` now contains the content for `CopyButton.tsx` and the modified `AgentChatView.tsx`.

6. **Maestro (SUPERVISOR):** Sees all steps are done. Routes to **FINALIZE**.

7. **Maestro (FINALIZE):**
    - Generates a summary: "I have added a 'Copy to Clipboard' button. I created `src/components/ui/CopyButton.tsx` and updated `src/components/agents/AgentChatView.tsx` to include it."
    - **Returns `finalOutput` to the user.**

This design provides a clear path to building a powerful, high-level coding assistant that leverages the project's existing, robust architecture.
