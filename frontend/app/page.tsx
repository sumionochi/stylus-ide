'use client';

import { SetupGuide } from '@/components/setup/SetupGuide';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { ABIDialog } from '@/components/abi/ABIDialog';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { Button } from '@/components/ui/button';
import {
  Bot,
  X,
  Play,
  FileCode,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Brain,
  FileText,
  Zap,
  Rocket,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { templates, getTemplate } from '@/lib/templates';
import { useCompilation } from '@/hooks/useCompilation';
import { stripAnsiCodes, formatCompilationTime } from '@/lib/output-formatter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeployDialog } from '@/components/deploy/DeployDialog';
import { Upload } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ContractInteraction } from '@/components/interact/ContractInteraction';
import { ContractPlaceholder } from '@/components/interact/ContractPlaceholder';
import { FaucetButton } from '@/components/wallet/FaucetButton';
import { useFileTabs } from '@/hooks/useFileTabs';
import { FileTabs } from '@/components/editor/FileTabs';
import { ChatPanel } from '@/components/ai/ChatPanel';
import { usePanelState } from '@/hooks/usePanelState';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResponsive } from '@/hooks/useResponsive';
import { KeyboardShortcutHint } from '@/components/ui/KeyboardShortcutHint';
import Link from 'next/link';
import { BenchmarkDialog } from '@/components/orbit/BenchmarkDialog';
import { OrbitExplorer } from '@/components/orbit/OrbitExplorer';

const DEFAULT_CODE = `// Welcome to Stylus IDE
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::prelude::*;
use stylus_sdk::alloy_primitives::U256;

sol_storage! {
    #[entrypoint]
    pub struct MyContract {
        uint256 value;
    }
}

#[public]
impl MyContract {
    pub fn get_value(&self) -> U256 {
        self.value.get()
    }

    pub fn set_value(&mut self, new_value: U256) {
        self.value.set(new_value);
    }
}
`;

