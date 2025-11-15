# 🧠 MAESTRO - CORE ORCHESTRATION ENGINE DESIGN

**Version**: 2.0
**Date**: November 15, 2025
**Status**: Strategic Pivot
**Author**: Gemini

---

## 1. REVISED OVERVIEW & STRATEGIC GOAL

This document outlines a new strategic direction for the agent system in Rainy Code. In response to the competitive landscape defined by autonomous systems like **Traeflare SOLO** and **Cursor 2.0**, the agent named **"Maestro" is being repositioned as the central Core Orchestration Engine**.

Maestro will no longer be just one agent among many; it will be the primary entry point for all high-level development tasks. It will function as a fully autonomous AI developer, taking natural language goals from the user, creating a comprehensive execution plan, and orchestrating a team of specialized "faculty" agents to carry out the work from start to finish.

The goal is to create a "SOLO mode" for Rainy Code, where the user can delegate complex features, refactors, or bug fixes to Maestro and observe its progress, intervening only when necessary.

## 2. NEW SYSTEM ARCHITECTURE

Maestro sits at the heart of the agent architecture. It receives user goals and delegates tasks to a set of specialized "Faculties" (the previously defined agents like `Rainy Agents` and `Claude Code`). This is a shift from a peer-to-peer agent model to a clear hierarchical/hub-and-spoke model.

```
┌──────────────────────────────────┐
│           USER GOAL              │
│ (e.g., "Implement login page")   │
└────────────────┬─────────────────┘
                 │
┌────────────────▼─────────────────┐
│      MAESTRO CORE ENGINE         │
│ (Plan, Delegate, Verify, Refine) │
└────────────────┬─────────────────┘
                 │ (Delegates Sub-tasks)
     ┌───────────┴───────────┐
     │                       │
┌────▼─────────┐      ┌──────▼───────┐
│ Code Faculty │      │ Test Faculty │
│ (Rainy Agent)│      │ (Rainy Agent)│
└────┬─────────┘      └──────┬───────┘
     │                      │
┌────▼─────────┐      ┌──────▼───────┐
│Analyze Faculty|      │ Git Faculty  │
│(Claude Code) │      │ (Rainy Agent)│
└──────────────┘      └──────────────┘
```
The "Faculties" are essentially the same specialized agents from the Master Plan, but now framed as capabilities that Maestro can invoke.

## 3. CORE CAPABILITIES (REVISED)

- **Autonomous End-to-End Workflow:** Given a high-level goal, Maestro manages the entire lifecycle: planning, coding, testing, and refinement.
- **Transparent & Interactive Planning:** Maestro generates a detailed, step-by-step plan that is presented to the user for review and potential modification before execution begins.
- **Codebase-Wide Context:** Maestro will build and maintain a deep semantic understanding of the entire project to inform its planning and execution.
- **Autonomous Execution & Self-Correction:** Maestro executes each step of the plan by delegating to the appropriate faculty. If a step fails (e.g., a test breaks or a lint error occurs), Maestro will analyze the error and attempt to fix it, looping until the step is successful or requires user intervention.
- **Live Diffing & Application:** All code modifications will be generated as diffs. The user can see these changes live and approve them for application.

## 4. AUTONOMOUS EXECUTION LOOP (LANGGRAPH)

Maestro's core logic will be a cyclical LangGraph graph representing the "Plan, Execute, Verify, Refine" loop.

### Revised State Object

The state needs to be more robust to handle autonomous operation:

```typescript
interface MaestroState {
  userInput: string;
  overallGoal: string;
  executionPlan: { step: string; status: 'pending' | 'in_progress' | 'completed' | 'failed'; details: string; error?: string }[];
  currentStepIndex: number;
  codebaseAnalysis: string; // Summary of codebase structure and relevant files
  proposedDiffs: Map<string, string>; // Keyed by file path, value is the diff
  verificationResults: { tests: string; lint: string; };
  requiresHumanInput: boolean; // Flag to pause the loop and ask the user
  history: BaseMessage[];
}
```

### Graph Workflow

1.  **PLAN (Entry Point):**
    - **Action:** Receives `userInput`.
    - **Process:** Performs an initial analysis of the codebase and the user's goal. Generates a detailed `executionPlan` and presents it to the user.
    - **Next:** Waits for user approval to start.

2.  **ORCHESTRATE (Central Hub):**
    - **Action:** Reads the `executionPlan` and `currentStepIndex`.
    - **Process:** Determines the next step. Based on the step's description (e.g., "write function X in file Y"), it selects the appropriate faculty (`Code Faculty`, `Test Faculty`, etc.).
    - **Next:** A conditional edge routes to the chosen faculty's node.

3.  **EXECUTE (Faculty Nodes):**
    - **`execute_coding_task`:** Calls the `Code Faculty` to read, write, or modify files. Generates a diff of the changes.
    - **`execute_analysis_task`:** Calls the `Analyze Faculty` to answer questions about the code.
    - **`execute_test_task`:** Calls the `Test Faculty` to run tests via the `terminal` tool.
    - **Updates State:** Each node updates the state with its results (e.g., `proposedDiffs`, `verificationResults`). If an error occurs, it populates the `error` field for the current step.

4.  **VERIFY & REFINE (Decision Point):**
    - **Action:** Examines the result of the `EXECUTE` step.
    - **Process:**
        - **If Error:** Analyzes the `error` message. Formulates a plan to fix it (e.g., "The test failed, I need to modify file Z to fix the logic"). It then re-routes to the `ORCHESTRATE` node to execute the fix. This is the **self-correction loop**.
        - **If Success:** Marks the current step as `completed`. Increments `currentStepIndex`.
    - **Next:**
        - If there are more steps, it routes back to `ORCHESTRATE`.
        - If all steps are complete, it routes to `FINALIZE`.
        - If user input is needed, it sets `requiresHumanInput` to `true` and pauses.

5.  **FINALIZE (Exit Point):**
    - **Action:** Compiles a final summary of the completed work, including all changes made.
    - **Next:** Ends the graph execution.

## 5. COMPETITIVE FEATURES INTEGRATION

To compete with Traeflare and Cursor, this design explicitly incorporates:

- **Plan Mode:** The initial `PLAN` step *is* the plan mode. The UI must render the `executionPlan` interactively.
- **Agent-First Workflow:** The entire user experience is driven by giving goals to Maestro, not by manually editing files.
- **In-App Preview/Testing:** The `Test Faculty` and `Verification` steps will leverage the integrated terminal and eventually could be connected to a live preview browser within the IDE.
- **Self-Correction:** The "Verify & Refine" loop is the core of the autonomous capability, allowing Maestro to recover from its own errors.

This revised, ambitious design positions Maestro as a true autonomous coding assistant, directly aligned with the market's leading-edge products.

