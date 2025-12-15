'use client';

import { SetupGuide } from '@/components/setup/SetupGuide';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { ABIDialog } from '@/components/abi/ABIDialog';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { Button } from '@/components/ui/button';
import { Bot, X, Play, FileCode, Trash2, Clock, CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';
import { useState } from 'react';
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
import { FaucetButton } from '@/components/wallet/FaucetButton';
import { useFileTabs } from '@/hooks/useFileTabs';
import { FileTabs } from '@/components/editor/FileTabs';

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
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const {
    tabs,
    activeTabId,
    activeTab,
    addTab,
    removeTab,
    updateTabContent,
    setActiveTab,
    getTabsCode,
  } = useFileTabs(DEFAULT_CODE);
  const [showABIDialog, setShowABIDialog] = useState(false);
  const [abiData, setAbiData] = useState<{ abi: string | null; solidity: string | null }>({
    abi: null,
    solidity: null,
  });
  const [isExportingABI, setIsExportingABI] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deployedContracts, setDeployedContracts] = useState<Array<{
    address: string;
    txHash?: string;
  }>>([]);

  const { isConnected } = useAccount();
  
  const { isCompiling, output, errors, compilationTime, sessionId, compile, clearOutput } = useCompilation();

  const handleCompile = async () => {
    // Compile the active tab's code
    if (!activeTab) return;
    await compile(activeTab.content, true);
    setShowOutput(true);
  };
  
  const handleSave = () => {
    handleCompile();
  };
  
  const handleLoadTemplate = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      // Update active tab or create new one
      if (activeTab) {
        updateTabContent(activeTab.id, template.code);
      }
      clearOutput();
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
          <h1 className="text-lg md:text-xl font-bold text-primary">Stylus IDE</h1>
          
          <div className="flex items-center gap-2">
            {/* Connect Wallet */}
            <ConnectButton />

            <FaucetButton />

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

        {/* Main Content - Same as before */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Editor Area */}
          <section className="flex-1 flex flex-col min-w-0">
            {/* File Tabs */}
            <FileTabs
              tabs={tabs}
              activeTabId={activeTabId}
              onTabClick={setActiveTab}
              onTabClose={removeTab}
              onNewFile={handleNewFile}
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

              <Button
                onClick={handleCompile}
                disabled={isCompiling || !activeTab}
                size="sm"
                className="sm:hidden h-7"
              >
                <Play className="h-3 w-3" />
              </Button>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 bg-card min-h-0">
              {activeTab ? (
                <MonacoEditor
                  key={activeTab.id} // Force re-render on tab change
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

          {/* Right Sidebar - AI Panel / Contract Interaction */}
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
              <span className="font-semibold">
                {deployedContracts.length > 0 ? 'Contract' : 'AI Assistant'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIPanel(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="h-full">
              {deployedContracts.length > 0 && abiData.abi ? (
                <ContractInteraction
                  contractAddress={deployedContracts[deployedContracts.length - 1].address}
                  abi={abiData.abi}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  AI Assistant (Coming in Phase 3)
                </div>
              )}
            </div>
          </aside>

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
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
                onClick={() => setShowOutput(!showOutput)}
              >
                Output
                {compilationStatus === 'success' && (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                )}
                {compilationStatus === 'error' && (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
              </span>
              
              {output.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {output.length}
                </span>
              )}

              {compilationTime !== null && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatCompilationTime(compilationTime)}
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
                <div
                  key={index}
                  className={`flex items-start gap-2 ${getOutputColor(item.type)}`}
                >
                  {getOutputIcon(item.type)}
                  <span className="flex-1 whitespace-pre-wrap wrap-break-words">
                    {stripAnsiCodes(item.data)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}