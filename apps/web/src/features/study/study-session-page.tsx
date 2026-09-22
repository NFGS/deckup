import type { ReviewRating, SessionSummary, StudyMode } from '@deckup/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { Button } from '../../components/ui/button';
import { FormError } from '../../components/ui/field';
import { EmptyState, Spinner } from '../../components/ui/surfaces';
import { ApiError } from '../../lib/api-client';
import { enqueueReview, flushQueue, readQueue } from '../../lib/offline-queue';
import { submitReview as sendReview } from './api';
import {
  useCompleteStudySession,
  useStartStudySession,
  useStudyQueue,
  useSubmitReview,
} from './hooks';
import { SessionSummaryView } from './session-summary';
import { StudyCard } from './study-card';

const RATING_BY_KEY: Record<string, ReviewRating> = {
  '1': 'AGAIN',
  '2': 'HARD',
  '3': 'GOOD',
  '4': 'EASY',
};

export function StudySessionPage() {
  const { deckId = '' } = useParams<{ deckId: string }>();
  const [mode, setMode] = useState<StudyMode>('DUE');
  const [runId, setRunId] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queuedReviews, setQueuedReviews] = useState(() => readQueue().length);

  const queryClient = useQueryClient();

  const startSession = useStartStudySession();
  const startSessionAsync = startSession.mutateAsync;
  const queue = useStudyQueue(sessionId);
  const submitReview = useSubmitReview(sessionId ?? '');
  const submitReviewAsync = submitReview.mutateAsync;
  const completeSession = useCompleteStudySession();
  const completeSessionAsync = completeSession.mutateAsync;

  useEffect(() => {
    let active = true;

    setSessionId(null);
    setIndex(0);
    setRevealed(false);
    setSummary(null);
    setError(null);

    void startSessionAsync({ deckId, mode })
      .then((session) => {
        if (active) {
          setSessionId(session.id);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Unable to start the session');
        }
      });

    return () => {
      active = false;
    };
  }, [deckId, mode, runId, startSessionAsync]);

  const items = queue.data?.items ?? [];
  const current = items[index];
  const isFinished = sessionId !== null && !queue.isPending && current === undefined;

  useEffect(() => {
    const syncQueuedReviews = async () => {
      const sent = await flushQueue(async (review) => {
        await sendReview(review.sessionId, {
          cardId: review.cardId,
          rating: review.rating,
        });
      });

      setQueuedReviews(readQueue().length);

      if (sent > 0) {
        void queryClient.invalidateQueries({ queryKey: ['decks'] });
      }
    };

    const handleOnline = () => {
      void syncQueuedReviews();
    };

    if (navigator.onLine && readQueue().length > 0) {
      void syncQueuedReviews();
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!current) {
        return;
      }

      setError(null);

      try {
        await submitReviewAsync({ cardId: current.cardId, rating });
        setRevealed(false);
        setIndex((value) => value + 1);
      } catch (caught) {
        if (!(caught instanceof ApiError) && sessionId) {
          enqueueReview({ sessionId, cardId: current.cardId, rating });
          setQueuedReviews(readQueue().length);
          setRevealed(false);
          setIndex((value) => value + 1);
          return;
        }

        setError(caught instanceof ApiError ? caught.message : 'Unable to save your answer');
      }
    },
    [current, sessionId, submitReviewAsync],
  );

  const handleComplete = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setError(null);

    try {
      setSummary(await completeSessionAsync(sessionId));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to finish the session');
    }
  }, [sessionId, completeSessionAsync]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (summary || !current || event.repeat || submitReview.isPending) {
        return;
      }

      if (event.code === 'Space' && !revealed) {
        event.preventDefault();
        setRevealed(true);
        return;
      }

      if (revealed) {
        const rating = RATING_BY_KEY[event.key];

        if (rating) {
          event.preventDefault();
          void handleRate(rating);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, revealed, summary, handleRate, submitReview.isPending]);

  const restart = () => {
    setMode('DUE');
    setRunId((value) => value + 1);
  };

  if (summary) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <SessionSummaryView summary={summary} deckId={deckId} onRestart={restart} />
      </div>
    );
  }

  const isPreparing = sessionId === null && error === null;
  const hasStartError = sessionId === null && error !== null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link to={`/decks/${deckId}`} className="text-sm text-slate-400 hover:text-slate-200">
        ← Back to deck
      </Link>

      {sessionId !== null ? <FormError message={error ?? undefined} /> : null}

      {queuedReviews > 0 ? (
        <p
          role="status"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
        >
          {queuedReviews === 1
            ? '1 review is saved on this device and will sync when you are back online.'
            : `${queuedReviews} reviews are saved on this device and will sync when you are back online.`}
        </p>
      ) : null}

      {hasStartError ? (
        <EmptyState
          title="We could not start the session"
          description={error ?? 'Check your connection and try again.'}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setError(null);
                setRunId((value) => value + 1);
              }}
            >
              Try again
            </Button>
          }
        />
      ) : isPreparing || queue.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner label="Preparing your session" />
        </div>
      ) : queue.isError ? (
        <EmptyState
          title="We could not load your queue"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={() => void queue.refetch()}>
              Try again
            </Button>
          }
        />
      ) : items.length === 0 ? (
        mode === 'DUE' ? (
          <EmptyState
            title="Nothing is due right now"
            description="You are ahead of schedule. You can still review ahead or go through the whole deck."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => setMode('AHEAD')}>Review ahead</Button>
                <Button variant="secondary" onClick={() => setMode('ALL')}>
                  Review all cards
                </Button>
              </div>
            }
          />
        ) : (
          <EmptyState
            title="This deck has no cards yet"
            description="Add cards before starting a study session."
            action={
              <Link to={`/decks/${deckId}`}>
                <Button variant="secondary">Back to deck</Button>
              </Link>
            }
          />
        )
      ) : isFinished ? (
        <EmptyState
          title="Queue finished"
          description="Finish the session to see your summary and update your analytics."
          action={
            <Button onClick={() => void handleComplete()} disabled={completeSession.isPending}>
              {completeSession.isPending ? 'Finishing…' : 'Finish session'}
            </Button>
          }
        />
      ) : current ? (
        <StudyCard
          item={current}
          revealed={revealed}
          remaining={items.length - index}
          isSubmitting={submitReview.isPending}
          onReveal={() => setRevealed(true)}
          onRate={(rating) => void handleRate(rating)}
        />
      ) : null}
    </div>
  );
}
