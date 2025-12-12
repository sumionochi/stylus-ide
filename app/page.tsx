export default function HomePage() {
  return (
    <main className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4">
        <h1 className="text-xl font-bold text-primary">Stylus Launchpad</h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <section className="flex-1 flex flex-col border-r border-border">
          <div className="h-12 border-b border-border flex items-center px-4 gap-2">
            <span className="text-sm text-muted-foreground">lib.rs</span>
          </div>
          <div className="flex-1 bg-card">
            {/* Monaco will go here */}
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Editor Loading...
            </div>
          </div>
        </section>

        {/* Right Sidebar - AI Panel Placeholder */}
        <aside className="w-96 border-l border-border bg-card">
          <div className="h-full flex items-center justify-center text-muted-foreground">
            AI Assistant
          </div>
        </aside>
      </div>

      {/* Bottom Panel */}
      <section className="h-64 border-t border-border flex flex-col bg-card">
        <div className="h-12 border-b border-border flex items-center px-4">
          <span className="text-sm font-medium">Output</span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <p className="text-sm text-muted-foreground">Compilation output will appear here...</p>
        </div>
      </section>
    </main>
  );
}