"use client";

import { useState, useCallback } from "react";
import { ProjectState } from "@/types/project";
import { GitHubURLInfo } from "@/lib/url-parser";
import { loadGitHubRepo, GitHubLoadProgress } from "@/lib/github-loader";

export function useGitHubLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<GitHubLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFromGitHub = useCallback(
    async (urlInfo: GitHubURLInfo): Promise<ProjectState | null> => {
      setIsLoading(true);
      setError(null);
      setProgress(null);

      try {
        const project = await loadGitHubRepo(urlInfo, (progressUpdate) => {
          setProgress(progressUpdate);
        });

        setIsLoading(false);
        return project;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    isLoading,
    progress,
    error,
    loadFromGitHub,
    reset,
  };
}