export default function HomePage() {
  const {
    showAIPanel,
    showContractPanel,
    showOutput,
    isAIPanelCollapsed,
    isContractPanelCollapsed,
    setShowAIPanel,
    setShowContractPanel,
    setShowOutput,
    toggleAIPanel,
    toggleContractPanel,
    toggleOutput,
    toggleAIPanelCollapse,
    toggleContractPanelCollapse,
  } = usePanelState();

  const { isMobile, isDesktop } = useResponsive();

  const {
    tabs,
    activeTabId,
    activeTab,
    addTab,
    removeTab,
    updateTabContent,
    setActiveTab,
    renameTab,
    getTabsCode,
  } = useFileTabs(DEFAULT_CODE);

  const [showABIDialog, setShowABIDialog] = useState(false);
  const [abiData, setAbiData] = useState<{ abi: string | null; solidity: string | null }>({
    abi: null,
    solidity: null,
  });
  const [isExportingABI, setIsExportingABI] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deployedContracts, setDeployedContracts] = useState<
    Array<{
      address: string;
      txHash?: string;
    }>
  >([]);

  const { isConnected } = useAccount();
  const [showBenchmarkDialog, setShowBenchmarkDialog] = useState(false);
  const { isCompiling, output, errors, compilationTime, sessionId, compile, clearOutput } =
    useCompilation();
  const [parsedAbi, setParsedAbi] = useState<any>(null);

  // ✅ NEW: Workspace tab (Editor vs Orbit Explorer vs ML vs Q-Learning vs Raytracing)
  const [workspaceTab, setWorkspaceTab] = useState<
    'editor' | 'orbit' | 'ml' | 'qlearning' | 'raytracing'
  >('editor');

  // ✅ Prevent hydration mismatch for responsive-based conditional rendering
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mobile = mounted ? isMobile : false;
  const desktop = mounted ? isDesktop : true;

  useEffect(() => {
    if (abiData.abi) {
      try {
        const parsed = JSON.parse(abiData.abi);
        setParsedAbi(parsed);
      } catch (e) {
        console.error('Failed to parse ABI:', e);
        setParsedAbi(null);
      }
    } else {
      setParsedAbi(null);
    }
  }, [abiData.abi]);

  const handleCompile = async () => {
    // Compile the active tab's code
    if (!activeTab) return;
    await compile(activeTab.content, true);
    // Show output panel after compilation, but respect mobile layout
    if (desktop || !showAIPanel) {
      setShowOutput(true);
    }
  };

  const handleSave = () => {
    handleCompile();
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleAI: toggleAIPanel,
    onToggleOutput: toggleOutput,
    onCompile: handleCompile,
  });

  const handleLoadTemplate = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      // Update active tab or create new one
      if (activeTab) {
        updateTabContent(activeTab.id, template.code);
      }
      clearOutput();
      setWorkspaceTab('editor');
    }
  };

  const handleNewFile = (type: 'rust' | 'toml' | 'markdown') => {
    const extensions = {
      rust: '.rs',
      toml: '.toml',
      markdown: '.md',
    };

    const languages = {
      rust: 'rust',
      toml: 'toml',
      markdown: 'markdown',
    };

    const count = tabs.filter((t) => t.name.includes(extensions[type])).length;
    const name = `new_file_${count + 1}${extensions[type]}`;

    addTab(name, '', languages[type]);
    setWorkspaceTab('editor');
  };

  const handleDeploySuccess = (contractAddress: string, txHash?: string) => {
    setDeployedContracts((prev) => [...prev, { address: contractAddress, txHash }]);
  };

  const handleExportABI = async () => {
    if (!sessionId) {
      alert('Please compile your contract first');
      return;
    }

    setIsExportingABI(true);
    try {
      const response = await fetch('/api/export-abi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      if (result.success) {
        setAbiData({
          abi: result.abi || null,
          solidity: result.solidity || null,
        });
        setShowABIDialog(true);
      } else {
        if (result.details && result.details.includes('solc not found')) {
          alert(
            'solc (Solidity compiler) is required for ABI export.\n\n' +
              'Install it:\n' +
              '• macOS: brew install solidity\n' +
              '• Linux: sudo apt-get install solc\n' +
              '• Windows: Download from github.com/ethereum/solidity/releases\n\n' +
              'Then try exporting again.'
          );
        } else {
          const errorMsg = result.details
            ? `${result.error}\n\nDetails:\n${result.details}`
            : result.error || 'Unknown error';

          console.error('ABI Export Error:', errorMsg);
          alert(`ABI export failed:\n${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('ABI Export Error:', errorMsg);
      alert(`ABI export failed: ${errorMsg}`);
    } finally {
      setIsExportingABI(false);
    }
  };

  const getOutputIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-3 w-3 shrink-0" />;
      case 'stderr':
        return <AlertTriangle className="h-3 w-3 shrink-0" />;
      case 'complete':
        return <CheckCircle2 className="h-3 w-3 shrink-0" />;
      default:
        return null;
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

  const compilationStatus = isCompiling
    ? 'compiling'
    : output.some((o) => o.type === 'complete' && o.data.includes('successful'))
      ? 'success'
      : output.some((o) => o.type === 'error' || o.type === 'complete')
        ? 'error'
        : 'idle';

  return (
    <>
      <SetupGuide />
      <ABIDialog
        open={showABIDialog}
        onOpenChange={setShowABIDialog}
        abi={abiData.abi}
        solidity={abiData.solidity}
      />
      <DeployDialog
        open={showDeployDialog}
        onOpenChange={setShowDeployDialog}
        sessionId={sessionId}
        onDeploySuccess={handleDeploySuccess}
      />

      <main className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4">
          <div className="text-lg md:text-xl font-bold text-primary">
            <Link href="/" className="text-lg md:text-xl font-bold text-primary hover:opacity-80">
              Stylus IDE
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Connect Wallet */}
            <ConnectButton />

            <FaucetButton />

            {/* Compile Button */}
            <Button onClick={handleCompile} disabled={isCompiling} size="sm" className="hidden sm:flex">
              <Play className="h-4 w-4 mr-2" />
              {isCompiling ? 'Compiling...' : 'Compile'}
            </Button>

            {/* Benchmark Button - Only show if ABI exists */}
            {abiData.abi && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBenchmarkDialog(true)}
                className="hidden lg:flex"
              >
                <Zap className="h-4 w-4 mr-2" />
                Benchmark Orbit
              </Button>
            )}

            {/* Export ABI Button */}
            <Button
              onClick={handleExportABI}
              disabled={isExportingABI || !sessionId || compilationStatus !== 'success'}
              size="sm"
              variant="outline"
              className="hidden sm:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExportingABI ? 'Exporting...' : 'Export ABI'}
            </Button>

            <Button
              onClick={() => setShowDeployDialog(true)}
              disabled={!isConnected || !sessionId || compilationStatus !== 'success'}
              size="sm"
              className="hidden sm:flex"
            >
              <Upload className="h-4 w-4 mr-2" />
              Deploy
            </Button>

            {/* Templates Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex">
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
                      <div className="text-xs text-muted-foreground">{template.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* AI Panel Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="focus-visible-ring"
              onClick={() => {
                if (mobile) {
                  toggleAIPanel();
                } else {
                  toggleAIPanelCollapse();
                }
              }}
              aria-label={
                mobile
                  ? showAIPanel
                    ? 'Close AI assistant (Esc)'
                    : 'Open AI assistant (Cmd+K)'
                  : isAIPanelCollapsed
                    ? 'Show AI assistant'
                    : 'Hide AI assistant'
              }
              title={
                mobile
                  ? showAIPanel
                    ? 'Close AI assistant (Esc)'
                    : 'Open AI assistant (Cmd+K)'
                  : isAIPanelCollapsed
                    ? 'Show AI assistant'
                    : 'Hide AI assistant'
              }
            >
              <Bot className="h-5 w-5" />
            </Button>

            {/* Contract Panel Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="focus-visible-ring"
              onClick={() => {
                if (mobile) {
                  toggleContractPanel();
                } else {
                  toggleContractPanelCollapse();
                }
              }}
              aria-label={
                mobile
                  ? showContractPanel
                    ? 'Close contract panel'
                    : 'Open contract panel'
                  : isContractPanelCollapsed
                    ? 'Show contract panel'
                    : 'Hide contract panel'
              }
              title={
                mobile
                  ? showContractPanel
                    ? 'Close contract panel'
                    : 'Open contract panel'
                  : isContractPanelCollapsed
                    ? 'Show contract panel'
                    : 'Hide contract panel'
              }
            >
              <FileText className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* ✅ Workspace Tabs Bar (Editor / Orbit Explorer / ML / Q-Learning / Raytracing) */}
        <div className="h-10 border-b border-border bg-card flex items-center px-4 gap-2">
          <Button
            size="sm"
            variant={workspaceTab === 'editor' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('editor')}
            className="h-7"
          >
            Editor
          </Button>
          <Button
            size="sm"
            variant={workspaceTab === 'orbit' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('orbit')}
            className="h-7"
          >
            Orbit Explorer
          </Button>
          <Button
            size="sm"
            variant={workspaceTab === 'ml' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('ml')}
            className="h-7"
          >
            On-chain ML Inference
          </Button>
          <Button
            size="sm"
            variant={workspaceTab === 'qlearning' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('qlearning')}
            className="h-7"
          >
            Q-Learning
          </Button>
          <Button
            size="sm"
            variant={workspaceTab === 'raytracing' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('raytracing')}
            className="h-7"
          >
            Raytracing
          </Button>
        </div>

        {/* Main Content Area with Responsive Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Primary Content Area */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            {/* ✅ Orbit Explorer Tab */}
            {workspaceTab === 'orbit' ? (
              <section className="flex-1 min-h-0 overflow-auto bg-muted/30">
                <div className="p-4 sm:p-6">
                  <OrbitExplorer />
                </div>
              </section>
            ) : workspaceTab === 'ml' ? (
              // ✅ ML Tab: embed /ml-demo as a tab view
              <section className="flex-1 min-h-0 bg-background">
                <iframe title="On-chain ML Inference" src="/ml" className="w-full h-full border-0" />
              </section>
            ) : workspaceTab === 'qlearning' ? (
              // ✅ Q-Learning Tab: embed /qlearning as a tab view
              <section className="flex-1 min-h-0 bg-background">
                <iframe title="Q-Learning" src="/qlearning" className="w-full h-full border-0" />
              </section>
            ) : workspaceTab === 'raytracing' ? (
              // ✅ Raytracing Tab: embed /raytracing as a tab view
              <section className="flex-1 min-h-0 bg-background">
                <iframe title="Raytracing" src="/raytracing" className="w-full h-full border-0" />
              </section>
            ) : (
              <>
                {/* Editor Section */}
                <section className="flex-1 flex flex-col min-h-0">
                  {/* File Tabs */}
                  <FileTabs
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabClick={setActiveTab}
                    onTabClose={removeTab}
                    onNewFile={handleNewFile}
                    onRenameTab={renameTab}
                  />

                  {/* Active Tab Toolbar */}
                  <div className="h-10 border-b border-border flex items-center justify-between px-4 gap-2">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      <span className="text-xs text-muted-foreground">
                        {tabs.length} file{tabs.length !== 1 ? 's' : ''}
                      </span>
                      {errors.length > 0 && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                          {errors.length} {errors.length === 1 ? 'error' : 'errors'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleCompile}
                        disabled={isCompiling || !activeTab}
                        size="sm"
                        className="sm:hidden h-7"
                      >
                        <Play className="h-3 w-3" />
                      </Button>

                      {/* Mobile Output Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="sm:hidden h-7"
                        onClick={toggleOutput}
                        aria-label={showOutput ? 'Hide output panel' : 'Show output panel'}
                      >
                        Output {showOutput ? '−' : '+'}
                      </Button>
                    </div>
                  </div>

                  {/* Monaco Editor */}
                  <div
                    className={`flex-1 bg-card transition-all duration-300 ${
                      showOutput ? 'min-h-0' : 'min-h-0'
                    }`}
                  >
                    {activeTab ? (
                      <MonacoEditor
                        key={activeTab.id}
                        value={activeTab.content}
                        onChange={(value) => updateTabContent(activeTab.id, value)}
                        onSave={handleSave}
                        readOnly={isCompiling}
                        errors={errors}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No file open
                      </div>
                    )}
                  </div>
                </section>

                {/* Bottom Panel - Output (Responsive) */}
                <section
                  className={`
                    border-t border-border flex flex-col bg-card
                    transition-all duration-300 ease-in-out
                    ${showOutput ? 'h-32 sm:h-40 md:h-48 lg:h-56 xl:h-64' : 'h-10 sm:h-12'}
                  `}
                >
                  <div
                    className={`${
                      showOutput ? 'h-10 sm:h-12' : 'h-10 sm:h-12'
                    } border-b border-border flex items-center justify-between px-4`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
                      <button
                        className="text-sm font-medium cursor-pointer flex items-center gap-2 hover:text-primary transition-colors"
                        onClick={toggleOutput}
                        aria-label={showOutput ? 'Hide output panel' : 'Show output panel'}
                      >
                        <span className="hidden sm:inline">Output</span>
                        <span className="sm:hidden">Out</span>
                        {compilationStatus === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                        {compilationStatus === 'error' && (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </button>

                      {output.length > 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {output.length}
                        </span>
                      )}

                      {compilationTime !== null && (
                        <span className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatCompilationTime(compilationTime)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                      {output.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearOutput}
                          className="h-7 sm:h-8 px-2 sm:px-3"
                          aria-label="Clear output"
                        >
                          <Trash2 className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Clear</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleOutput}
                        className="h-7 sm:h-8 px-2"
                        aria-label={showOutput ? 'Collapse output' : 'Expand output'}
                      >
                        {showOutput ? '−' : '+'}
                      </Button>
                    </div>
                  </div>

                  {showOutput && (
                    <div className="flex-1 overflow-auto p-2 sm:p-4 min-h-0 font-mono text-xs space-y-1 custom-scrollbar">
                      {output.length === 0 && !isCompiling && (
                        <p className="text-muted-foreground">
                          Ready to compile. Press Compile or Cmd/Ctrl+S
                        </p>
                      )}
                      {isCompiling && output.length === 0 && (
                        <p className="text-blue-400 animate-pulse">Starting compilation...</p>
                      )}
                      {output.map((item, index) => (
                        <div
                          key={index}
                          className={`flex items-start gap-2 ${getOutputColor(item.type)}`}
                        >
                          {getOutputIcon(item.type)}
                          <span className="flex-1 whitespace-pre-wrap break-anywhere">
                            {stripAnsiCodes(item.data)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          {/* Right Sidebar - AI Panel */}
          {(showAIPanel || (!isAIPanelCollapsed && desktop)) && (
            <aside
              className={`
                transition-all duration-300 ease-in-out
                ${showAIPanel && mobile ? 'fixed inset-0 z-50 bg-card' : 'hidden lg:block'}
                ${
                  isAIPanelCollapsed
                    ? 'lg:w-0 lg:min-w-0 lg:max-w-0 lg:overflow-hidden'
                    : 'lg:w-96 lg:max-w-100 lg:min-w-[320px]'
                }
                border-l border-border bg-card
                flex flex-col
              `}
            >
              {/* Mobile Header */}
              <div className="lg:hidden h-14 border-b border-border flex items-center justify-between px-4 bg-card/95 backdrop-blur-sm">
                <span className="font-semibold">AI Assistant</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAIPanel(false)}
                  aria-label="Close AI panel"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* AI Panel Content */}
              <div className="flex-1 min-h-0 lg:h-full">
                <ChatPanel
                  currentCode={activeTab?.content}
                  compilationErrors={errors}
                  onInsertCode={(code) => {
                    if (activeTab) {
                      updateTabContent(activeTab.id, code);
                    }
                  }}
                />
              </div>
            </aside>
          )}

          {/* Right Sidebar - Contract Panel */}
          {(showContractPanel || (!isContractPanelCollapsed && desktop)) && (
            <aside
              className={`
                transition-all duration-300 ease-in-out
                ${showContractPanel && mobile ? 'fixed inset-0 z-50 bg-card' : 'hidden lg:block'}
                ${
                  isContractPanelCollapsed
                    ? 'lg:w-0 lg:min-w-0 lg:max-w-0 lg:overflow-hidden'
                    : 'lg:w-96 lg:max-w-100 lg:min-w-[320px]'
                }
                border-l border-border bg-card
                flex flex-col
              `}
            >
              {/* Mobile Header */}
              <div className="lg:hidden h-14 border-b border-border flex items-center justify-between px-4 bg-card/95 backdrop-blur-sm">
                <span className="font-semibold">Contract Interaction</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowContractPanel(false)}
                  aria-label="Close contract panel"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Contract Panel Content */}
              <div className="flex-1 min-h-0 lg:h-full">
                {deployedContracts.length > 0 && abiData.abi ? (
                  <ContractInteraction
                    contractAddress={deployedContracts[deployedContracts.length - 1].address}
                    abi={abiData.abi}
                  />
                ) : (
                  <ContractPlaceholder />
                )}
              </div>
            </aside>
          )}

          {/* Mobile Overlay */}
          {(showAIPanel || showContractPanel) && (
            <div
              className="fixed inset-0 bg-background/80 panel-overlay z-40 lg:hidden"
              onClick={() => {
                setShowAIPanel(false);
                setShowContractPanel(false);
              }}
              aria-label="Close panel"
            />
          )}
        </div>

        {/* Keyboard Shortcut Helper */}
        <KeyboardShortcutHint />

        {/* Benchmark Dialog */}
        {parsedAbi && (
          <BenchmarkDialog
            open={showBenchmarkDialog}
            onOpenChange={setShowBenchmarkDialog}
            abi={parsedAbi}
            functionName="number" // Default function, can be made dynamic
            title="Multi-Chain Gas Benchmark"
            description="Deploy your contract to multiple chains and compare gas costs"
          />
        )}
      </main>
    </>
  );
}
