/**
 * Inngest Client Configuration
 * 
 * Central Inngest client instance for all workflow definitions.
 * Event schemas provide type safety across the application.
 */

import { Inngest, EventSchemas } from 'inngest';

// Event schemas for type-safe event handling
type Events = {
    'codebase/index.requested': {
        data: {
            rootPath: string;
            projectId: string;
            options?: {
                includeNodeModules?: boolean;
                maxDepth?: number;
                filePatterns?: string[];
            };
        };
    };
    'repo/migration.requested': {
        data: {
            sourcePath: string;
            targetPath: string;
            migrationType: 'typescript' | 'eslint' | 'react-19' | 'custom';
            options?: Record<string, unknown>;
        };
    };
    'rag/index.requested': {
        data: {
            projectId: string;
            rootPath: string;
            embeddingModel?: string;
        };
    };
    'brain/task.requested': {
        data: {
            taskType: 'code-assist' | 'review' | 'document';
            input: string;
            context?: Record<string, unknown>;
            modelPreference?: 'fast' | 'smart' | 'cheap';
        };
    };
};

export const inngest = new Inngest({
    id: 'rainy-aether',
    schemas: new EventSchemas().fromRecord<Events>(),
});

export type { Events };
