interface ProgressBarProps {
  percentage: number;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'cyan';
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const colorMap = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
};

const sizeMap = {
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-8',
};

export default function ProgressBar({
  percentage,
  color = 'green',
  showPercentage = true,
  size = 'md',
}: ProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className="w-full">
      <div className={`w-full ${sizeMap[size]} border-3 border-black bg-white relative overflow-hidden`}>
        <div
          className={`h-full ${colorMap[color]} transition-all duration-300`}
          style={{ width: `${clampedPercentage}%` }}
        />
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold font-mono text-black">
              {Math.round(clampedPercentage)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
