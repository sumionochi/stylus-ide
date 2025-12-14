"use client";

import { useState, useCallback } from "react";
import { CompilationOutput } from "@/lib/compilation";

interface ParsedError {
  line: number;
  column: number;
  message: string;
}

interface UseCompilationReturn {
  isCompiling: boolean;
  output: CompilationOutput[];
  errors: ParsedError[];
  compilationTime: number | null;
  compile: (code: string, streaming?: boolean) => Promise<void>;
  clearOutput: () => void;
}

export function useCompilation(): UseCompilationReturn {
  const [isCompiling, setIsCompiling] = useState(false);
  const [output, setOutput] = useState<CompilationOutput[]>([]);
  const [errors, setErrors] = useState<ParsedError[]>([]);
  const [compilationTime, setCompilationTime] = useState<number | null>(null);

  const compile = useCallback(async (code: string, streaming = false) => {
    setIsCompiling(true);
    setOutput([]);
    setErrors([]);
    setCompilationTime(null);
    const startTime = Date.now();

    try {
      if (streaming) {
        // Server-Sent Events streaming
        const response = await fetch("/api/compile-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error("Compilation request failed");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              setOutput((prev) => [...prev, data]);

              // Handle result message with parsed errors
              if (data.type === "result" && data.errors) {
                setErrors(data.errors);
              }
            }
          }
        }

        setCompilationTime(Date.now() - startTime);
      } else {
        // Regular POST request
        const response = await fetch("/api/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const result = await response.json();

        if (result.output) {
          setOutput(result.output);
        }

        if (result.errors) {
          setErrors(result.errors);
        }

        if (result.error) {
          setOutput([{ type: "error", data: result.error }]);
        }

        setCompilationTime(Date.now() - startTime);
      }
    } catch (error) {
      setOutput([
        {
          type: "error",
          data: error instanceof Error ? error.message : "Compilation failed",
        },
      ]);
      setCompilationTime(Date.now() - startTime);
    } finally {
      setIsCompiling(false);
    }
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
    setErrors([]);
    setCompilationTime(null);
  }, []);

  return {
    isCompiling,
    output,
    errors,
    compilationTime,
    compile,
    clearOutput,
  };
}
