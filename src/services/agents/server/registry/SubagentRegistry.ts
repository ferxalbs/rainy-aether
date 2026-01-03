/**
 * Subagent Registry
 * 
 * Central registry for managing all subagents with CRUD operations,
 * priority resolution, and multi-source loading.
 */

import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
    SubagentConfig,
    SubagentConfigSchema,
    CreateSubagentConfig,
    UpdateSubagentConfig,
    SubagentScope,
    validateSubagentConfig,
    type SubagentValidationResult,
} from '../types/SubagentConfig';

// ===========================
// Registry Class
// ===========================

export class SubagentRegistry {
    private agents: Map<string, SubagentConfig> = new Map();
    private projectPath: string | null = null;
    private userPath: string;
    private isInitialized = false;

    constructor() {
        this.userPath = join(homedir(), '.rainy', 'agents');
        this.ensureDirectoryExists(this.userPath);
    }

    // ===========================
    // Initialization
    // ===========================

    /**
     * Set project-specific path for project-scoped agents
     */
    setProjectPath(path: string): void {
        this.projectPath = join(path, '.rainy', 'agents');
        this.ensureDirectoryExists(this.projectPath);
    }

    /**
     * Load all agents from all sources
     * Priority: project > user > plugin
     */
    async loadAll(): Promise<{ count: number; errors: string[] }> {
        this.agents.clear();
        const errors: string[] = [];

        // Load user-level agents (lowest priority)
        const userErrors = await this.loadFromDirectory(this.userPath, 'user');
        errors.push(...userErrors);

        // Load project-level agents (highest priority, overrides user)
        if (this.projectPath) {
            const projectErrors = await this.loadFromDirectory(this.projectPath, 'project');
            errors.push(...projectErrors);
        }

        this.isInitialized = true;
        console.log(`[SubagentRegistry] Loaded ${this.agents.size} subagents`);

        return {
            count: this.agents.size,
            errors,
        };
    }

