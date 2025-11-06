# LangGraph Migration Plan

## Overview

Rainy Aether is transitioning its agent runtime from bespoke AI SDK orchestration to a LangGraph-based orchestration core. This document captures the phased implementation plan, technical decisions, and validation steps required to deliver a resilient, testable, and Groq-first workflow while preserving backward compatibility during rollout.

### Current State Summary

- Providers are wrapped around Vercel AI SDK primitives (e.g., `@ai-sdk/groq`).
- `AgentService.sendMessage` manages streaming, cost tracking, and post-hoc tool execution.
- Tool metadata is translated to JSON Schema for function calling; execution is deferred to `executeToolCalls`.
- Provider registration and credential checks live in `ProviderManager`.

### Target State Goals

1. **LangGraph Core** – Replace AI SDK streaming with a LangGraph workflow using LangChain chat models (`@langchain/groq`, `@langchain/core`, `@langchain/langgraph`).
2. **Feature-Flagged Rollout** – Introduce an opt-in flag (`agent.langgraph.enabled`) to guard new behaviour until validated.
3. **Provider Abstraction Refresh** – Convert provider metadata into LangChain model factories with reusable defaults.
4. **Tooling Integration** – Register Rainy Aether tools as LangGraph `tool(...)` instances with progress streaming via `config.writer`.
5. **Observability & Safety** – Maintain existing usage/cost telemetry and enrich logs with workflow diagnostics.

## Dependencies

The following packages (already present in `package.json`) are central to the migration:

- `@langchain/langgraph` – graph and checkpoint runtime.
- `@langchain/groq` – Groq chat model bindings for LangChain.
- `@langchain/core`, `langchain` – shared primitives, tool helpers, message utilities.
- Existing Rainy Aether tool system modules (`src/services/agent/tools/*`).

## Feature Flag Strategy

- New feature flag key: `agent.langgraph.enabled` (persisted via settings store / environment override).
- Default OFF. Gate new code paths in `AgentService.sendMessage` and session creation.
- Provide diagnostic logging when the LangGraph path is active.

## Phase Breakdown

### Phase 0 – Documentation & Scaffolding (this document)

- Document rollout strategy (completed).
- Identify required modules and interfaces.

### Phase 1 – LangGraph Workflow Scaffold

- Create `src/services/agent/langgraph/` module housing:
  - `graphFactory.ts`: builds LangGraph workflow (initially Groq-only) using `StateGraph` or `createReactAgent`.
  - `modelFactory.ts`: resolves LangChain chat models from provider configs.
  - `featureFlag.ts`: helper to read `agent.langgraph.enabled`.
  - `types.ts`: shared annotations/state definitions.
- Register Rainy Aether tools as LangGraph tools within the workflow (use no-op placeholders for advanced streaming initially).
- Expose a wrapper `runLangGraphSession` returning async iterables for streaming (values + updates) and integrate checkpoint stub (in-memory `MemorySaver`).
- Validate via unit smoke test or temporary script.

### Phase 2 – ProviderManager Refactor

- Extend provider metadata to include LangChain model ids + default params.
- Add `getLangChainModel(providerId, modelId, apiKey)` that returns configured chat model instances.
- Ensure provider validation still leverages minimal calls (possibly via LangChain) while AI SDK code remains until removed.

### Phase 3 – Agent Service Transition

- Update `AgentService.sendMessage` to branch on feature flag:
  1. Build LangGraph runner (`getLangGraphRunner(session, tools)`).
  2. Stream events, updating messages incrementally (tokens, tool progress, finish metadata).
  3. Fall back to legacy AI SDK path when feature flag disabled.
- Keep tool execution compatible by routing LangGraph tool calls through existing executor (using direct `tool()` wrappers around registry functions).
- Update cost tracking to use LangGraph event metadata or fallback heuristics.
- Include observability enhancements (debug logs, timing metrics).

### Phase 4 – Cleanup & Expansion

- Remove legacy AI SDK provider path once LangGraph stabilises.
- Support additional providers (OpenAI, Anthropic) via LangChain packages already listed in `package.json`.
- Document developer workflows in `AGENT_SYSTEM_DESIGN.md` and `README.md`.

## Testing & Validation

- **Unit Coverage**: Add tests for model factory, feature flag, and streaming integration using mocked LangChain models.
- **Integration Checks**: Manual validation via feature flag toggle in the desktop app (Groq key required).
- **Regression Monitoring**: Ensure legacy path remains unaffected when flag is false; monitor tool execution logs for parity.

## Rollout Checklist

1. Implement Phase 1 scaffold and land behind feature flag.
2. Enable flag in internal builds; collect telemetry.
3. Progress through Phase 2 and Phase 3 with guarded releases.
4. Run full regression suite (`pnpm tsc`, `pnpm dev`, desktop manual tests`).
5. Update documentation & communicate change to contributors.

---
**Status:** Phase 0 completed. Ready to begin Phase 1 implementation.
