import { useEffect } from 'react';
import { Undo2 } from 'lucide-react';

type Props = {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  duration?: number; // ms, default 4000
};

export default function Toast({ label, actionLabel, onAction, onDismiss, duration = 4000 }: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-[90%] animate-fade-in">
      <div className="bg-surface2 border border-white/10 rounded-full pl-4 pr-1 py-1 shadow-lg flex items-center gap-3">
        <span className="text-xs text-text/90">{label}</span>
        {actionLabel && onAction && (
          <button
            onClick={() => { onAction(); onDismiss(); }}
            className="text-xs font-medium text-text px-3 py-1.5 rounded-full bg-white/10 active:scale-95 transition-transform flex items-center gap-1.5"
          >
            <Undo2 size={12} />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