    /**
     * Ensure registry is initialized
     */
    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error('SubagentRegistry not initialized. Call loadAll() first.');
        }
    }

    // ===========================
    // File I/O
    // ===========================

    /**
     * Load agents from a directory
     */
    private async loadFromDirectory(dir: string, scope: SubagentScope): Promise<string[]> {
        const errors: string[] = [];

        if (!existsSync(dir)) {
            return errors;
        }

        const files = readdirSync(dir).filter(f => f.endsWith('.md'));

        for (const file of files) {
            try {
                const filePath = join(dir, file);
                const content = readFileSync(filePath, 'utf-8');
                const agent = this.parseAgentFile(content, scope);

                // Priority resolution: project > user
                const existing = this.agents.get(agent.id);
                if (!existing || this.shouldReplace(existing, agent)) {
                    this.agents.set(agent.id, agent);
                }
            } catch (error) {
                const errorMsg = `Failed to load ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                console.error(`[SubagentRegistry] ${errorMsg}`);
                errors.push(errorMsg);
            }
        }

        return errors;
    }

    /**
     * Parse agent file (YAML frontmatter + markdown)
     */
    private parseAgentFile(content: string, scope: SubagentScope): SubagentConfig {
        const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)$/);
        if (!match) {
            throw new Error('Invalid agent file format. Expected YAML frontmatter followed by markdown content.');
        }

        const frontmatter = parseYAML(match[1]);
        const systemPrompt = match[2].trim();

        const config = SubagentConfigSchema.parse({
            ...frontmatter,
            systemPrompt,
            scope,
            updatedAt: new Date().toISOString(),
        });

        return config;
    }

    /**
     * Serialize agent to file format
     */
    private serializeAgent(config: SubagentConfig): string {
        const { systemPrompt, ...frontmatter } = config;
        const yaml = stringifyYAML(frontmatter);
        return `---\n${yaml}---\n\n${systemPrompt}`;
    }

    /**
     * Ensure directory exists
     */
    private ensureDirectoryExists(dir: string): void {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Determine if new agent should replace existing one
     */
    private shouldReplace(existing: SubagentConfig, newAgent: SubagentConfig): boolean {
        // Project-level takes precedence over user-level
        const scopePriority = { project: 2, user: 1, plugin: 0 };
        return scopePriority[newAgent.scope] > scopePriority[existing.scope];
    }

    // ===========================
    // CRUD Operations
    // ===========================

    /**
     * Get agent by ID
     */
    get(id: string): SubagentConfig | undefined {
        this.ensureInitialized();
        return this.agents.get(id);
    }

    /**
     * Get all agents
     */
    getAll(): SubagentConfig[] {
        this.ensureInitialized();
        return Array.from(this.agents.values());
    }

    /**
     * Get enabled agents only
     */
    getEnabled(): SubagentConfig[] {
        return this.getAll().filter(a => a.enabled);
    }

    /**
     * Get agents by scope
     */
    getByScope(scope: SubagentScope): SubagentConfig[] {
        return this.getAll().filter(a => a.scope === scope);
    }

    /**
     * Create new agent
     */
    async create(config: CreateSubagentConfig): Promise<SubagentConfig> {
        // Validate config
        const validation = validateSubagentConfig(config);
        if (!validation.valid) {
            throw new Error(`Invalid subagent config: ${validation.errors.join(', ')}`);
        }

        // Check if ID already exists
        if (this.agents.has(config.id)) {
            throw new Error(`Subagent with ID '${config.id}' already exists`);
        }

        // Create full config with timestamps
        const fullConfig: SubagentConfig = SubagentConfigSchema.parse({
            ...config,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageCount: 0,
        });

        // Save to filesystem
        await this.save(fullConfig);

        return fullConfig;
    }

    /**
     * Update existing agent
     */
    async update(updates: UpdateSubagentConfig): Promise<SubagentConfig> {
        this.ensureInitialized();

        const existing = this.agents.get(updates.id);
        if (!existing) {
            throw new Error(`Subagent with ID '${updates.id}' not found`);
        }

        // Merge updates
        const updated: SubagentConfig = SubagentConfigSchema.parse({
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
        });

        // Validate
        const validation = validateSubagentConfig(updated);
        if (!validation.valid) {
            throw new Error(`Invalid subagent config: ${validation.errors.join(', ')}`);
        }

        // Save to filesystem
        await this.save(updated);

        return updated;
    }

    /**
     * Save agent to filesystem
     */
    async save(config: SubagentConfig): Promise<void> {
        const dir = config.scope === 'project' ? this.projectPath : this.userPath;
        if (!dir) {
            throw new Error('Project path not set for project-scoped agent');
        }

        this.ensureDirectoryExists(dir);

        const filePath = join(dir, `${config.id}.md`);
        const content = this.serializeAgent(config);

        writeFileSync(filePath, content, 'utf-8');
        this.agents.set(config.id, config);

        console.log(`[SubagentRegistry] Saved agent '${config.id}' to ${filePath}`);
    }

    /**
     * Delete agent
     */
    async delete(id: string): Promise<boolean> {
        this.ensureInitialized();

        const agent = this.agents.get(id);
        if (!agent) {
            return false;
        }

        // Prevent deletion of plugin agents
        if (agent.scope === 'plugin') {
            throw new Error('Cannot delete plugin-provided agents');
        }

        const dir = agent.scope === 'project' ? this.projectPath : this.userPath;
        if (!dir) {
            return false;
        }

        const filePath = join(dir, `${agent.id}.md`);
        if (existsSync(filePath)) {
            unlinkSync(filePath);
        }

        this.agents.delete(id);
        console.log(`[SubagentRegistry] Deleted agent '${id}'`);

        return true;
    }

    // ===========================
    // Query Operations
    // ===========================

    /**
     * Search agents by query
     */
    search(query: string): SubagentConfig[] {
        this.ensureInitialized();

        const lowerQuery = query.toLowerCase();
        return this.getEnabled().filter(agent =>
            agent.name.toLowerCase().includes(lowerQuery) ||
            agent.description.toLowerCase().includes(lowerQuery) ||
            agent.keywords.some(k => k.toLowerCase().includes(lowerQuery)) ||
            agent.tags.some(t => t.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Find agents matching keywords
     */
    findByKeywords(keywords: string[]): SubagentConfig[] {
        this.ensureInitialized();

        const lowerKeywords = keywords.map(k => k.toLowerCase());
        return this.getEnabled().filter(agent =>
            agent.keywords.some(k =>
                lowerKeywords.some(lk => k.toLowerCase().includes(lk))
            )
        );
    }

    /**
     * Get agents by tag
     */
    findByTag(tag: string): SubagentConfig[] {
        this.ensureInitialized();

        return this.getEnabled().filter(agent =>
            agent.tags.includes(tag)
        );
    }

    /**
     * Get agents sorted by priority
     */
    getByPriority(): SubagentConfig[] {
        return this.getEnabled().sort((a, b) => b.priority - a.priority);
    }

    /**
     * Get agents sorted by usage
     */
    getByUsage(): SubagentConfig[] {
        return this.getEnabled().sort((a, b) => b.usageCount - a.usageCount);
    }

    // ===========================
    // Analytics
    // ===========================

    /**
     * Increment usage counter for an agent
     */
    async incrementUsage(id: string): Promise<void> {
        const agent = this.agents.get(id);
        if (!agent) return;

        agent.usageCount++;
        agent.updatedAt = new Date().toISOString();

        await this.save(agent);
    }

    /**
     * Update success rate for an agent
     */
    async updateSuccessRate(id: string, successRate: number): Promise<void> {
        const agent = this.agents.get(id);
        if (!agent) return;

        agent.successRate = Math.max(0, Math.min(1, successRate));
        agent.updatedAt = new Date().toISOString();

        await this.save(agent);
    }

    // ===========================
    // Validation
    // ===========================

    /**
     * Validate an agent configuration
     */
    validate(config: unknown): SubagentValidationResult {
        return validateSubagentConfig(config);
    }

    /**
     * Check if an agent ID exists
     */
    exists(id: string): boolean {
        this.ensureInitialized();
        return this.agents.has(id);
    }

    // ===========================
    // Utility
    // ===========================

    /**
     * Get registry statistics
     */
    getStats(): {
        total: number;
        enabled: number;
        disabled: number;
        byScope: Record<SubagentScope, number>;
        byModel: Record<string, number>;
    } {
        this.ensureInitialized();

        const all = this.getAll();
        const byScope: Record<SubagentScope, number> = {
            user: 0,
            project: 0,
            plugin: 0,
        };
        const byModel: Record<string, number> = {};

        for (const agent of all) {
            byScope[agent.scope]++;
            byModel[agent.model] = (byModel[agent.model] || 0) + 1;
        }

        return {
            total: all.length,
            enabled: this.getEnabled().length,
            disabled: all.filter(a => !a.enabled).length,
            byScope,
            byModel,
        };
    }

    /**
     * Clear all agents from registry (for testing)
     */
    clear(): void {
        this.agents.clear();
        this.isInitialized = false;
    }
}

// ===========================
// Singleton Instance
// ===========================

export const subagentRegistry = new SubagentRegistry();
