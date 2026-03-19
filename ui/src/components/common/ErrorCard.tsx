import { AlertTriangle, Key } from 'lucide-react';

/** Simplify raw API error messages for display */
function simplifyError(message: string): string {
  const parts = message.split(';').map(s => s.trim()).filter(Boolean);
  const simplified: string[] = [];
  const keysMissing = new Set<string>();

  for (const part of parts) {
    const keyMatch = part.match(/(\w+_API_KEY)(?:\s+\(or\s+\w+\))?\s+not set/i);
    if (keyMatch) {
      keysMissing.add(keyMatch[1]);
      continue;
    }
    // Skip URL-only parts and "Get a free key" instructions
    if (part.match(/^https?:\/\//) || part.match(/^Get a free key/i)) continue;
    if (part.length > 80) {
      simplified.push(part.slice(0, 77) + '…');
    } else {
      simplified.push(part);
    }
  }

  const result: string[] = [];
  if (keysMissing.size > 0) {
    result.push(`API key${keysMissing.size > 1 ? 's' : ''} needed: ${Array.from(keysMissing).join(', ')}`);
  }
  result.push(...simplified);
  return result.join(' · ') || message;
}

export function ErrorCard({ message }: { message: string }) {
  const isKeyError = /API_KEY/i.test(message);
  const displayMsg = simplifyError(message);

  return (
    <div className="rounded-xl p-3 flex items-start gap-2.5" style={{
      background: isKeyError ? 'rgba(99,102,241,0.08)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${isKeyError ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)'}`,
    }}>
      {isKeyError
        ? <Key size={14} className="shrink-0 mt-0.5" style={{ color: '#818cf8' }} />
        : <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#ef4444' }} />}
      <span className="text-xs leading-relaxed" style={{ color: isKeyError ? '#a5b4fc' : '#fca5a5' }}>
        {displayMsg}
      </span>
    </div>
  );
}
