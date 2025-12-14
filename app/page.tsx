'use client';

import { SetupGuide } from '@/components/setup/SetupGuide';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { Button } from '@/components/ui/button';
import { Bot, X, Play, FileCode, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { templates, getTemplate } from '@/lib/templates';
import { useCompilation } from '@/hooks/useCompilation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DEFAULT_CODE = `// Welcome to Stylus IDE
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::prelude::*;
use stylus_sdk::alloy_primitives::U256;

#[global_allocator]
static ALLOC: mini_alloc::MiniAlloc = mini_alloc::MiniAlloc::INIT;

#[storage]
#[entrypoint]
pub struct MyContract {
    // Add your storage here
}

#[public]
impl MyContract {
    // Add your public functions here
}
`;

export default function HomePage() {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [code, setCode] = useState(DEFAULT_CODE);
  const { isCompiling, output, compile, clearOutput } = useCompilation();

  const handleCompile = async () => {
    await compile(code, true); // Use streaming
    setShowOutput(true);
  };

  const handleSave = () => {
    handleCompile();
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      setCode(template.code);
      clearOutput();
    }
  };

  const getOutputColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'stderr':
        return 'text-yellow-400';
      case 'complete':
        return 'text-green-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <>
      <SetupGuide />
      <main className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <h1 className="text-lg md:text-xl font-bold text-primary">Stylus IDE</h1>
          
          <div className="flex items-center gap-2">
            {/* Compile Button */}
            <Button
              onClick={handleCompile}
              disabled={isCompiling}
              size="sm"
              className="hidden sm:flex"
            >
              <Play className="h-4 w-4 mr-2" />
              {isCompiling ? 'Compiling...' : 'Compile'}
            </Button>

            {/* Templates Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <FileCode className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {templates.map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => handleLoadTemplate(template.id)}
                  >
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {template.description}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile AI Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setShowAIPanel(!showAIPanel)}
            >
              <Bot className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Editor Area */}
          <section className="flex-1 flex flex-col min-w-0">
            {/* Editor Toolbar */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 gap-2">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  lib.rs
                </span>
              </div>

              {/* Mobile Compile Button */}
              <Button
                onClick={handleCompile}
                disabled={isCompiling}
                size="sm"
                className="sm:hidden"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 bg-card min-h-0">
              <MonacoEditor
                value={code}
                onChange={setCode}
                onSave={handleSave}
                readOnly={isCompiling}
              />
            </div>
          </section>

          {/* Right Sidebar - AI Panel */}
          <aside
            className={`
              fixed lg:relative inset-y-0 right-0 z-40
              w-full sm:w-96 lg:w-96
              border-l border-border bg-card
              transform transition-transform duration-300 ease-in-out
              ${showAIPanel ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}
          >
            <div className="lg:hidden h-14 border-b border-border flex items-center justify-between px-4">
              <span className="font-semibold">AI Assistant</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIPanel(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              AI Assistant (Coming Soon)
            </div>
          </aside>

          {/* Backdrop */}
          {showAIPanel && (
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setShowAIPanel(false)}
            />
          )}
        </div>

        {/* Bottom Panel - Output */}
        <section
          className={`
            border-t border-border flex flex-col bg-card
            transition-all duration-300
            ${showOutput ? 'h-48 md:h-64' : 'h-12'}
          `}
        >
          <div className="h-12 border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium cursor-pointer"
                onClick={() => setShowOutput(!showOutput)}
              >
                Output
              </span>
              {output.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {output.length}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {output.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearOutput}
                  className="h-8"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOutput(!showOutput)}
              >
                {showOutput ? '−' : '+'}
              </Button>
            </div>
          </div>
          
          {showOutput && (
            <div className="flex-1 overflow-auto p-4 min-h-0 font-mono text-xs space-y-1">
              {output.length === 0 && !isCompiling && (
                <p className="text-muted-foreground">
                  Ready to compile. Press Compile or Cmd/Ctrl+S
                </p>
              )}
              {isCompiling && output.length === 0 && (
                <p className="text-blue-400 animate-pulse">
                  Starting compilation...
                </p>
              )}
              {output.map((item, index) => (
                <div key={index} className={getOutputColor(item.type)}>
                  {item.data}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}