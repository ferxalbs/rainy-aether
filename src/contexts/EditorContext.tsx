/**
 * Editor Context
 * Provides Monaco editor instance to child components (like Breadcrumbs)
 * This enables proper per-group editor tracking in split views
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type * as monaco from 'monaco-editor';

interface EditorContextValue {
    editor: monaco.editor.IStandaloneCodeEditor | null;
    setEditor: (editor: monaco.editor.IStandaloneCodeEditor | null) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
    children: React.ReactNode;
}

/**
 * Provider component that holds editor instance for a specific editor group
 */
export const EditorProvider: React.FC<EditorProviderProps> = ({ children }) => {
    const [editor, setEditorState] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

    const setEditor = useCallback((newEditor: monaco.editor.IStandaloneCodeEditor | null) => {
        setEditorState(newEditor);
    }, []);

    return (
        <EditorContext.Provider value={{ editor, setEditor }}>
            {children}
        </EditorContext.Provider>
    );
};

/**
 * Hook to access the current editor instance from context
 * Returns null if used outside of EditorProvider
 */
export function useEditorContext(): EditorContextValue | null {
    return useContext(EditorContext);
}

/**
 * Hook to get just the editor (with null check)
 */
export function useEditor(): monaco.editor.IStandaloneCodeEditor | null {
    const context = useContext(EditorContext);
    return context?.editor ?? null;
}

export default EditorContext;
