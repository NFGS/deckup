import type { SessionSummary } from '@deckup/shared';

import { Button } from '../../components/ui/button';
import { LinkButton } from '../../components/ui/link-button';
import { Card, CardDescription, CardTitle } from '../../components/ui/surfaces';

export interface SessionSummaryViewProps {
  summary: SessionSummary;
  deckId: string;
  onRestart: () => void;
}

export function SessionSummaryView({ summary, deckId, onRestart }: SessionSummaryViewProps) {
  const accuracy = Math.round(summary.accuracy * 100);

  return (
    <Card className="flex flex-col items-center gap-6 p-8 text-center">
      <CardTitle className="text-xl">Session complete</CardTitle>

      <div className="grid w-full max-w-md grid-cols-3 gap-4">
        <Stat label="Reviewed" value={String(summary.cardsReviewed)} />
        <Stat label="Correct" value={String(summary.correctCount)} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
      </div>

      <CardDescription>
        You studied for {formatDuration(summary.elapsedSeconds)}. Every review feeds your forecast.
      </CardDescription>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={onRestart}>Study again</Button>
        <LinkButton to={`/decks/${deckId}`} variant="secondary">
          Back to deck
        </LinkButton>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs tracking-wide text-slate-400 uppercase">{label}</p>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}
