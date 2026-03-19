import { Database } from 'lucide-react';

export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <Database size={32} style={{ color: 'var(--text-muted)' }} />
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</span>
    </div>
  );
}
