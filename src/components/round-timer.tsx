
'use client';

import { useState, useEffect } from 'react';
import type { GameStatus } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoundTimerProps {
  endTime: Timestamp | Date | null;
  status: GameStatus;
  className?: string;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export default function RoundTimer({ endTime, status, className }: RoundTimerProps) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    if (status !== 'active' || !endTime) {
      setRemainingTime(null);
      return;
    }

    const calculateRemainingTime = () => {
      const now = Date.now();
      const end = (endTime instanceof Timestamp ? endTime.toMillis() : new Date(endTime).getTime());
      const diff = Math.round((end - now) / 1000);
      setRemainingTime(diff > 0 ? diff : 0);
    };

    calculateRemainingTime();

    const intervalId = setInterval(calculateRemainingTime, 1000);

    return () => clearInterval(intervalId);
  }, [endTime, status]);

  if (status !== 'active' || remainingTime === null) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 font-mono font-semibold', className)}>
      <Timer className="h-5 w-5" />
      <span>
        {remainingTime > 0 ? `${formatTime(remainingTime)} remaining` : "Time's Up!"}
      </span>
    </div>
  );
}
