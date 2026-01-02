'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface URLCopyButtonProps {
  githubUrl: string;
  branch?: string;
  file?: string;
  folderPath?: string;
}

export function URLCopyButton({ githubUrl, branch, file, folderPath }: URLCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Build shareable URL
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    
    params.set('url', githubUrl);
    if (branch) params.set('branch', branch);
    if (file) params.set('file', file);
    if (folderPath) params.set('path', folderPath);
    
    const shareUrl = `${baseUrl}/?${params.toString()}`;
    
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    
    toast.success('Link copied!', {
      description: 'Share this URL to open this exact project state',
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 text-xs gap-1"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Link2 className="h-3 w-3" />
          Share
        </>
      )}
    </Button>
  );
}