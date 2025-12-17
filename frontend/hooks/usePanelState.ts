'use client';

import { useState, useEffect } from 'react';

interface PanelState {
  showAIPanel: boolean;
  showContractPanel: boolean;
  showOutput: boolean;
  isAIPanelCollapsed: boolean;
  isContractPanelCollapsed: boolean;
  setShowAIPanel: (show: boolean) => void;
  setShowContractPanel: (show: boolean) => void;
  setShowOutput: (show: boolean) => void;
  setIsAIPanelCollapsed: (collapsed: boolean) => void;
  setIsContractPanelCollapsed: (collapsed: boolean) => void;
  toggleAIPanel: () => void;
  toggleContractPanel: () => void;
  toggleOutput: () => void;
  toggleAIPanelCollapse: () => void;
  toggleContractPanelCollapse: () => void;
}

export function usePanelState(): PanelState {
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showContractPanel, setShowContractPanel] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [isAIPanelCollapsed, setIsAIPanelCollapsed] = useState(false);
  const [isContractPanelCollapsed, setIsContractPanelCollapsed] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      
      if (!isDesktop) {
        // On smaller screens, ensure panels don't conflict
        const activePanels = [showAIPanel, showContractPanel, showOutput].filter(Boolean).length;
        if (activePanels > 1) {
          // Close output panel if multiple panels are open on mobile
          setShowOutput(false);
        }
        // Reset collapse state on mobile
        setIsAIPanelCollapsed(false);
        setIsContractPanelCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, [showAIPanel, showContractPanel, showOutput]);

  const toggleAIPanel = () => {
    setShowAIPanel(prev => {
      const newValue = !prev;
      // On mobile, close other panels when opening AI panel
      if (newValue && window.innerWidth < 1024) {
        setShowContractPanel(false);
        setShowOutput(false);
      }
      return newValue;
    });
  };

  const toggleContractPanel = () => {
    setShowContractPanel(prev => {
      const newValue = !prev;
      // On mobile, close other panels when opening contract panel
      if (newValue && window.innerWidth < 1024) {
        setShowAIPanel(false);
        setShowOutput(false);
      }
      return newValue;
    });
  };

  const toggleOutput = () => {
    setShowOutput(prev => {
      const newValue = !prev;
      // On mobile, close side panels when opening output
      if (newValue && window.innerWidth < 1024) {
        setShowAIPanel(false);
        setShowContractPanel(false);
      }
      return newValue;
    });
  };

  const toggleAIPanelCollapse = () => {
    setIsAIPanelCollapsed(prev => !prev);
  };

  const toggleContractPanelCollapse = () => {
    setIsContractPanelCollapsed(prev => !prev);
  };

  return {
    showAIPanel,
    showContractPanel,
    showOutput,
    isAIPanelCollapsed,
    isContractPanelCollapsed,
    setShowAIPanel,
    setShowContractPanel,
    setShowOutput,
    setIsAIPanelCollapsed,
    setIsContractPanelCollapsed,
    toggleAIPanel,
    toggleContractPanel,
    toggleOutput,
    toggleAIPanelCollapse,
    toggleContractPanelCollapse,
  };
}