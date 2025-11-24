import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentService } from '@/services/agent/AgentService';
import { ChatMessage } from '@/types/chat';

export function useAgentChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');
    
    // Use a ref to persist the service instance across renders
    const agentServiceRef = useRef<AgentService | null>(null);

    useEffect(() => {
        if (!agentServiceRef.current) {
            agentServiceRef.current = new AgentService({
                systemPrompt: "You are a helpful coding assistant integrated into a Tauri-based IDE. You can read files, edit code, and explore the project structure.",
                model: "gemini-3-pro"
            });
        }
    }, []);

    const sendMessage = useCallback(async () => {
        if (!input.trim() || !agentServiceRef.current) return;

        const userMessageContent = input;
        setInput(''); // Clear input immediately
        setIsLoading(true);

        try {
            // Optimistically add user message to UI
            const tempUserMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'user',
                content: userMessageContent,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, tempUserMsg]);

            const response = await agentServiceRef.current.sendMessage(userMessageContent);
            
            // Update messages with the actual history from the service to ensure sync
            // or just append the response. Appending is smoother for UI.
            setMessages(prev => [...prev, response]);
        } catch (error) {
            console.error("Failed to send message:", error);
            // Optionally add an error message to the chat
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: "Sorry, I encountered an error processing your request.",
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [input]);

    const clearChat = useCallback(() => {
        if (agentServiceRef.current) {
            agentServiceRef.current.clearHistory();
            setMessages([]);
        }
    }, []);

    return {
        messages,
        input,
        setInput,
        isLoading,
        sendMessage,
        clearChat
    };
}