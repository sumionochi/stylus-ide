'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Zap, AlertTriangle } from 'lucide-react';

interface SetupStatus {
  rust: boolean;
  cargo: boolean;
  wasmTarget: boolean;
  cargoStylus: boolean;
  platform: 'darwin' | 'linux' | 'win32' | 'other';
  rustVersion?: string;
  needsUpdate?: boolean;
}

export function SetupGuide() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/check-setup');
      if (!response.ok) throw new Error('Failed to check setup');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  const isSetupComplete = status && status.rust && status.cargo && status.wasmTarget && status.cargoStylus && !status.needsUpdate;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Checking Environment</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Setup Check Failed</CardTitle>
            <CardDescription className="text-destructive text-sm">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={checkSetup} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSetupComplete) {
    return null;
  }

  const getInstructions = () => {
    if (!status) return null;

    const isUnix = status.platform === 'darwin' || status.platform === 'linux';
    const isWindows = status.platform === 'win32';

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Rust Version Warning */}
        {status.needsUpdate && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-md space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold text-sm">Rust Version Too Old</h4>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Detected: {status.rustVersion || 'unknown'}
                  <br />
                  Required: 1.88.0+ (for cargo-stylus v0.6.3+)
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <code className="text-xs md:text-sm">rustup update stable</code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Then run <code className="bg-muted px-1 rounded">npm run setup</code> again
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Setup Section */}
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-md space-y-3">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h4 className="font-semibold text-sm md:text-base">Quick Setup (Recommended)</h4>
              <p className="text-xs md:text-sm text-muted-foreground">
                Run this command in your terminal to automatically install all requirements:
              </p>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-xs md:text-sm">npm run setup</code>
              </div>
              <p className="text-xs text-muted-foreground">
                This will check your Rust version and guide you through any needed updates
              </p>
            </div>
          </div>
        </div>

        {/* Manual Setup Instructions */}
        <details className="space-y-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
            Or install manually
          </summary>
          
          <div className="space-y-4 pt-4">
            {status.needsUpdate && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm md:text-base">1. Update Rust</h4>
                <div className="bg-muted p-3 md:p-4 rounded-md overflow-x-auto">
                  <code className="text-xs md:text-sm whitespace-pre">
                    rustup update stable
                  </code>
                </div>
              </div>
            )}

            {(!status.rust || !status.cargo) && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm md:text-base">
                  {status.needsUpdate ? '2' : '1'}. Install Rust
                </h4>
                {isUnix && (
                  <div className="bg-muted p-3 md:p-4 rounded-md overflow-x-auto">
                    <code className="text-xs md:text-sm whitespace-pre">
                      curl --proto='=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
                    </code>
                  </div>
                )}
                {isWindows && (
                  <div className="space-y-2">
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Download and run the Rust installer from:
                    </p>
                    <a 
                      href="https://rustup.rs" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm text-primary hover:underline break-all"
                    >
                      https://rustup.rs
                    </a>
                  </div>
                )}
              </div>
            )}

            {!status.wasmTarget && status.rust && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm md:text-base">
                  {(!status.rust || status.needsUpdate) ? '3' : '2'}. Add WASM Target
                </h4>
                <div className="bg-muted p-3 md:p-4 rounded-md overflow-x-auto">
                  <code className="text-xs md:text-sm whitespace-pre">
                    rustup target add wasm32-unknown-unknown
                  </code>
                </div>
              </div>
            )}

            {!status.cargoStylus && status.cargo && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm md:text-base">
                  {(!status.rust || status.needsUpdate || !status.wasmTarget) ? '4' : '3'}. Install Cargo Stylus
                </h4>
                <div className="bg-muted p-3 md:p-4 rounded-md overflow-x-auto space-y-2">
                  <code className="text-xs md:text-sm whitespace-pre block">
                    cargo install cargo-stylus
                  </code>
                  <p className="text-xs text-muted-foreground">
                    If this fails, try: <code className="bg-background px-1 rounded">cargo install cargo-stylus --locked</code>
                  </p>
                </div>
              </div>
            )}

            {isWindows && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 md:p-4 rounded-md">
                <p className="text-xs md:text-sm text-yellow-600 dark:text-yellow-500">
                  <strong>Windows:</strong> Run commands in PowerShell after installing Rust. For best experience, use WSL.
                </p>
              </div>
            )}

            {isUnix && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 md:p-4 rounded-md">
                <p className="text-xs md:text-sm text-blue-600 dark:text-blue-500">
                  <strong>Note:</strong> Restart terminal or run <code className="text-xs">source $HOME/.cargo/env</code>
                </p>
              </div>
            )}
          </div>
        </details>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Setup Required</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Configure your development environment for Arbitrum Stylus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {/* Status Checks */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm md:text-base mb-3">Environment Status</h3>
            <StatusItem label="Rust Compiler" status={status?.rust || false} />
            {status?.rustVersion && (
              <div className="ml-7 text-xs text-muted-foreground">
                Version: {status.rustVersion}
                {status.needsUpdate && (
                  <span className="text-yellow-500 ml-2">(Update to 1.88+ required)</span>
                )}
              </div>
            )}
            <StatusItem label="Cargo Package Manager" status={status?.cargo || false} />
            <StatusItem label="WASM Target" status={status?.wasmTarget || false} />
            <StatusItem label="Cargo Stylus" status={status?.cargoStylus || false} />
          </div>

          {/* Platform Info */}
          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs md:text-sm">
              <span className="font-semibold">Platform:</span>{' '}
              <span className="capitalize">{status?.platform}</span>
            </p>
          </div>

          {/* Instructions */}
          {getInstructions()}

          {/* Recheck Button */}
          <Button onClick={checkSetup} className="w-full" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            Check Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusItem({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {status ? (
        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 md:h-5 md:w-5 text-destructive shrink-0" />
      )}
      <span className="text-xs md:text-sm">{label}</span>
    </div>
  );
}