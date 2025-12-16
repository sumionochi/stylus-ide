'use client';

import { useState, useEffect } from 'react';

interface PanelState {
  showAIPanel: boolean;
  showOutput: boolean;
  isAIPanelCollapsed: boolean;
  setShowAIPanel: (show: boolean) => void;
  setShowOutput: (show: boolean) => void;
  setIsAIPanelCollapsed: (collapsed: boolean) => void;
  toggleAIPanel: () => void;
  toggleOutput: () => void;
  toggleAIPanelCollapse: () => void;
}

export function usePanelState(): PanelState {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [isAIPanelCollapsed, setIsAIPanelCollapsed] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      
      if (!isDesktop) {
        // On smaller screens, ensure panels don't conflict
        if (showAIPanel && showOutput) {
          // Prioritize AI panel on mobile when both are open
          setShowOutput(false);
        }
        // Reset collapse state on mobile
        setIsAIPanelCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, [showAIPanel, showOutput]);

  const toggleAIPanel = () => {
    setShowAIPanel(prev => {
      const newValue = !prev;
      // On mobile, close output when opening AI panel
      if (newValue && window.innerWidth < 1024) {
        setShowOutput(false);
      }
      return newValue;
    });
  };

  const toggleOutput = () => {
    setShowOutput(prev => {
      const newValue = !prev;
      // On mobile, close AI panel when opening output
      if (newValue && window.innerWidth < 1024) {
        setShowAIPanel(false);
      }
      return newValue;
    });
  };

  const toggleAIPanelCollapse = () => {
    setIsAIPanelCollapsed(prev => !prev);
  };

  return {
    showAIPanel,
    showOutput,
    isAIPanelCollapsed,
    setShowAIPanel,
    setShowOutput,
    setIsAIPanelCollapsed,
    toggleAIPanel,
    toggleOutput,
    toggleAIPanelCollapse,
  };
}