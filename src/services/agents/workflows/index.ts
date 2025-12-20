/**
 * Workflows Index
 * 
 * Export all Inngest workflows for the server.
 */

import { indexCodebase } from './codebaseIndexing';
import { migrateRepo } from './largeRepoMigration';
import { indexRAG } from './ragIndexing';

export const allWorkflows = [
    indexCodebase,
    migrateRepo,
    indexRAG,
];

export { indexCodebase, migrateRepo, indexRAG };
