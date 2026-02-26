import { AlertCircle, CheckCircle, Info } from 'lucide-react';

type CalloutProps = {
  children: React.ReactNode;
  type?: 'default' | 'warning' | 'success';
  title?: string;
};

export function Callout({ children, type = 'default', title }: CalloutProps) {
  // Config สีตาม Type (เน้นโทนส้ม/เทา)
  const styles = {
    default: 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-200',
    warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900 text-orange-900 dark:text-orange-300',
    success: 'bg-green-50 border-green-200 text-green-900',
  };

  const icons = {
    default: <Info className="w-5 h-5 text-gray-500" />,
    warning: <AlertCircle className="w-5 h-5 text-orange-600" />,
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
  };

  return (
    <div className={`my-6 flex gap-3 rounded-lg border p-4 ${styles[type]}`}>
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1">
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div className="text-sm leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}