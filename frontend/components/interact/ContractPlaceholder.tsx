'use client';

import { FileText, Zap } from 'lucide-react';

export function ContractPlaceholder() {
    return (
        <div className="h-full flex flex-col bg-card">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <h2 className="font-semibold text-sm sm:text-base">Contract Interaction</h2>
                </div>
            </div>

            {/* Placeholder Content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-4 max-w-sm">
                    <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                        <Zap className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">No Contract Deployed</h3>
                        <p className="text-sm text-muted-foreground">
                            Deploy a contract to interact with its functions. Once deployed, you'll be able to read from and write to your smart contract.
                        </p>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                        <p className="font-medium mb-1">To get started:</p>
                        <ol className="text-left space-y-1">
                            <li>1. Write your Stylus contract</li>
                            <li>2. Compile successfully</li>
                            <li>3. Connect your wallet</li>
                            <li>4. Click Deploy</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}