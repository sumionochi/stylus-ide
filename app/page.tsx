'use client';

import { SetupGuide } from '@/components/setup/SetupGuide';
import { Button } from '@/components/ui/button';
import { Bot, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showOutput, setShowOutput] = useState(true);

  return (
    <>
      <SetupGuide />
      <main className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <h1 className="text-lg md:text-xl font-bold text-primary">Stylus IDE</h1>
          
          {/* Mobile AI Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setShowAIPanel(!showAIPanel)}
          >
            <Bot className="h-5 w-5" />
          </Button>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Editor Area */}
          <section className="flex-1 flex flex-col min-w-0">
            <div className="h-12 border-b border-border flex items-center px-4 gap-2 overflow-x-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">lib.rs</span>
            </div>
            <div className="flex-1 bg-card min-h-0">
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Editor Loading...
              </div>
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
              AI Assistant
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
            <div className="flex-1 overflow-auto p-4 min-h-0">
              <p className="text-sm text-muted-foreground">
                Compilation output will appear here...
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}