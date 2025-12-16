'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onToggleAI: () => void;
  onToggleOutput: () => void;
  onCompile: () => void;
}

export function useKeyboardShortcuts({ onToggleAI, onToggleOutput, onCompile }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.contentEditable === 'true';

      // Cmd/Ctrl + K: Toggle AI panel
      if ((event.metaKey || event.ctrlKey) && event.key === 'k' && !isInputElement) {
        event.preventDefault();
        onToggleAI();
      }

      // Cmd/Ctrl + `: Toggle output panel
      if ((event.metaKey || event.ctrlKey) && event.key === '`' && !isInputElement) {
        event.preventDefault();
        onToggleOutput();
      }

      // Cmd/Ctrl + Enter: Compile
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !isInputElement) {
        event.preventDefault();
        onCompile();
      }

      // Escape: Close panels on mobile
      if (event.key === 'Escape' && window.innerWidth < 1024) {
        onToggleAI(); // This will close if open
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onToggleAI, onToggleOutput, onCompile]);
}