import { useState, useEffect } from 'react';
import { mcpCallTool, mcpText, mcpReset, type McpToolResult } from './client';

interface UseMcpToolResult<T> {
  data: T | null;
  raw: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * React hook that calls an MCP tool and returns the result.
 *
 * @param tool   - MCP tool name (e.g. "query_demographics")
 * @param args   - Tool arguments (changes trigger re-fetch)
 * @param parse  - Optional parser to extract structured data from the markdown text
 */
export function useMcpTool<T = string>(
  tool: string | null,
  args: Record<string, unknown> | null,
  parse?: (text: string, result: McpToolResult) => T,
): UseMcpToolResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable key for args to avoid infinite re-renders
  const argsKey = args ? JSON.stringify(args) : null;

  useEffect(() => {
    if (!tool || !argsKey) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await mcpCallTool(tool, JSON.parse(argsKey));
        if (cancelled) return;

        const text = mcpText(result);
        setRaw(text);

        if (result.isError) {
          setError(text);
          setData(null);
        } else if (parse) {
          setData(parse(text, result));
        } else {
          setData(text as unknown as T);
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        // If session expired, reset and retry once
        if (msg.includes('not initialized') || msg.includes('No session')) {
          mcpReset();
          try {
            const result = await mcpCallTool(tool, JSON.parse(argsKey));
            if (cancelled) return;
            const text = mcpText(result);
            setRaw(text);
            if (parse) {
              setData(parse(text, result));
            } else {
              setData(text as unknown as T);
            }
          } catch (retryErr) {
            if (!cancelled) setError(retryErr instanceof Error ? retryErr.message : String(retryErr));
          }
        } else {
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [tool, argsKey, parse]);

  return { data, raw, loading, error };
}

/**
 * Hook that calls an MCP tool for a specific city.
 * Convenience wrapper around useMcpTool.
 */
export function useCityTool<T = string>(
  tool: string,
  city: string | undefined,
  extraArgs?: Record<string, unknown>,
  parse?: (text: string, result: McpToolResult) => T,
): UseMcpToolResult<T> {
  const args = city ? { city, ...extraArgs } : null;
  return useMcpTool<T>(city ? tool : null, args, parse);
}
