interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({
  message,
  size = 'md',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        className={`
          ${sizeClasses[size]}
          border-black border-t-transparent
          animate-spin
        `}
        style={{ borderStyle: 'solid' }}
      />
      {message && (
        <p className="mt-4 text-sm font-bold font-mono uppercase tracking-wider text-black">
          {message}
        </p>
      )}
    </div>
  );
}
