"use client";

import { useState, useCallback } from "react";

interface UseAICompletionReturn {
  isLoading: boolean;
  completion: string;
  error: string | null;
  generateCompletion: (prompt: string, context: string) => Promise<void>;
  clearCompletion: () => void;
}

export function useAICompletion(): UseAICompletionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [completion, setCompletion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generateCompletion = useCallback(
    async (prompt: string, context: string) => {
      setIsLoading(true);
      setCompletion("");
      setError(null);

      try {
        const response = await fetch("/api/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, context }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate completion");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          setCompletion(accumulatedText);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Completion failed";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearCompletion = useCallback(() => {
    setCompletion("");
    setError(null);
  }, []);

  return {
    isLoading,
    completion,
    error,
    generateCompletion,
    clearCompletion,
  };
}
