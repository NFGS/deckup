import type { PublicDeck } from '@deckup/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/controls';
import { SearchIcon } from '../../components/ui/icons';
import {
  Badge,
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
  Spinner,
} from '../../components/ui/surfaces';
import { ApiError } from '../../lib/api-client';
import { useCloneDeck, usePublicDecks } from './hooks';

const PAGE_SIZE = 24;

export function ExplorePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const decksQuery = usePublicDecks({ q: search || undefined, page, pageSize: PAGE_SIZE });
  const cloneDeck = useCloneDeck();
  const navigate = useNavigate();

  const decks = decksQuery.data?.items ?? [];
  const total = decksQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleClone = async (deck: PublicDeck) => {
    setError(null);
    setCloningId(deck.id);

    try {
      const copy = await cloneDeck.mutateAsync({ deckId: deck.id });
      void navigate(`/decks/${copy.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to clone the deck');
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Explore decks</h1>
          <p className="text-sm text-slate-400">
            Public decks shared by other students. Clone one and make it yours.
          </p>
        </div>

        <div className="relative max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search public decks"
            aria-label="Search public decks"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          {error}
        </p>
      ) : null}

      {decksQuery.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading public decks" />
        </div>
      ) : decksQuery.isError ? (
        <EmptyState
          title="We could not load the catalogue"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={() => void decksQuery.refetch()}>
              Try again
            </Button>
          }
        />
      ) : decks.length === 0 ? (
        <EmptyState
          title={search ? 'No decks match your search' : 'No public decks yet'}
          description={
            search
              ? 'Try a different title.'
              : 'Be the first to publish a deck: set its visibility to Public.'
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{deck.title}</CardTitle>
                  <Badge tone="sky">{deck.cardCount} cards</Badge>
                </div>

                <p className="text-xs tracking-wide text-slate-400 uppercase">
                  by {deck.authorName}
                  {deck.subject ? ` · ${deck.subject}` : ''}
                </p>

                {deck.description ? (
                  <CardDescription className="line-clamp-3">{deck.description}</CardDescription>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {deck.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>

                <div className="mt-auto flex justify-end pt-2">
                  <Button
                    size="sm"
                    disabled={cloningId === deck.id}
                    onClick={() => void handleClone(deck)}
                  >
                    {cloningId === deck.id ? 'Cloning…' : 'Clone deck'}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {page} of {totalPages} · {total} decks
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
    </div>
  );
}
