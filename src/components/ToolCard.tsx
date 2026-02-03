import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Card, CardBody } from '@dader34/stylekit-ui';

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'cyan';
}

const colorMap = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
};

export default function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  color = 'blue',
}: ToolCardProps) {
  return (
    <Link to={href} className="block no-underline hover:bg-transparent group">
      <Card variant="outlined">
        <CardBody>
          {/* Icon */}
          <div
            className={`
              w-14 h-14 mb-4 border-4 border-black flex items-center justify-center
              ${colorMap[color]} group-hover:bg-[#ffff00] transition-colors
            `}
          >
            <Icon className="w-7 h-7 text-white group-hover:text-black transition-colors" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold uppercase tracking-wider mb-2">
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm opacity-70 font-mono">
            {description}
          </p>

          {/* Arrow */}
          <div className="mt-4 font-bold group-hover:translate-x-2 transition-transform">
            →
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
