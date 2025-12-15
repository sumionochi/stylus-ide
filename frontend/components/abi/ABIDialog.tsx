'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, FileJson, FileCode } from 'lucide-react';

interface ABIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abi: string | null;
  solidity: string | null;
}

export function ABIDialog({ open, onOpenChange, abi, solidity }: ABIDialogProps) {
  const [copiedABI, setCopiedABI] = useState(false);
  const [copiedSolidity, setCopiedSolidity] = useState(false);

  const copyToClipboard = async (text: string, type: 'abi' | 'solidity') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'abi') {
        setCopiedABI(true);
        setTimeout(() => setCopiedABI(false), 2000);
      } else {
        setCopiedSolidity(true);
        setTimeout(() => setCopiedSolidity(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Contract ABI</DialogTitle>
          <DialogDescription>
            Export your contract's Application Binary Interface
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="json" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              JSON ABI
            </TabsTrigger>
            <TabsTrigger value="solidity" className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Solidity Interface
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Copy this ABI to interact with your contract
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => abi && copyToClipboard(abi, 'abi')}
                disabled={!abi}
              >
                {copiedABI ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </>
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-muted rounded-lg p-4 font-mono text-xs">
              {abi ? (
                <pre className="whitespace-pre-wrap wrap-break-words">{abi}</pre>
              ) : (
                <p className="text-muted-foreground">No ABI available</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="solidity" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Solidity interface for your contract
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => solidity && copyToClipboard(solidity, 'solidity')}
                disabled={!solidity}
              >
                {copiedSolidity ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Interface
                  </>
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-muted rounded-lg p-4 font-mono text-xs">
              {solidity ? (
                <pre className="whitespace-pre-wrap wrap-break-words">{solidity}</pre>
              ) : (
                <p className="text-muted-foreground">No Solidity interface available</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}