/**
 * Agents View - AI Chat Interface
 *
 * Fully integrated AI agent chat interface with modern UI/UX.
 * Features:
 * - Session management with chat history
 * - Real-time chat with streaming support
 * - Multiple chat modes (Fast, In-depth, Magic AI, Holistic)
 * - Model selection and configuration
 * - Responsive design optimized for IDE integration
 * - Archive and delete functionality
 */

import React from 'react';
import { AgentChatView } from '@/components/agents';

const AgentsView: React.FC = () => {
  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden">
      <AgentChatView />
    </div>
  );
};

export default AgentsView;
