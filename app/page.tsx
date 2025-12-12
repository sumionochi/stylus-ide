'use client';

import { SetupGuide } from '@/components/setup/SetupGuide';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { Button } from '@/components/ui/button';
import { Bot, Menu, X, Play, FileCode } from 'lucide-react';
import { useState } from 'react';
import { templates, getTemplate } from '@/lib/templates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DEFAULT_CODE = `// Welcome to Stylus IDE
// Start coding your Arbitrum Stylus smart contract

use stylus_sdk::prelude::*;

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
  const [isCompiling, setIsCompiling] = useState(false);

  const handleCompile = () => {
    setIsCompiling(true);
    // Will implement in next step
    setTimeout(() => setIsCompiling(false), 2000);
  };

  const handleSave = () => {
    console.log('Save triggered');
    handleCompile();
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      setCode(template.code);
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
            {/* Mobile Close Button */}
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

          {/* Backdrop for mobile AI panel */}
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
          <div
            className="h-12 border-b border-border flex items-center justify-between px-4 cursor-pointer"
            onClick={() => setShowOutput(!showOutput)}
          >
            <span className="text-sm font-medium">Output</span>
            <Button variant="ghost" size="sm">
              {showOutput ? '−' : '+'}
            </Button>
          </div>
          
          {showOutput && (
            <div className="flex-1 overflow-auto p-4 min-h-0 font-mono text-xs">
              <p className="text-muted-foreground">
                {isCompiling
                  ? '> Compiling...\n> Please wait...'
                  : '> Ready to compile\n> Press Compile or Cmd/Ctrl+S'}
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}