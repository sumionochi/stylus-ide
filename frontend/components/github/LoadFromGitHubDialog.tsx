'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Loader2 } from 'lucide-react';
import { parseURL } from '@/lib/url-parser';

interface LoadFromGitHubDialogProps {
  onLoadURL: (url: string) => void;
  isLoading?: boolean;
}

export function LoadFromGitHubDialog({ onLoadURL, isLoading }: LoadFromGitHubDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a GitHub URL');
      return;
    }

    const parsed = parseURL(url.trim());

    if (parsed.type !== 'github') {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    onLoadURL(url.trim());
    setOpen(false);
    setUrl('');
  };

  const exampleRepos = [
    {
      name: 'Stylus Hello World',
      url: 'https://github.com/OffchainLabs/stylus-hello-world',
    },
    {
      name: 'Stylus Workshop',
      url: 'https://github.com/OffchainLabs/stylus-workshop-rust-solidity',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Github className="h-4 w-4" />
          <span className="hidden md:inline">Load from GitHub</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load from GitHub</DialogTitle>
          <DialogDescription>
            Enter a GitHub repository URL to load it into the IDE
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github-url">Repository URL</Label>
            <Input
              id="github-url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              disabled={isLoading}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* Example Repos */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Examples:</Label>
            <div className="space-y-1">
              {exampleRepos.map((repo) => (
                <button
                  key={repo.url}
                  type="button"
                  onClick={() => setUrl(repo.url)}
                  className="block w-full text-left text-xs text-blue-500 hover:text-blue-600 hover:underline"
                  disabled={isLoading}
                >
                  {repo.name}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load Repository'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}