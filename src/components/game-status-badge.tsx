import type { GameStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GameStatusBadgeProps {
  status: GameStatus;
  className?: string;
}

export default function GameStatusBadge({ status, className }: GameStatusBadgeProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let text = status.toUpperCase();

  switch (status) {
    case 'waiting':
      variant = 'secondary';
      text = 'WAITING FOR PLAYERS';
      break;
    case 'active':
      variant = 'default'; // primary color
      text = 'ROUND ACTIVE';
      break;
    case 'completed':
      variant = 'outline';
      text = 'ROUND COMPLETED';
      break;
  }

  return (
    <Badge variant={variant} className={cn("text-xs font-bold px-3 py-1", className)}>
      {text}
    </Badge>
  );
}
