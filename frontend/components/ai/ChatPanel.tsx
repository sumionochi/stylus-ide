'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Trash2, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { useChat, type Message } from '@/hooks/useChats';
import { QuickActions, type QuickAction } from './QuickActions';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface ChatPanelProps {
  currentCode?: string;
  compilationErrors?: Array<{ line: number; column: number; message: string }>;
  onInsertCode?: (code: string) => void;
}

export function ChatPanel({
  currentCode,
  compilationErrors,
  onInsertCode
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Build context from current state
    let context = '';
    if (currentCode) {
      context += `Current code:\n\`\`\`rust\n${currentCode}\n\`\`\`\n\n`;
    }
    if (compilationErrors && compilationErrors.length > 0) {
      context += `Compilation errors:\n${compilationErrors
        .map((e) => `Line ${e.line}:${e.column} - ${e.message}`)
        .join('\n')}\n\n`;
    }

    await sendMessage(input, context);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    const prompt = action.prompt(currentCode);
    setInput(prompt);

    // Focus textarea and move cursor to end
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(prompt.length, prompt.length);
      }
    }, 0);
  };

  const extractCodeFromMessage = (content: string): string[] => {
    const codeBlocks: string[] = [];
    const regex = /```(?:rust|rs)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      codeBlocks.push(match[1].trim());
    }

    return codeBlocks;
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInsertCode = (code: string) => {
    if (onInsertCode) {
      onInsertCode(code);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header - Responsive */}
      <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="font-semibold text-sm sm:text-base">AI Assistant</h2>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={isLoading}
            className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3"
            aria-label="Clear chat history"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline ml-2">Clear</span>
          </Button>
        )}
      </div>

      {/* Messages - Responsive Scrolling */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full custom-scrollbar">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground text-sm py-4 space-y-2">
                  <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-3 text-primary" />
                  <p className="font-medium text-sm sm:text-base">Hi! I'm your Stylus AI assistant.</p>
                  <p className="text-xs sm:text-sm">Ask me anything about Rust smart contracts!</p>
                </div>

                {/* Quick Actions - Show when no messages */}
                <QuickActions
                  onActionClick={handleQuickAction}
                  hasCode={!!currentCode}
                  hasErrors={!!compilationErrors && compilationErrors.length > 0}
                />
              </div>
            )}

            {messages.map((message) => {
              const codeBlocks = message.role === 'assistant'
                ? extractCodeFromMessage(message.content)
                : [];

              return (
                <div key={message.id} className="space-y-2">
                  <div
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[85%] rounded-lg p-3 ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                        }`}
                    >
                      {message.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap break-anywhere">{message.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              code({ node, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');

                                return match ? (
                                  <SyntaxHighlighter
                                    style={vscDarkPlus as any}
                                    language={match[1]}
                                    PreTag="div"
                                    className="rounded-md text-xs overflow-x-auto"
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className={`${className} break-words`} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              p: ({ children }) => <p className="break-words">{children}</p>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Code Action Buttons - Responsive */}
                  {codeBlocks.length > 0 && (
                    <div className="flex flex-wrap gap-1 sm:gap-2 ml-2">
                      {codeBlocks.map((code, index) => (
                        <div key={index} className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyCode(code)}
                            className="h-6 sm:h-7 text-xs px-2 sm:px-3"
                          >
                            {copiedCode === code ? (
                              <>
                                <Check className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Copy</span>
                              </>
                            )}
                          </Button>
                          {onInsertCode && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInsertCode(code)}
                              className="h-6 sm:h-7 text-xs px-2 sm:px-3"
                            >
                              <span className="hidden sm:inline">Insert to Editor</span>
                              <span className="sm:hidden">Insert</span>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive break-words">
                {error}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input - Responsive */}
      <div className="p-3 sm:p-4 border-t border-border space-y-2 shrink-0">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about Stylus contracts... (Enter to send, Shift+Enter for new line)"
          className="min-h-16 sm:min-h-20 resize-none text-sm"
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="w-full h-9 sm:h-10"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="hidden sm:inline">Sending...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Send Message</span>
              <span className="sm:hidden">Send</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}