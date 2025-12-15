'use client';

import Editor, { Monaco } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import type { editor, languages, IDisposable } from 'monaco-editor';
import { AICompletionPopup } from '../ai/AICompletionPopup';
import { useAICompletion } from '@/hooks/useAICompletion';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  errors?: Array<{ line: number; column: number; message: string }>;
  language?: string;
}

export function MonacoEditor({
  value,
  onChange,
  onSave,
  readOnly = false,
  errors = [],
  language = 'rust',
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const [showCompletion, setShowCompletion] = useState(false);
  const [completionPosition, setCompletionPosition] = useState({ top: 0, left: 0 });

  const { isLoading, completion, generateCompletion, clearCompletion } = useAICompletion();

  // ✅ SSR-safe minimap enablement
  const [minimapEnabled, setMinimapEnabled] = useState(false);

  // (optional but nice) avoid provider leaks / duplicates across unmounts
  const completionProviderDisposableRef = useRef<IDisposable | null>(null);

  useEffect(() => {
    const update = () => setMinimapEnabled(window.innerWidth > 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // keep minimap synced after mount + on resize changes
  useEffect(() => {
    editorRef.current?.updateOptions({ minimap: { enabled: minimapEnabled } });
  }, [minimapEnabled]);

  // cleanup any registered provider on unmount (prevents StrictMode duplicates)
  useEffect(() => {
    return () => {
      completionProviderDisposableRef.current?.dispose?.();
      completionProviderDisposableRef.current = null;
    };
  }, []);

  // Apply error markers when errors change
  useEffect(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed) return;

    const model = ed.getModel();
    if (!model) return;

    const owner = 'stylus-errors';
    monaco.editor.setModelMarkers(model, owner, []);

    if (errors.length > 0) {
      const markers: editor.IMarkerData[] = errors.map((error) => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: error.line,
        startColumn: error.column,
        endLineNumber: error.line,
        endColumn: Math.max(error.column + 1, error.column + 10),
        message: error.message,
        source: language,
      }));

      monaco.editor.setModelMarkers(model, owner, markers);
    }
  }, [errors, language]);

  // Handle keyboard shortcuts for completion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && showCompletion) {
        setShowCompletion(false);
        clearCompletion();
      }

      // Tab to accept
      if (e.key === 'Tab' && showCompletion && completion) {
        e.preventDefault();
        handleAcceptCompletion(completion);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCompletion, completion, clearCompletion]);

  function handleEditorDidMount(ed: editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = ed;
    monacoRef.current = monaco;

    // ✅ ensure minimap is correct immediately after mount
    ed.updateOptions({ minimap: { enabled: minimapEnabled } });

    // Register Stylus-specific snippets (and avoid duplicates)
    if (!completionProviderDisposableRef.current) {
      const provider: languages.CompletionItemProvider = {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: languages.CompletionItem[] = [
            {
              label: 'sol_storage',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                'sol_storage! {',
                '    #[entrypoint]',
                '    pub struct ${1:ContractName} {',
                '        ${2:// Add storage variables}',
                '    }',
                '}',
              ].join('\n'),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Stylus storage macro',
              range,
            },
            {
              label: '#[public]',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                '#[public]',
                'impl ${1:ContractName} {',
                '    pub fn ${2:function_name}(&self) -> ${3:ReturnType} {',
                '        ${4:// Implementation}',
                '    }',
                '}',
              ].join('\n'),
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Stylus public implementation',
              range,
            },
          ];

          return { suggestions };
        },
      };

      completionProviderDisposableRef.current =
        monaco.languages.registerCompletionItemProvider('rust', provider);
    }

    // AI Completion - Ctrl/Cmd + K
    ed.addAction({
      id: 'ai-complete',
      label: 'AI Complete',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      run: () => {
        handleAIComplete();
      },
    });

    // Compile - Ctrl/Cmd + S
    ed.addAction({
      id: 'compile-contract',
      label: 'Compile Contract',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => onSave?.(),
    });

    ed.focus();
  }

  function handleEditorChange(newValue: string | undefined) {
    onChange(newValue || '');
  }

  async function handleAIComplete() {
    if (!editorRef.current) return;

    const position = editorRef.current.getPosition();
    if (!position) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    // Get current line text
    const lineContent = model.getLineContent(position.lineNumber);
    const currentLineText = lineContent.substring(0, position.column - 1);

    // Get context (previous 20 lines)
    const startLine = Math.max(1, position.lineNumber - 20);
    const contextRange = {
      startLineNumber: startLine,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    };
    const context = model.getValueInRange(contextRange);

    // Calculate popup position
    const coords = editorRef.current.getScrolledVisiblePosition(position);
    if (coords) {
      const editorDom = editorRef.current.getDomNode();
      if (editorDom) {
        const rect = editorDom.getBoundingClientRect();
        setCompletionPosition({
          top: rect.top + coords.top + coords.height + 5,
          left: rect.left + coords.left,
        });
      }
    }

    setShowCompletion(true);
    await generateCompletion(currentLineText, context);
  }

  function handleAcceptCompletion(completionText: string) {
    if (!editorRef.current) return;

    const position = editorRef.current.getPosition();
    if (!position) return;

    // Insert completion at current position
    const range = {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    };

    editorRef.current.executeEdits('ai-completion', [
      {
        range,
        text: completionText,
        forceMoveMarkers: true,
      },
    ]);

    setShowCompletion(false);
    clearCompletion();
    editorRef.current.focus();
  }

  function handleRejectCompletion() {
    setShowCompletion(false);
    clearCompletion();
    editorRef.current?.focus();
  }

  return (
    <>
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minimap: { enabled: minimapEnabled }, // ✅ no window here
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          formatOnPaste: true,
          formatOnType: true,
          rulers: [80, 100],
          wordWrap: 'on',
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          bracketPairColorization: { enabled: true },
        }}
      />

      <AICompletionPopup
        visible={showCompletion}
        position={completionPosition}
        onAccept={handleAcceptCompletion}
        onReject={handleRejectCompletion}
        isLoading={isLoading}
        completion={completion}
      />
    </>
  );
}
