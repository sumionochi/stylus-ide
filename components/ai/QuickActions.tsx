'use client';

import { Button } from '@/components/ui/button';
import { 
  Wand2, 
  Bug, 
  Zap, 
  Code2, 
  FileCode, 
  ArrowRightLeft,
  HelpCircle,
  Lightbulb
} from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: (context?: string) => string;
  requiresCode?: boolean;
  requiresErrors?: boolean;
}

const quickActions: QuickAction[] = [
  {
    id: 'generate',
    label: 'Generate Contract',
    icon: <Wand2 className="h-4 w-4" />,
    prompt: () => 'Generate a Stylus smart contract that ',
    requiresCode: false,
  },
  {
    id: 'explain',
    label: 'Explain Code',
    icon: <HelpCircle className="h-4 w-4" />,
    prompt: (code) => `Explain what this Stylus contract does:\n\`\`\`rust\n${code}\n\`\`\``,
    requiresCode: true,
  },
  {
    id: 'fix-error',
    label: 'Fix Error',
    icon: <Bug className="h-4 w-4" />,
    prompt: (code) => `Help me fix the compilation errors in this Stylus contract:\n\`\`\`rust\n${code}\n\`\`\``,
    requiresCode: true,
    requiresErrors: true,
  },
  {
    id: 'optimize',
    label: 'Optimize Gas',
    icon: <Zap className="h-4 w-4" />,
    prompt: (code) => `Suggest gas optimizations for this Stylus contract:\n\`\`\`rust\n${code}\n\`\`\``,
    requiresCode: true,
  },
  {
    id: 'add-function',
    label: 'Add Function',
    icon: <Code2 className="h-4 w-4" />,
    prompt: (code) => `Add a new function to this contract that `,
    requiresCode: true,
  },
  {
    id: 'convert',
    label: 'Convert Solidity',
    icon: <ArrowRightLeft className="h-4 w-4" />,
    prompt: () => 'Convert this Solidity contract to Stylus:\n\`\`\`solidity\n\n\`\`\`',
    requiresCode: false,
  },
  {
    id: 'add-test',
    label: 'Add Tests',
    icon: <FileCode className="h-4 w-4" />,
    prompt: (code) => `Write unit tests for this Stylus contract:\n\`\`\`rust\n${code}\n\`\`\``,
    requiresCode: true,
  },
  {
    id: 'best-practices',
    label: 'Best Practices',
    icon: <Lightbulb className="h-4 w-4" />,
    prompt: (code) => `Review this contract and suggest best practices:\n\`\`\`rust\n${code}\n\`\`\``,
    requiresCode: true,
  },
];

interface QuickActionsProps {
  onActionClick: (action: QuickAction) => void;
  hasCode: boolean;
  hasErrors: boolean;
}

export function QuickActions({ onActionClick, hasCode, hasErrors }: QuickActionsProps) {
  return (
    <div className="space-y-3">
      <div className="px-4 pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2 px-4">
        {quickActions.map((action) => {
          const isDisabled = 
            (action.requiresCode && !hasCode) ||
            (action.requiresErrors && !hasErrors);

          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => onActionClick(action)}
              disabled={isDisabled}
              className="h-auto py-3 flex flex-col items-center gap-1.5 hover:bg-primary/10"
            >
              {action.icon}
              <span className="text-xs leading-tight text-center">
                {action.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export { quickActions };