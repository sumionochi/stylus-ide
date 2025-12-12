'use client';

import { Editor, OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import type { editor } from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

export function MonacoEditor({ value, onChange, onSave, readOnly = false }: MonacoEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure Rust language
    monaco.languages.register({ id: 'rust' });

    // Add Stylus-specific snippets
    monaco.languages.registerCompletionItemProvider('rust', {
      provideCompletionItems: () => {
        return {
          suggestions: [
            {
              label: 'stylus_entrypoint',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: [
                'use stylus_sdk::prelude::*;',
                '',
                '#[storage]',
                '#[entrypoint]',
                'pub struct ${1:ContractName} {',
                '    ${2:// Add storage fields here}',
                '}',
                '',
                '#[public]',
                'impl ${1:ContractName} {',
                '    ${3:// Add public functions here}',
                '}',
              ].join('\n'),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Stylus contract entrypoint template',
            },
          ],
        };
      },
    });

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: window.innerWidth > 768 },
      fontSize: 14,
      lineNumbers: 'on',
      rulers: [80, 100],
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
    });
  };

  // Update minimap on resize
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        editorRef.current.updateOptions({
          minimap: { enabled: window.innerWidth > 768 },
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Editor
      height="100%"
      defaultLanguage="rust"
      theme="vs-dark"
      value={value}
      onChange={(val) => onChange(val || '')}
      onMount={handleEditorDidMount}
      options={{
        readOnly,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: true,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
      loading={
        <div className="h-full flex items-center justify-center bg-card">
          <div className="text-muted-foreground">Loading editor...</div>
        </div>
      }
    />
  );
}