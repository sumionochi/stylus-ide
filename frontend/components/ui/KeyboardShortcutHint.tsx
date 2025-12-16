'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Keyboard, X } from 'lucide-react';

export function KeyboardShortcutHint() {
    const [showHint, setShowHint] = useState(false);
    const [hasSeenHint, setHasSeenHint] = useState(false);

    useEffect(() => {
        // Check if user has seen the hint before
        const seen = localStorage.getItem('keyboard-hint-seen');
        if (!seen) {
            // Show hint after a short delay
            const timer = setTimeout(() => {
                setShowHint(true);
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setHasSeenHint(true);
        }
    }, []);

    const dismissHint = () => {
        setShowHint(false);
        setHasSeenHint(true);
        localStorage.setItem('keyboard-hint-seen', 'true');
    };

    if (!showHint && !hasSeenHint) return null;

    return (
        <>
            {/* Floating hint for first-time users */}
            {showHint && (
                <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg p-4 shadow-lg max-w-sm">
                    <div className="flex items-start gap-3">
                        <Keyboard className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-2">Keyboard Shortcuts</h4>
                            <div className="text-xs text-muted-foreground space-y-1">
                                <div><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd> Toggle AI Assistant</div>
                                <div><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘`</kbd> Toggle Output Panel</div>
                                <div><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘↵</kbd> Compile Code</div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mt-1 -mr-1"
                            onClick={dismissHint}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Persistent keyboard shortcut button */}
            {hasSeenHint && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full bg-card border border-border shadow-lg hover:shadow-xl transition-all"
                    onClick={() => setShowHint(true)}
                    title="Show keyboard shortcuts"
                >
                    <Keyboard className="h-4 w-4" />
                </Button>
            )}
        </>
    );
}