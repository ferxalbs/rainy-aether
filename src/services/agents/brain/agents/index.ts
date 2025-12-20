/**
 * Agents Index
 * 
 * Export all agent definitions.
 */

export { codeAssistantAgent } from './codeAssistant';
export { codeReviewerAgent } from './codeReviewer';
export { documentationAgent } from './documentationAgent';

import { codeAssistantAgent } from './codeAssistant';
import { codeReviewerAgent } from './codeReviewer';
import { documentationAgent } from './documentationAgent';

export const allAgents = [
    codeAssistantAgent,
    codeReviewerAgent,
    documentationAgent,
];
