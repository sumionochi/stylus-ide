'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  FileCode,
  FileText,
  MoreVertical,
  Play,
  Trash2,
  Upload,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { parseURL } from '@/lib/url-parser';
import { useGitHubLoader } from '@/hooks/useGitHubLoader';
import { GitHubLoadingDialog } from '@/components/github/GitHubLoadingDialog';
import { SetupGuide } from '@/components/setup/SetupGuide';
import { MonacoEditor } from '@/components/editor/MonacoEditor';
import { ABIDialog } from '@/components/abi/ABIDialog';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { FaucetButton } from '@/components/wallet/FaucetButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeployDialog } from '@/components/deploy/DeployDialog';
import { ContractInteraction } from '@/components/interact/ContractInteraction';
import { ContractPlaceholder } from '@/components/interact/ContractPlaceholder';
import { FileTabs } from '@/components/editor/FileTabs';
import { ChatPanel } from '@/components/ai/ChatPanel';
import { KeyboardShortcutHint } from '@/components/ui/KeyboardShortcutHint';
import { BenchmarkDialog } from '@/components/orbit/BenchmarkDialog';
import { OrbitExplorer } from '@/components/orbit/OrbitExplorer';
import { ProjectActions } from '@/components/project/ProjectActions';
import { getFileByPath, buildFileTree } from '@/lib/project-manager';
import { FileTree } from '@/components/file-tree/FileTree';
import { useProjectState } from '@/hooks/useProjectState';
import { templates, getTemplate } from '@/lib/templates';
import { stripAnsiCodes, formatCompilationTime } from '@/lib/output-formatter';
import { useCompilation } from '@/hooks/useCompilation';
import { useFileTabs } from '@/hooks/useFileTabs';
import { usePanelState } from '@/hooks/usePanelState';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResponsive } from '@/hooks/useResponsive';
import { ProjectState } from '@/types/project';
import { toast } from 'sonner';
import { LoadFromGitHubDialog } from '@/components/github/LoadFromGitHubDialog';
import { FileTreeSkeleton } from '@/components/file-tree/FileTreeSkeleton';
import { GitHubMetadataBanner } from '@/components/github/GitHubMetadataBanner';
import { useBlockchainLoader } from '@/hooks/useBlockchainLoader';
import { BlockchainLoadingDialog } from '@/components/blockchain/BlockchainLoadingDialog';
import { ContractInteractionData } from '@/types/blockchain';
import { BlockchainContractBanner } from '@/components/blockchain/BlockchainContractBanner';

