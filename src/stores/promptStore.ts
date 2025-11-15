/**
 * Prompt Store
 *
 * Manages saved prompt templates for AI agent interactions.
 * Provides CRUD operations for prompt gallery.
 */

import { useSyncExternalStore } from 'react';
import { saveToStore, loadFromStore } from './app-store';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'coding' | 'debugging' | 'documentation' | 'refactoring' | 'general' | 'custom';
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

interface PromptState {
  prompts: PromptTemplate[];
  isLoaded: boolean;
}

const defaultPrompts: PromptTemplate[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for best practices, bugs, and improvements',
    content: 'Please review the following code for:\n- Code quality and best practices\n- Potential bugs or issues\n- Performance optimizations\n- Security vulnerabilities\n- Suggestions for improvements',
    category: 'coding',
    tags: ['review', 'quality', 'best-practices'],
    isFavorite: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'bug-fix',
    name: 'Debug & Fix',
    description: 'Help debug and fix issues in code',
    content: 'I\'m encountering an issue in my code. Please help me:\n1. Identify the root cause of the problem\n2. Explain why it\'s happening\n3. Provide a solution with code examples\n4. Suggest ways to prevent similar issues',
    category: 'debugging',
    tags: ['debug', 'fix', 'troubleshoot'],
    isFavorite: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'add-docs',
    name: 'Add Documentation',
    description: 'Generate comprehensive documentation',
    content: 'Please generate documentation for this code including:\n- Overview and purpose\n- Parameters and return values\n- Usage examples\n- Edge cases and error handling\n- JSDoc/TSDoc comments',
    category: 'documentation',
    tags: ['docs', 'comments', 'jsdoc'],
    isFavorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'refactor',
    name: 'Refactor Code',
    description: 'Improve code structure and readability',
    content: 'Please refactor this code to:\n- Improve readability and maintainability\n- Follow SOLID principles\n- Reduce complexity\n- Extract reusable components/functions\n- Apply appropriate design patterns',
    category: 'refactoring',
    tags: ['refactor', 'clean-code', 'patterns'],
    isFavorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'explain',
    name: 'Explain Code',
    description: 'Explain what code does in detail',
    content: 'Please explain this code:\n- What it does step by step\n- Key concepts and algorithms used\n- Dependencies and interactions\n- Performance characteristics\n- Use cases and examples',
    category: 'general',
    tags: ['explain', 'understand', 'learn'],
    isFavorite: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

const initialState: PromptState = {
  prompts: defaultPrompts,
  isLoaded: false
};

let promptState: PromptState = { ...initialState };
let cachedSnapshot: PromptState = { ...initialState };

type PromptListener = () => void;

const listeners = new Set<PromptListener>();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Prompt listener error:', error);
    }
  });
};

const setState = (updater: (prev: PromptState) => PromptState) => {
  promptState = updater(promptState);
  cachedSnapshot = promptState;
  notify();
  return promptState;
};

const subscribe = (listener: PromptListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => cachedSnapshot;

export const usePromptState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const getPromptState = () => promptState;

// Initialize prompts from storage
export async function initializePrompts() {
  try {
    const savedPrompts = await loadFromStore<PromptTemplate[]>(
      'rainy-coder-prompts',
      defaultPrompts
    );

    setState((prev) => ({
      ...prev,
      prompts: savedPrompts,
      isLoaded: true
    }));

    console.log('[PromptStore] Loaded', savedPrompts.length, 'prompts');
  } catch (error) {
    console.error('[PromptStore] Failed to load prompts:', error);
    setState((prev) => ({ ...prev, isLoaded: true }));
  }
}

// Save prompts to storage
async function savePrompts() {
  try {
    await saveToStore('rainy-coder-prompts', promptState.prompts);
  } catch (error) {
    console.error('[PromptStore] Failed to save prompts:', error);
  }
}

// Create a new prompt
export async function createPrompt(
  prompt: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PromptTemplate> {
  const newPrompt: PromptTemplate = {
    ...prompt,
    id: `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  setState((prev) => ({
    ...prev,
    prompts: [...prev.prompts, newPrompt]
  }));

  await savePrompts();
  return newPrompt;
}

// Update an existing prompt
export async function updatePrompt(
  id: string,
  updates: Partial<Omit<PromptTemplate, 'id' | 'createdAt'>>
): Promise<void> {
  setState((prev) => ({
    ...prev,
    prompts: prev.prompts.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    )
  }));

  await savePrompts();
}

// Delete a prompt
export async function deletePrompt(id: string): Promise<void> {
  setState((prev) => ({
    ...prev,
    prompts: prev.prompts.filter((p) => p.id !== id)
  }));

  await savePrompts();
}

// Toggle favorite
export async function toggleFavorite(id: string): Promise<void> {
  setState((prev) => ({
    ...prev,
    prompts: prev.prompts.map((p) =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite, updatedAt: Date.now() } : p
    )
  }));

  await savePrompts();
}

// Get prompts by category
export function getPromptsByCategory(category: PromptTemplate['category']): PromptTemplate[] {
  return promptState.prompts.filter((p) => p.category === category);
}

// Get favorite prompts
export function getFavoritePrompts(): PromptTemplate[] {
  return promptState.prompts.filter((p) => p.isFavorite);
}

// Search prompts
export function searchPrompts(query: string): PromptTemplate[] {
  const lowerQuery = query.toLowerCase();
  return promptState.prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.content.toLowerCase().includes(lowerQuery) ||
      p.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}
