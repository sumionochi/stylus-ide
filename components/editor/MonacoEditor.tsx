'use client';

import Editor, { Monaco } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import type { editor, languages } from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  errors?: Array<{ line: number; column: number; message: string }>;
}

export function MonacoEditor({
  value,
  onChange,
  onSave,
  readOnly = false,
  errors = [],
}: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // ✅ don’t read window during render
  const [minimapEnabled, setMinimapEnabled] = useState(false);

  // avoid duplicate provider registrations (StrictMode double-mount in dev)
  const completionRegisteredRef = useRef(false);

  useEffect(() => {
    const update = () => setMinimapEnabled(window.innerWidth > 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Apply error markers when errors change
  useEffect(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed) return;

    const model = ed.getModel();
    if (!model) return;

    // Clear existing markers
    monaco.editor.setModelMarkers(model, 'rust', []);

    if (errors.length > 0) {
      const markers: editor.IMarkerData[] = errors.map((error) => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: error.line,
        startColumn: error.column,
        endLineNumber: error.line,
        endColumn: Math.max(error.column + 1, error.column + 10),
        message: error.message,
        source: 'rust',
      }));

      monaco.editor.setModelMarkers(model, 'rust', markers);
    }
  }, [errors]);

  function handleEditorDidMount(ed: editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = ed;
    monacoRef.current = monaco;

    // keep minimap in sync after mount too
    ed.updateOptions({ minimap: { enabled: minimapEnabled } });

    // Register Stylus-specific snippets (once)
    if (!completionRegisteredRef.current) {
      completionRegisteredRef.current = true;

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
            {
              label: 'entrypoint',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '#[entrypoint]',
              documentation: 'Mark struct as contract entrypoint',
              range,
            },
          ];

          return { suggestions };
        },
      };

      monaco.languages.registerCompletionItemProvider('rust', provider);
    }

    // Keyboard shortcut Cmd/Ctrl+S
    ed.addAction({
      id: 'compile-contract',
      label: 'Compile Contract',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => onSave?.(),
    });

    ed.focus();
  }

  // when minimapEnabled changes, update editor options (after mount)
  useEffect(() => {
    editorRef.current?.updateOptions({ minimap: { enabled: minimapEnabled } });
  }, [minimapEnabled]);

  function handleEditorChange(newValue: string | undefined) {
    onChange(newValue ?? '');
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="rust"
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
  );
}
