import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: React.ReactNode;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-success-400" />,
  error: <XCircle className="w-5 h-5 text-danger-400" />,
  warning: <AlertCircle className="w-5 h-5 text-warn-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const styles = {
  success: 'border-success-600 bg-success-900',
  error: 'border-danger-600 bg-danger-900',
  warning: 'border-warn-600 bg-warn-900',
  info: 'border-blue-700 bg-blue-950',
};

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (duration === Infinity || duration === 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-card animate-slide-in ${styles[type]}`}
    >
      {icons[type]}
      <span className="text-sm text-white flex-1">{message}</span>
      <button onClick={onClose} className="text-pitch-300 hover:text-white transition-colors ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: React.ReactNode; type: ToastType; duration?: number }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} duration={t.duration} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}
