import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorView, rectangularSelection } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { rust } from '@codemirror/lang-rust';
import { createCustomCodeMirrorTheme } from './themes/customTheme';
import { search } from '@codemirror/search';
import { editorActions } from '../../stores/editorStore';
import { getCurrentTheme, subscribeToThemeChanges } from '../../stores/themeStore';

interface CodeMirrorEditorProps {
  value: string;
  language?: 'javascript' | 'html' | 'css' | 'markdown' | 'rust';
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  language = 'javascript',
  onChange,
  readOnly = false,
}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef<typeof onChange>(onChange);
  const themeRef = useRef(getCurrentTheme());

  const languageCompartmentRef = useRef(new Compartment());
  const themeCompartmentRef = useRef(new Compartment());
  const readOnlyCompartmentRef = useRef(new Compartment());
  const wrapCompartmentRef = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const getLanguageSupport = useCallback(() => {
    switch (language) {
      case 'javascript':
        return javascript();
      case 'html':
        return html();
      case 'css':
        return css();
      case 'markdown':
        return markdown();
      case 'rust':
        return rust();
      default:
        return javascript();
    }
  }, [language]);

  const buildTheme = useCallback(() => {
    return createCustomCodeMirrorTheme(themeRef.current);
  }, []);

  useEffect(() => {
    themeRef.current = getCurrentTheme();

    const unsubscribe = subscribeToThemeChanges((theme) => {
      themeRef.current = theme;
      const view = viewRef.current;
      if (!view) {
        return;
      }

      view.dispatch({
        effects: [
          themeCompartmentRef.current.reconfigure(buildTheme()),
        ],
      });
    });

    return unsubscribe;
  }, [buildTheme]);

  useEffect(() => {
    if (!container) {
      return;
    }

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        EditorState.allowMultipleSelections.of(false),
        rectangularSelection({ eventFilter: () => false }),
        search(),
        languageCompartmentRef.current.of(getLanguageSupport()),
        themeCompartmentRef.current.of(buildTheme()),
        wrapCompartmentRef.current.of(EditorView.lineWrapping),
        readOnlyCompartmentRef.current.of(EditorState.readOnly.of(Boolean(readOnly))),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) {
            return;
          }

          const handler = onChangeRef.current;
          if (!handler || !update.transactions.some((tr) => tr.isUserEvent('input'))) {
            return;
          }

          handler(update.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: container,
    });

    viewRef.current = view;

    editorActions.registerView(view, {
      toggleWrap: (enabled?: boolean) => {
        const current = editorActions.getWrapEnabled();
        const next = typeof enabled === 'boolean' ? enabled : !current;

        view.dispatch({
          effects: [
            wrapCompartmentRef.current.reconfigure(next ? EditorView.lineWrapping : []),
          ],
        });

        editorActions.setWrapEnabled(next);
      },
    });

    return () => {
      editorActions.unregisterView(view);
      view.destroy();
      if (viewRef.current === view) {
        viewRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();
    if (value === currentValue) {
      return;
    }

    view.dispatch({
      changes: { from: 0, to: currentValue.length, insert: value },
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    view.dispatch({
      effects: [
        languageCompartmentRef.current.reconfigure(getLanguageSupport()),
        readOnlyCompartmentRef.current.reconfigure(
          EditorState.readOnly.of(Boolean(readOnly)),
        ),
      ],
    });
  }, [getLanguageSupport, readOnly]);

  return (
    <div
      ref={setContainer}
      className="codemirror-container w-full h-full"
    />
  );
};

export default CodeMirrorEditor;