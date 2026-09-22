import type { Deck } from '@deckup/shared';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/controls';
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
import { DeckForm } from './deck-form';
import type { DeckFormPayload } from './deck-form';
import { useCreateDeck, useDecks } from './hooks';

export function DashboardPage() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const decksQuery = useDecks({ q: search || undefined });
  const createDeck = useCreateDeck();

  const decks = decksQuery.data?.items ?? [];

  const handleCreate = async (payload: DeckFormPayload) => {
    setFormError(null);

    try {
      await createDeck.mutateAsync(payload);
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
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          New deck
        </Button>
      </header>

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search decks"
          aria-label="Search decks"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {decksQuery.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading decks" />
        </div>
      ) : decksQuery.isError ? (
        <EmptyState
          title="We could not load your decks"
          description="Check your connection and try again."
        />
      ) : decks.length === 0 ? (
        <EmptyState
          title={search ? 'No decks match your search' : 'No decks yet'}
          description={
            search ? 'Try a different title.' : 'Create your first deck to start studying.'
          }
          action={
            search ? undefined : (
              <Button onClick={openCreate}>
                <PlusIcon className="h-4 w-4" />
                Create deck
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <li key={deck.id}>
              <DeckCardItem deck={deck} />
            </li>
          ))}
        </ul>
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
