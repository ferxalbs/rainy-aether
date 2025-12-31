/**
 * Agents Index
 * 
 * Export all agent definitions.
 */

export { codeAssistantAgent } from './codeAssistant';
export { codeReviewerAgent } from './codeReviewer';
export { documentationAgent } from './documentationAgent';
export { plannerAgent } from './plannerAgent';

import { codeAssistantAgent } from './codeAssistant';
import { codeReviewerAgent } from './codeReviewer';
import { documentationAgent } from './documentationAgent';
import { plannerAgent } from './plannerAgent';

export const allAgents = [
    plannerAgent,
    codeAssistantAgent,
    codeReviewerAgent,
    documentationAgent,
];
