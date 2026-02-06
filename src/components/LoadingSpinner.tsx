interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({
  message,
  size = 'md',
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: { box: 'w-8 h-8', text: 'text-sm', font: 'text-xs' },
    md: { box: 'w-12 h-12', text: 'text-lg', font: 'text-sm' },
    lg: { box: 'w-20 h-20', text: 'text-3xl', font: 'text-sm' },
  };

  const s = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`${s.box} bg-[#ffff00] border-4 border-current flex items-center justify-center animate-spin`}>
        <span className={`text-black font-bold ${s.text}`}>D</span>
      </div>
      {message && (
        <p className={`mt-4 ${s.font} font-bold font-mono uppercase tracking-wider`}>
          {message}
        </p>
      )}
    </div>
  );
}
