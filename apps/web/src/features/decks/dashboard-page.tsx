import type { CreateDeck, Deck } from '@deckup/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/controls';
import { PlusIcon, SearchIcon } from '../../components/ui/icons';
import { Modal } from '../../components/ui/modal';
import {
  Badge,
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
  Spinner,
} from '../../components/ui/surfaces';
import { ApiError } from '../../lib/api-client';
import { useAnalyticsOverview } from '../analytics/hooks';
import { DeckForm } from './deck-form';
import type { DeckFormPayload } from './deck-form';
import { useCreateDeck, useDecks } from './hooks';

const PAGE_SIZE = 24;

export function DashboardPage() {
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const decksQuery = useDecks({
    q: search || undefined,
    subject: subject || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const allDecksQuery = useDecks({ pageSize: 100 });
  const overviewQuery = useAnalyticsOverview();
  const createDeck = useCreateDeck();

  const decks = decksQuery.data?.items ?? [];
  const totalDecks = decksQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalDecks / PAGE_SIZE));
  const isFiltering = search.length > 0 || subject.length > 0;
  const streak = overviewQuery.data?.streak;

  const subjects = useMemo(() => {
    const values = new Set<string>();

    for (const deck of allDecksQuery.data?.items ?? []) {
      if (deck.subject) {
        values.add(deck.subject);
      }
    }

    return [...values].sort((left, right) => left.localeCompare(right));
  }, [allDecksQuery.data]);

  const handleCreate = async (payload: DeckFormPayload) => {
    setFormError(null);

    try {
      const input: CreateDeck = {
        title: payload.title,
        visibility: payload.visibility,
        tags: payload.tags,
        ...(payload.subject !== null ? { subject: payload.subject } : {}),
        ...(payload.description !== null ? { description: payload.description } : {}),
        ...(payload.color !== null ? { color: payload.color } : {}),
      };

      await createDeck.mutateAsync(input);
      setCreateOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Unable to create the deck');
    }
  };

  const openCreate = () => {
    setFormError(null);
    setCreateOpen(true);
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My decks</h1>
          <p className="text-sm text-slate-400">Every deck you have created for your exams.</p>
        </div>

        <div className="flex items-center gap-3">
          {streak !== undefined ? (
            <span
              role="status"
              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm text-amber-200"
            >
              {streak === 1 ? '1 day streak' : `${streak} day streak`}
            </span>
          ) : null}

          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            New deck
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search decks"
            aria-label="Search decks"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="sm:w-56">
          <Select
            aria-label="Filter by subject"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All subjects</option>
            {subjects.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {decksQuery.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading decks" />
        </div>
      ) : decksQuery.isError ? (
        <EmptyState
          title="We could not load your decks"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={() => void decksQuery.refetch()}>
              Try again
            </Button>
          }
        />
      ) : decks.length === 0 ? (
        <EmptyState
          title={isFiltering ? 'No decks match your filters' : 'No decks yet'}
          description={
            isFiltering
              ? 'Try a different title or subject.'
              : 'Create your first deck to start studying.'
          }
          action={
            isFiltering ? undefined : (
              <Button onClick={openCreate}>
                <PlusIcon className="h-4 w-4" />
                Create deck
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <li key={deck.id}>
                <DeckCardItem deck={deck} />
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>
                Page {page} of {totalPages} · {totalDecks} decks
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <Modal open={isCreateOpen} title="New deck" onClose={() => setCreateOpen(false)}>
        <DeckForm
          submitLabel="Create deck"
          isSubmitting={createDeck.isPending}
          errorMessage={formError ?? undefined}
          onSubmit={(payload) => void handleCreate(payload)}
        />
      </Modal>
    </div>
  );
}

function DeckCardItem({ deck }: { deck: Deck }) {
  return (
    <Link
      to={`/decks/${deck.id}`}
      className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
    >
      <Card className="h-full transition hover:border-slate-700 hover:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{deck.title}</CardTitle>
          <Badge tone={deck.dueCount > 0 ? 'amber' : 'neutral'}>{deck.dueCount} due</Badge>
        </div>

        {deck.subject ? (
          <p className="mt-1 text-xs tracking-wide text-slate-400 uppercase">{deck.subject}</p>
        ) : null}

        {deck.description ? (
          <CardDescription className="mt-3 line-clamp-2">{deck.description}</CardDescription>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="sky">{deck.cardCount} cards</Badge>
          {deck.tags.slice(0, 3).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </Card>
    </Link>
  );
}
