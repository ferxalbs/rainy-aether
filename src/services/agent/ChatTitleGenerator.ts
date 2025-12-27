/**
 * Chat Title Generator Service
 * 
 * Uses the AI model to generate concise, descriptive titles and descriptions
 * for chat sessions based on conversation content.
 */

import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '@/types/chat';

/**
 * Generate a title and description for a chat session
 * Uses a minimal prompt for efficiency
 */
export async function generateChatTitle(
    messages: ChatMessage[],
    apiKey: string
): Promise<{ title: string; description: string } | null> {
    // Only generate if we have at least 1 user message
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return null;

    // Get the first few messages for context (keep it minimal)
    const contextMessages = messages
        .filter(m => m.role !== 'system')
        .slice(0, 4)
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}`)
        .join('\n');

    const prompt = `Based on this conversation, generate a very short title (2-5 words) and a brief description (max 10 words).

Conversation:
${contextMessages}

Respond in this exact JSON format only (no markdown, no explanation):
{"title": "Short Title", "description": "Brief description of the topic"}`;

    try {
        const client = new GoogleGenAI({ apiKey });

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                temperature: 0.3,
                maxOutputTokens: 100,
            },
        });

        const text = response.text?.trim();
        if (!text) return null;

        // Parse JSON response
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanText);

        return {
            title: parsed.title || 'New Chat',
            description: parsed.description || '',
        };
    } catch (error) {
        console.warn('[ChatTitleGenerator] Failed to generate title:', error);
        return null;
    }
}

/**
 * Extract a simple title from the first user message
 * Fallback when API call fails
 */
export function extractSimpleTitle(messages: ChatMessage[]): string {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Chat';

    // Take first 30 chars and clean up
    let title = firstUserMessage.content.slice(0, 30).trim();

    // Remove incomplete words at the end
    if (title.length === 30) {
        const lastSpace = title.lastIndexOf(' ');
        if (lastSpace > 15) {
            title = title.slice(0, lastSpace);
        }
        title += '...';
    }

    return title || 'New Chat';
}
