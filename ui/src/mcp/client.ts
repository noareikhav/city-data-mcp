/**
 * Lightweight MCP client for the browser.
 *
 * Speaks JSON-RPC 2.0 over HTTP (StreamableHTTP transport) to the MCP server.
 * Maintains a session via the `mcp-session-id` header.
 */

const MCP_URL =
  import.meta.env.VITE_MCP_URL ||
  (import.meta.env.DEV
    ? '/mcp'  // Vite proxy in dev
    : 'https://city-data-mcp-production.up.railway.app/mcp');

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface McpTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

let sessionId: string | null = null;
let nextId = 1;

/** Parse an SSE text/event-stream body and return the first JSON-RPC response */
function parseSSE(raw: string): JsonRpcResponse | null {
  for (const line of raw.split('\n')) {
    if (line.startsWith('data: ')) {
      try {
        return JSON.parse(line.slice(6)) as JsonRpcResponse;
      } catch { /* skip */ }
    }
  }
  // Try parsing as plain JSON (non-SSE fallback)
  try {
    return JSON.parse(raw) as JsonRpcResponse;
  } catch {
    return null;
  }
}

/** Send a JSON-RPC request to the MCP server */
async function rpc(method: string, params?: Record<string, unknown>): Promise<unknown> {
  const body: JsonRpcRequest = { jsonrpc: '2.0', id: nextId++, method, params: params ?? {} };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;

  const res = await fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) });
  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;

  const text = await res.text();
  const parsed = parseSSE(text);

  if (!parsed) throw new Error(`MCP: unparseable response`);
  if (parsed.error) throw new Error(`MCP error ${parsed.error.code}: ${parsed.error.message}`);
  return parsed.result;
}

/** Send a notification (no id, no response expected) */
async function notify(method: string, params?: Record<string, unknown>): Promise<void> {
  const body = { jsonrpc: '2.0', method, params: params ?? {} };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  await fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) });
}

// ── Public API ──────────────────────────────────────────────────────────────

let initialized = false;

/** Initialize the MCP session (must be called once before any tool calls) */
export async function mcpInit(): Promise<void> {
  if (initialized && sessionId) return;
  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'city-data-ui', version: '1.0.0' },
  });
  await notify('notifications/initialized');
  initialized = true;
}

/** List all available tools on the MCP server */
export async function mcpListTools(): Promise<McpTool[]> {
  await mcpInit();
  const result = (await rpc('tools/list')) as { tools: McpTool[] };
  return result.tools;
}

/** Call an MCP tool by name with arguments */
export async function mcpCallTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
  await mcpInit();
  const result = (await rpc('tools/call', { name, arguments: args })) as McpToolResult;
  return result;
}

/** Get the text content from a tool result */
export function mcpText(result: McpToolResult): string {
  return result.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');
}

/** Reset session (e.g. on error or reconnect) */
export function mcpReset(): void {
  sessionId = null;
  initialized = false;
  nextId = 1;
}
