'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, Check, X } from 'lucide-react';

interface AICompletionPopupProps {
  visible: boolean;
  position: { top: number; left: number };
  onAccept: (completion: string) => void;
  onReject: () => void;
  isLoading: boolean;
  completion: string;
}

export function AICompletionPopup({
  visible,
  position,
  onAccept,
  onReject,
  isLoading,
  completion,
}: AICompletionPopupProps) {
  if (!visible) return null;

  return (
    <Card
      className="fixed z-50 p-3 shadow-lg border-primary/50"
      style={{
        top: position.top,
        left: position.left,
        maxWidth: '500px',
        minWidth: '300px',
      }}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">AI Suggestion</span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating completion...
          </div>
        ) : completion ? (
          <>
            <div className="bg-muted rounded-md p-2 font-mono text-xs max-h-48 overflow-auto">
              <pre className="whitespace-pre-wrap">{completion}</pre>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onAccept(completion)}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Accept (Tab)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
              >
                <X className="h-4 w-4 mr-1" />
                Reject (Esc)
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}