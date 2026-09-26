import type { QueueItem, ReviewRating } from '@deckup/shared';

import { Button } from '../../components/ui/button';
import { Badge, Card, CardDescription, CardTitle } from '../../components/ui/surfaces';
import { cn } from '../../lib/utils';

const RATINGS: { rating: ReviewRating; label: string; key: string; className: string }[] = [
  {
    rating: 'AGAIN',
    label: 'Again',
    key: '1',
    className: 'bg-rose-700 text-white hover:bg-rose-600',
  },
  {
    rating: 'HARD',
    label: 'Hard',
    key: '2',
    className: 'bg-amber-700 text-white hover:bg-amber-600',
  },
  {
    rating: 'GOOD',
    label: 'Good',
    key: '3',
    className: 'bg-emerald-700 text-white hover:bg-emerald-600',
  },
  {
    rating: 'EASY',
    label: 'Easy',
    key: '4',
    className: 'bg-sky-700 text-white hover:bg-sky-600',
  },
];

export interface StudyCardProps {
  item: QueueItem;
  revealed: boolean;
  remaining: number;
  isSubmitting: boolean;
  onReveal: () => void;
  onRate: (rating: ReviewRating) => void;
}

export function StudyCard({
  item,
  revealed,
  remaining,
  isSubmitting,
  onReveal,
  onRate,
}: StudyCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{remaining} cards left in this session</span>
        <Badge tone={item.isNew ? 'emerald' : 'neutral'}>
          {item.isNew ? 'New' : item.state.toLowerCase()}
        </Badge>
      </div>

      <Card className="flex min-h-64 flex-col items-center justify-center gap-6 p-8 text-center">
        <CardTitle className="text-xl">{item.front}</CardTitle>

        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={`Image of the card ${item.front}`}
            className="max-h-48 rounded-lg bg-slate-950/40 object-contain"
          />
        ) : null}

        {item.hint && !revealed ? <CardDescription>Hint: {item.hint}</CardDescription> : null}

        {revealed ? (
          <p className="text-base text-slate-200">{item.back}</p>
        ) : (
          <Button onClick={onReveal}>
            Show answer
            <span className="text-xs opacity-70">(Space)</span>
          </Button>
        )}
      </Card>

      {revealed ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {RATINGS.map((entry) => (
            <button
              key={entry.rating}
              type="button"
              disabled={isSubmitting}
              onClick={() => onRate(entry.rating)}
              className={cn(
                'flex h-14 flex-col items-center justify-center rounded-xl font-semibold transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                'disabled:cursor-not-allowed disabled:opacity-50',
                entry.className,
              )}
            >
              {entry.label}
              <span className="text-xs">key {entry.key}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
