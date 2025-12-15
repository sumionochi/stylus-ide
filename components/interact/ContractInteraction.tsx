'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Edit, Loader2, ExternalLink } from 'lucide-react';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { parseABI, groupFunctionsByType, formatFunctionSignature, ParsedFunction } from '@/lib/abi-parser';
import { encodeFunctionData, decodeFunctionResult, type Address } from 'viem';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';

interface ContractInteractionProps {
  contractAddress: string;
  abi: string;
}

export function ContractInteraction({ contractAddress, abi }: ContractInteractionProps) {
  const [inputValues, setInputValues] = useState<Record<string, string[]>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const functions = parseABI(abi);
  const { read: readFunctions, write: writeFunctions } = groupFunctionsByType(functions);

  const getExplorerUrl = () => {
    if (chainId === arbitrumSepolia.id) {
      return `https://sepolia.arbiscan.io/address/${contractAddress}`;
    }
    if (chainId === arbitrum.id) {
      return `https://arbiscan.io/address/${contractAddress}`;
    }
    return `https://sepolia.arbiscan.io/address/${contractAddress}`;
  };

  const handleInputChange = (funcName: string, index: number, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [funcName]: {
        ...prev[funcName],
        [index]: value,
      },
    }));
  };

  const getInputValues = (funcName: string, func: ParsedFunction): any[] => {
    const values = inputValues[funcName] || [];
    return func.inputs.map((input, index) => {
      const value = values[index] || '';
      
      // Convert based on type
      if (input.type.includes('uint') || input.type.includes('int')) {
        return value ? BigInt(value) : BigInt(0);
      }
      if (input.type === 'bool') {
        return value.toLowerCase() === 'true';
      }
      if (input.type === 'address') {
        return value as Address;
      }
      if (input.type.includes('bytes')) {
        return value as `0x${string}`;
      }
      return value;
    });
  };

  const handleRead = async (func: ParsedFunction) => {
    if (!publicClient) return;

    const funcKey = func.name;
    setLoading((prev) => ({ ...prev, [funcKey]: true }));
    setResults((prev) => ({ ...prev, [funcKey]: undefined }));

    try {
      const args = getInputValues(funcKey, func);

      const data = await publicClient.readContract({
        address: contractAddress as Address,
        abi: [func],
        functionName: func.name,
        args: args.length > 0 ? args : undefined,
      });

      setResults((prev) => ({
        ...prev,
        [funcKey]: { success: true, data },
      }));
    } catch (error) {
      console.error('Read error:', error);
      setResults((prev) => ({
        ...prev,
        [funcKey]: {
          success: false,
          error: error instanceof Error ? error.message : 'Read failed',
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [funcKey]: false }));
    }
  };

  const handleWrite = async (func: ParsedFunction) => {
    if (!walletClient || !userAddress) {
      alert('Please connect your wallet');
      return;
    }

    const funcKey = func.name;
    setLoading((prev) => ({ ...prev, [funcKey]: true }));
    setResults((prev) => ({ ...prev, [funcKey]: undefined }));

    try {
      const args = getInputValues(funcKey, func);

      const hash = await walletClient.writeContract({
        address: contractAddress as Address,
        abi: [func],
        functionName: func.name,
        args: args.length > 0 ? args : undefined,
        account: userAddress,
      });

      // Wait for transaction
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        setResults((prev) => ({
          ...prev,
          [funcKey]: {
            success: true,
            txHash: hash,
            status: receipt.status,
          },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [funcKey]: { success: true, txHash: hash },
        }));
      }
    } catch (error) {
      console.error('Write error:', error);
      setResults((prev) => ({
        ...prev,
        [funcKey]: {
          success: false,
          error: error instanceof Error ? error.message : 'Transaction failed',
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [funcKey]: false }));
    }
  };

  const renderFunctionCard = (func: ParsedFunction, isWrite: boolean) => {
    const funcKey = func.name;
    const isLoading = loading[funcKey];
    const result = results[funcKey];

    return (
      <Card key={func.name}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-mono">{func.name}</CardTitle>
          <CardDescription className="text-xs">
            {formatFunctionSignature(func)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {func.inputs.length > 0 && (
            <div className="space-y-2">
              {func.inputs.map((input, index) => (
                <div key={index} className="space-y-1">
                  <Label className="text-xs">
                    {input.name || `param${index}`} ({input.type})
                  </Label>
                  <Input
                    placeholder={`Enter ${input.type}`}
                    value={inputValues[funcKey]?.[index] || ''}
                    onChange={(e) =>
                      handleInputChange(funcKey, index, e.target.value)
                    }
                    disabled={isLoading}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={() => (isWrite ? handleWrite(func) : handleRead(func))}
            disabled={isLoading || (isWrite && !isConnected)}
            size="sm"
            variant={isWrite ? 'default' : 'outline'}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                {isWrite ? 'Sending...' : 'Reading...'}
              </>
            ) : (
              <>{isWrite ? 'Write' : 'Read'}</>
            )}
          </Button>

          {result && (
            <div
              className={`p-3 rounded-md text-xs ${
                result.success
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              {result.success ? (
                <div className="space-y-1">
                  {result.data !== undefined && (
                    <div>
                      <span className="font-medium">Result: </span>
                      <code className="break-all">
                        {typeof result.data === 'bigint'
                          ? result.data.toString()
                          : JSON.stringify(result.data)}
                      </code>
                    </div>
                  )}
                  {result.txHash && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Tx: </span>
                      <code className="flex-1 break-all">{result.txHash}</code>
                      <a
                        href={`${getExplorerUrl().replace('/address/', '/tx/')}/${result.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {result.status && (
                    <div>
                      <span className="font-medium">Status: </span>
                      {result.status === 'success' ? '✓ Success' : '✗ Failed'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-400">{result.error}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Contract Interaction</h2>
          <a
            href={getExplorerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View on Explorer
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="text-xs font-mono text-muted-foreground break-all">
          {contractAddress}
        </div>
        </div>

        <Tabs defaultValue="read" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-4 mt-4 grid w-[calc(100%-2rem)] grid-cols-2">
            <TabsTrigger value="read" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Read ({readFunctions.length})
            </TabsTrigger>
            <TabsTrigger value="write" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Write ({writeFunctions.length})
            </TabsTrigger>
            </TabsList>

            <TabsContent value="read" className="flex-1 overflow-auto p-4 space-y-3 mt-0">
            {readFunctions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                No read functions available
                </p>
            ) : (
                readFunctions.map((func) => renderFunctionCard(func, false))
            )}
            </TabsContent>

            <TabsContent value="write" className="flex-1 overflow-auto p-4 space-y-3 mt-0">
            {!isConnected ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                Connect your wallet to write to the contract
                </p>
            ) : writeFunctions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                No write functions available
                </p>
            ) : (
                writeFunctions.map((func) => renderFunctionCard(func, true))
            )}
            </TabsContent>
        </Tabs>
    </div>
  );
}