const DEFAULT_CODE = `// Welcome to Stylus IDE - Multi-File Project

#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::prelude::*;
use stylus_sdk::alloy_primitives::U256;

sol_storage! {
  #[entrypoint]
  pub struct Counter {
    uint256 count;
  }
}

#[public]
impl Counter {
  pub fn get(&self) -> U256 {
    self.count.get()
  }

  pub fn increment(&mut self) {
    let count = self.count.get();
    self.count.set(count + U256::from(1));
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

  // NEW: Project state management for multi-file support
  const {
    project,
    setProject,      // ✅ ADD THIS
    setActive,
    toggleFolder,
    updateContent,
    createNewFile,
    createNewFolder,
    getCurrentFile,
    removeFile,
    removeFolder,
    rename,
    duplicateFile,
    manualSave,      // ✅ ADD THIS
    resetProject,    // ✅ ADD THIS
  } = useProjectState();

  const {
    tabs,
    activeTabId,
    activeTab,
    addTab,
    removeTab,
    updateTabContent,
    setActiveTab,
    renameTab,
    openOrActivateTab,
    getTabByPath,
  } = useFileTabs(DEFAULT_CODE);

  const [showABIDialog, setShowABIDialog] = useState(false);
  const [abiData, setAbiData] = useState<{ abi: string | null; solidity: string | null }>({
    abi: null,
    solidity: null,
  });
  const [isExportingABI, setIsExportingABI] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deployedContracts, setDeployedContracts] = useState<Array<{ address: string; txHash?: string }>>(
    []
  );

  const { isConnected } = useAccount();

  const [showBenchmarkDialog, setShowBenchmarkDialog] = useState(false);
  const { isCompiling, output, errors, compilationTime, sessionId, compile, clearOutput } =
    useCompilation();

  const [parsedAbi, setParsedAbi] = useState<any>(null);
  const { isLoading: isLoadingGitHub, progress: githubProgress, loadFromGitHub } = useGitHubLoader();
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const { isLoading: isLoadingBlockchain, progress: blockchainProgress, loadFromBlockchain } = useBlockchainLoader();
  const [showBlockchainDialog, setShowBlockchainDialog] = useState(false);
  const [loadedContract, setLoadedContract] = useState<ContractInteractionData | null>(null);

  const [workspaceTab, setWorkspaceTab] = useState<
    'editor' | 'orbit' | 'ml' | 'qlearning' | 'raytracing'
  >('editor');

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mobile = mounted ? isMobile : false;
  const desktop = mounted ? isDesktop : true;

  useEffect(() => {
    if (!mounted) return;
    const anyMobileOverlayOpen = mobile && (showAIPanel || showContractPanel);
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyMobileOverlayOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted, mobile, showAIPanel, showContractPanel]);

  // NEW: Check URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const url = searchParams.get('url');

    if (url) {
      // ✅ UPDATED: Build full URL with query params
      const branch = searchParams.get('branch');
      const file = searchParams.get('file');
      const path = searchParams.get('path');

      let fullUrl = url;
      const params = new URLSearchParams();

      if (branch) params.set('branch', branch);
      if (file) params.set('file', file);
      if (path) params.set('path', path);

      if (params.toString()) {
        fullUrl += (url.includes('?') ? '&' : '?') + params.toString();
      }

      handleURLLoad(fullUrl);
    }
  }, []);

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

  // Update the existing handleURLLoad function
  // Update the existing handleURLLoad function
  const handleURLLoad = async (url: string) => {
    const parsed = parseURL(url);

    if (parsed.type === 'github') {
      setShowGitHubDialog(true);

      try {
        const project = await loadFromGitHub(parsed);

        if (project) {
          // Load project into IDE
          setProject(project);

          // Build file tree structure from files
          const updatedProject = {
            ...project,
            structure: buildFileTree(project.files),
          };
          setProject(updatedProject);

          // Open first Rust file in tab
          const firstRustFile = project.files.find((f) => f.language === 'rust' && f.isOpen);
          if (firstRustFile) {
            openOrActivateTab(
              firstRustFile.path,
              firstRustFile.name,
              firstRustFile.content,
              firstRustFile.language
            );
          }

          // Show success toast
          toast.success('Repository loaded!', {
            description: `Loaded ${project.files.length} files from ${parsed.owner}/${parsed.repo}`,
          });

          // Clean URL after successful load
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }

          // Close dialog after 1.5 seconds
          setTimeout(() => {
            setShowGitHubDialog(false);
          }, 1500);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load repository';
        toast.error('Failed to load repository', {
          description: errorMessage,
        });
      }
    } else if (parsed.type === 'blockchain') {
      // ✅ NEW: Load contract for interaction (not editor)
      setShowBlockchainDialog(true);

      try {
        const contractData = await loadFromBlockchain(parsed);

        if (contractData) {
          // Store contract data
          setLoadedContract(contractData);

          // Parse ABI
          let parsedAbi;
          try {
            parsedAbi = JSON.parse(contractData.abi);
          } catch (e) {
            console.error('Failed to parse ABI:', e);
            throw new Error('Invalid ABI format');
          }

          // Set ABI in state
          setAbiData({ abi: contractData.abi, solidity: '' });

          // Add to deployed contracts list
          setDeployedContracts([
            {
              address: contractData.address,
              txHash: `loaded-from-${contractData.chain}`, // Optional: helps identify source
            }
          ]);

          // Open contract interaction panel
          setShowContractPanel(true);

          // Show success toast
          toast.success('Contract loaded!', {
            description: `${contractData.name} is ready for interaction`,
          });

          // Clean URL after successful load
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }

          // Close dialog after 1.5 seconds
          setTimeout(() => {
            setShowBlockchainDialog(false);
          }, 1500);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load contract';
        toast.error('Failed to load contract', {
          description: errorMessage,
        });
      }
    } else {
      toast.error('Invalid URL', {
        description: 'Please use a GitHub repository or blockchain explorer URL',
      });
    }
  };

  // NEW: Sync file tree clicks with tabs
  const handleFileClick = (path: string) => {
    const file = getFileByPath(project, path);
    if (!file) return;

    // Open or activate tab
    openOrActivateTab(path, file.name, file.content, file.language);

    // Update project active file
    setActive(path);
  };

  // NEW: Sync tab content changes with project
  useEffect(() => {
    if (activeTab && project.activeFilePath === activeTab.path) {
      const projectFile = getFileByPath(project, activeTab.path);
      if (projectFile && projectFile.content !== activeTab.content) {
        // Update project content when tab content changes
        updateContent(activeTab.path, activeTab.content);
      }
    }
  }, [activeTab?.content, project.activeFilePath, activeTab?.path, updateContent, project]);

  const compilationStatus = useMemo(() => {
    if (isCompiling) return 'compiling';
    if (output.some((o) => o.type === 'complete' && o.data.includes('successful'))) return 'success';
    if (output.some((o) => o.type === 'error' || o.type === 'complete')) return 'error';
    return 'idle';
  }, [isCompiling, output]);

  const canExportAbi = !!sessionId && compilationStatus === 'success' && !isExportingABI;
  const canDeploy = !!sessionId && compilationStatus === 'success' && isConnected;

  const handleCompile = async () => {
    if (!activeTab) return;
    await compile(activeTab.content, true);

    if (desktop || !showAIPanel) {
      setShowOutput(true);
    }
  };

  const handleSave = () => {
    handleCompile();
  };

  useKeyboardShortcuts({
    onToggleAI: () => {
      if (mobile) {
        setShowContractPanel(false);
        toggleAIPanel();
        return;
      }
      toggleAIPanelCollapse();
    },
    onToggleOutput: toggleOutput,
    onCompile: handleCompile,
  });

  const handleLoadTemplate = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      if (activeTab) {
        updateTabContent(activeTab.id, template.code);
      }
      clearOutput();
      setWorkspaceTab('editor');
      if (mobile) {
        setShowAIPanel(false);
        setShowContractPanel(false);
      }
    }
  };

  const handleNewFile = (type: 'rust' | 'toml' | 'markdown') => {
    const extensions = { rust: '.rs', toml: '.toml', markdown: '.md' } as const;
    const languages = { rust: 'rust', toml: 'toml', markdown: 'markdown' } as const;

    const count = tabs.filter((t) => t.name.includes(extensions[type])).length;
    const name = `new_file_${count + 1}${extensions[type]}`;

    addTab(name, '', languages[type]);
    setWorkspaceTab('editor');

    if (mobile) {
      setShowAIPanel(false);
      setShowContractPanel(false);
    }
  };

  const handleDeploySuccess = (contractAddress: string, txHash?: string) => {
    setDeployedContracts((prev) => [...prev, { address: contractAddress, txHash }]);
    if (mobile) {
      setShowAIPanel(false);
      setShowContractPanel(true);
    }
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

  const handleToggleAI = () => {
    if (mobile) {
      setShowContractPanel(false);
      setShowAIPanel(!showAIPanel);
      return;
    }
    toggleAIPanelCollapse();
  };

  const handleToggleContract = () => {
    if (mobile) {
      setShowAIPanel(false);
      setShowContractPanel(!showContractPanel);
      return;
    }
    toggleContractPanelCollapse();
  };

  const closeMobilePanels = () => {
    setShowAIPanel(false);
    setShowContractPanel(false);
  };

  const handleImportProject = useCallback((importedProject: ProjectState) => {
    setProject(importedProject);
    // Clear tabs and reload
    window.location.reload();
  }, [setProject]);

  return (
    <>
      <SetupGuide />

      {/* NEW: GitHub Loading Dialog */}
      <GitHubLoadingDialog
        open={showGitHubDialog}
        onOpenChange={setShowGitHubDialog}
        progress={githubProgress}
        onRetry={() => {
          const searchParams = new URLSearchParams(window.location.search);
          const url = searchParams.get('url');
          if (url) handleURLLoad(url);
        }}
      />

      {/* ✅ NEW: Blockchain Loading Dialog */}
      <BlockchainLoadingDialog
        open={showBlockchainDialog}
        onOpenChange={setShowBlockchainDialog}
        progress={blockchainProgress}
        onRetry={() => {
          const searchParams = new URLSearchParams(window.location.search);
          const url = searchParams.get('url');
          if (url) handleURLLoad(url);
        }}
      />

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
        <header className="border-b border-border px-3 py-2 md:px-4 md:py-0 md:h-14 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex items-center gap-2">
            <Link
              href="/"
              className="text-lg md:text-xl font-bold text-primary hover:opacity-80 truncate"
            >
              Stylus IDE
            </Link>
            <div className="md:hidden flex items-center gap-2">
              {compilationStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
              {compilationStatus === 'error' && <XCircle className="h-4 w-4 text-red-400" />}
              {compilationStatus === 'compiling' && (
                <span className="text-xs text-blue-400 animate-pulse">Compiling…</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ConnectButton />

            <FaucetButton />
  
            <ProjectActions
              project={project}
              onImport={handleImportProject}
              onReset={resetProject}
              onSave={manualSave}
            />

            <Button onClick={handleCompile} disabled={isCompiling} size="sm" className="hidden sm:flex">
              <Play className="h-4 w-4 mr-2" />
              {isCompiling ? 'Compiling...' : 'Compile'}
            </Button>

            <Button
              onClick={handleExportABI}
              disabled={!canExportAbi}
              size="sm"
              variant="outline"
              className="hidden sm:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExportingABI ? 'Exporting...' : 'Export ABI'}
            </Button>

            <Button
              onClick={() => setShowDeployDialog(true)}
              disabled={!canDeploy}
              size="sm"
              className="hidden sm:flex"
            >
              <Upload className="h-4 w-4 mr-2" />
              Deploy
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex">
                  <FileCode className="h-4 w-4 mr-2" />
                  Templates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {templates.map((template) => (
                  <DropdownMenuItem key={template.id} onClick={() => handleLoadTemplate(template.id)}>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground">{template.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden" aria-label="Actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem onClick={handleCompile} disabled={isCompiling || !activeTab}>
                  <Play className="h-4 w-4 mr-2" />
                  {isCompiling ? 'Compiling...' : 'Compile'}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExportABI} disabled={!canExportAbi}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExportingABI ? 'Exporting ABI…' : 'Export ABI'}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setShowDeployDialog(true)} disabled={!canDeploy}>
                  <Upload className="h-4 w-4 mr-2" />
                  Deploy
                </DropdownMenuItem>

                <div className="px-2 py-1.5 text-xs text-muted-foreground">Templates</div>
                {templates.map((template) => (
                  <DropdownMenuItem key={template.id} onClick={() => handleLoadTemplate(template.id)}>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{template.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{template.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="focus-visible-ring"
              onClick={handleToggleAI}
              aria-label="Toggle AI assistant"
            >
              <Bot className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="focus-visible-ring"
              onClick={handleToggleContract}
              aria-label="Toggle contract panel"
            >
              <FileText className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Workspace Tabs Bar */}
        <div className="h-10 border-b border-border bg-card flex items-center px-2 sm:px-4 gap-2 overflow-x-auto whitespace-nowrap">
          <Button
            size="sm"
            variant={workspaceTab === 'editor' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('editor')}
            className="h-7 shrink-0"
          >
            Editor
          </Button>
          <Button
            size="sm"
            variant={workspaceTab === 'orbit' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('orbit')}
            className="h-7 shrink-0"
          >
            Orbit Explorer
          </Button>
          <Button
            size="sm"
            variant={workspaceTab === 'ml' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('ml')}
            className="h-7 shrink-0"
          >
            On-chain ML
          </Button>
          <Button
            size="sm"
            variant={workspaceTab === 'qlearning' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('qlearning')}
            className="h-7 shrink-0"
          >
            Q-Learning
          </Button>
          <Button
            size="sm"
            variant={workspaceTab === 'raytracing' ? 'secondary' : 'ghost'}
            onClick={() => setWorkspaceTab('raytracing')}
            className="h-7 shrink-0"
          >
            Raytracing
          </Button>
        </div>

        {/* NEW: GitHub Metadata Banner */}
        {project.metadata?.source === 'github' &&
          project.metadata.owner &&
          project.metadata.repo && (
            <GitHubMetadataBanner
              owner={project.metadata.owner}
              repo={project.metadata.repo}
              branch={project.metadata.branch || 'main'}
              url={project.metadata.url || `https://github.com/${project.metadata.owner}/${project.metadata.repo}`}
              folderPath={project.metadata.folderPath}  // ✅ ADD THIS
            />
          )}

        {/* ✅ NEW: Blockchain Contract Banner */}
        {loadedContract && (
          <BlockchainContractBanner
            address={loadedContract.address}
            name={loadedContract.name}
            chain={loadedContract.chain}
            verified={loadedContract.verified}
            explorerUrl={loadedContract.explorerUrl}
            compiler={loadedContract.compiler}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 relative">
            {workspaceTab === 'orbit' ? (
              <section className="flex-1 min-h-0 overflow-auto bg-muted/30">
                <div className="p-3 sm:p-6">
                  <OrbitExplorer />
                </div>
              </section>
            ) : workspaceTab === 'ml' ? (
              <section className="flex-1 min-h-0 bg-background">
                <iframe title="On-chain ML Inference" src="/ml" className="w-full h-full border-0" />
              </section>
            ) : workspaceTab === 'qlearning' ? (
              <section className="flex-1 min-h-0 bg-background">
                <iframe title="Q-Learning" src="/qlearning" className="w-full h-full border-0" />
              </section>
            ) : workspaceTab === 'raytracing' ? (
              <section className="flex-1 min-h-0 bg-background">
                <iframe title="Raytracing" src="/raytracing" className="w-full h-full border-0" />
              </section>
            ) : (
              <>
                {/* NEW: File Tree + Editor Layout */}
                <div className="flex-1 flex min-h-0">
                  {/* ✅ UPDATED: File Tree Sidebar with Loading Skeleton */}
                  <div className="hidden md:block w-64 border-r border-border">
                    {isLoadingGitHub ? (
                      <FileTreeSkeleton />
                    ) : (
                      <FileTree
                        structure={project.structure}
                        activeFilePath={project.activeFilePath}
                        onFileClick={handleFileClick}
                        onFolderToggle={toggleFolder}
                        onNewFile={(path) => {
                          createNewFile(path || 'new_file.rs');
                        }}
                        onNewFolder={(path) => {
                          createNewFolder(path || 'new_folder');
                        }}
                        onRename={(oldPath, newName) => {
                          const pathParts = oldPath.split('/');
                          pathParts[pathParts.length - 1] = newName;
                          const newPath = pathParts.join('/');
                          rename(oldPath, newPath);
                        }}
                        onDuplicate={(path) => {
                          duplicateFile(path);
                        }}
                        onDelete={(path, isFolder) => {
                          if (isFolder) {
                            removeFolder(path);
                          } else {
                            removeFile(path);
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Editor Section */}
                  <section className="flex-1 flex flex-col min-w-0">
                    <FileTabs
                      tabs={tabs}
                      activeTabId={activeTabId}
                      onTabClick={setActiveTab}
                      onTabClose={removeTab}
                      onNewFile={handleNewFile}
                      onRenameTab={renameTab}
                    />

                    <div className="h-10 border-b border-border flex items-center justify-between px-2 sm:px-4 gap-2">
                      <div className="flex items-center gap-2 overflow-x-auto">
                        <span className="text-xs text-muted-foreground shrink-0">
                          {tabs.length} file{tabs.length !== 1 ? 's' : ''}
                        </span>

                        {errors.length > 0 && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full shrink-0">
                            {errors.length} {errors.length === 1 ? 'error' : 'errors'}
                          </span>
                        )}

                        {compilationTime !== null && (
                          <span className="hidden sm:flex text-xs text-muted-foreground items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatCompilationTime(compilationTime)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={handleCompile}
                          disabled={isCompiling || !activeTab}
                          size="sm"
                          className="sm:hidden h-7"
                          aria-label="Compile"
                          title="Compile"
                        >
                          <Play className="h-3 w-3" />
                        </Button>

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

                    <div className="flex-1 bg-card transition-all duration-300 min-h-0">
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
                </div>

                {/* Bottom Panel - Output */}
                <section
                  className={`
                    border-t border-border flex flex-col bg-card
                    transition-all duration-300 ease-in-out
                    ${showOutput ? 'h-40 sm:h-48 md:h-56 xl:h-64' : 'h-12'}
                  `}
                >
                  <div className="h-12 border-b border-border flex items-center justify-between px-2 sm:px-4">
                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto min-w-0">
                      <button
                        className="text-sm font-medium cursor-pointer flex items-center gap-2 hover:text-primary transition-colors shrink-0"
                        onClick={toggleOutput}
                        aria-label={showOutput ? 'Hide output panel' : 'Show output panel'}
                      >
                        <span className="hidden sm:inline">Output</span>
                        <span className="sm:hidden">Out</span>
                        {compilationStatus === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                        {compilationStatus === 'error' && <XCircle className="h-4 w-4 text-red-400" />}
                      </button>

                      {output.length > 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full shrink-0">
                          {output.length}
                        </span>
                      )}

                      {compilationTime !== null && (
                        <span className="hidden sm:flex text-xs text-muted-foreground items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3" />
                          {formatCompilationTime(compilationTime)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      {output.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearOutput}
                          className="h-8 px-2 sm:px-3"
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
                        className="h-8 px-2"
                        aria-label={showOutput ? 'Collapse output' : 'Expand output'}
                      >
                        {showOutput ? '−' : '+'}
                      </Button>
                    </div>
                  </div>

                  {showOutput && (
                    <div className="flex-1 overflow-auto p-2 sm:p-4 min-h-0 font-mono text-xs space-y-1 custom-scrollbar">
                      {output.length === 0 && !isCompiling && (
                        <p className="text-muted-foreground">Ready to compile. Press Compile or Cmd/Ctrl+S</p>
                      )}
                      {isCompiling && output.length === 0 && (
                        <p className="text-blue-400 animate-pulse">Starting compilation...</p>
                      )}
                      {output.map((item, index) => (
                        <div key={index} className={`flex items-start gap-2 ${getOutputColor(item.type)}`}>
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
                ${isAIPanelCollapsed
                  ? 'lg:w-0 lg:min-w-0 lg:max-w-0 lg:overflow-hidden'
                  : 'lg:w-96 lg:max-w-100 lg:min-w-[320px]'
                }
                border-l border-border bg-card flex flex-col
              `}
            >
              <div className="lg:hidden h-14 border-b border-border flex items-center justify-between px-4 bg-card/95 backdrop-blur-sm">
                <span className="font-semibold">AI Assistant</span>
                <Button variant="ghost" size="icon" onClick={() => setShowAIPanel(false)} aria-label="Close AI panel">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 min-h-0 lg:h-full">
                <ChatPanel
                  currentCode={activeTab?.content}
                  compilationErrors={errors}
                  onInsertCode={(code) => {
                    if (activeTab) updateTabContent(activeTab.id, code);
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
                ${isContractPanelCollapsed
                  ? 'lg:w-0 lg:min-w-0 lg:max-w-0 lg:overflow-hidden'
                  : 'lg:w-96 lg:max-w-100 lg:min-w-[320px]'
                }
                border-l border-border bg-card flex flex-col
              `}
            >
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
              onClick={closeMobilePanels}
              aria-label="Close panel"
            />
          )}
        </div>

        <KeyboardShortcutHint />

        {parsedAbi && (
          <BenchmarkDialog
            open={showBenchmarkDialog}
            onOpenChange={setShowBenchmarkDialog}
            abi={parsedAbi}
            functionName="number"
            title="Multi-Chain Gas Benchmark"
            description="Deploy your contract to multiple chains and compare gas costs"
          />
        )}
      </main>
    </>
  );
}