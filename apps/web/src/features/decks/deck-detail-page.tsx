import type { Card, CreateCard, Deck } from '@deckup/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/controls';
import { FormError } from '../../components/ui/field';
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/ui/icons';
import { LinkButton } from '../../components/ui/link-button';
import { Modal } from '../../components/ui/modal';
import {
  Badge,
  Card as SurfaceCard,
  CardDescription,
  CardTitle,
  EmptyState,
  Spinner,
} from '../../components/ui/surfaces';
import { ApiError } from '../../lib/api-client';
import { downloadBlob } from '../../lib/download';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { GenerateCardsModal } from '../ai/generate-cards-modal';
import type { GeneratedCardInput, GeneratedCardsResult } from '../ai/generate-cards-modal';
import { CardForm } from './card-form';
import type { CardFormPayload } from './card-form';
import { DeckForm } from './deck-form';
import type { DeckFormPayload } from './deck-form';
import {
  useCards,
  useCreateCard,
  useDeck,
  useDeleteCard,
  useDeleteDeck,
  useExportDeck,
  useRemoveCardImage,
  useUpdateCard,
  useUpdateDeck,
  useUploadCardImage,
} from './hooks';
import { ImportCardsModal } from './import-cards-modal';

const PAGE_SIZE = 20;

type CardModalState = { mode: 'create' } | { mode: 'edit'; card: Card } | null;

export function DeckDetailPage() {
  const { deckId = '' } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [cardSearch, setCardSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [isGenerateOpen, setGenerateOpen] = useState(false);
  const [cardModal, setCardModal] = useState<CardModalState>(null);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const deckQuery = useDeck(deckId);
  const debouncedSearch = useDebouncedValue(cardSearch, 300);
  const cardsQuery = useCards(deckId, {
    q: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const updateDeck = useUpdateDeck(deckId);
  const deleteDeck = useDeleteDeck();
  const exportDeck = useExportDeck();
  const createCard = useCreateCard(deckId);
  const updateCard = useUpdateCard(deckId);
  const deleteCard = useDeleteCard(deckId);
  const uploadCardImage = useUploadCardImage(deckId);
  const removeCardImage = useRemoveCardImage(deckId);

  const loadedCards = cardsQuery.data?.items.length ?? 0;

  useEffect(() => {
    if (cardsQuery.isSuccess && loadedCards === 0 && page > 1) {
      setPage((current) => Math.max(1, current - 1));
    }
  }, [cardsQuery.isSuccess, loadedCards, page]);

  if (deckQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading deck" />
      </div>
    );
  }

  if (deckQuery.isError || !deckQuery.data) {
    const notFound = deckQuery.error instanceof ApiError && deckQuery.error.status === 404;

    return (
      <EmptyState
        titleAs="h1"
        title={notFound ? 'Deck not found' : 'We could not load this deck'}
        description={
          notFound
            ? 'It may have been deleted, or it belongs to another account.'
            : 'Check your connection and try again.'
        }
        action={
          notFound ? (
            <LinkButton to="/dashboard" variant="secondary">
              Back to my decks
            </LinkButton>
          ) : (
            <Button variant="secondary" onClick={() => void deckQuery.refetch()}>
              Try again
            </Button>
          )
        }
      />
    );
  }

  const deck = deckQuery.data;
  const cards = cardsQuery.data?.items ?? [];
  const totalCards = cardsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCards / PAGE_SIZE));

  const handleUpdateDeck = async (payload: DeckFormPayload) => {
    setFormError(null);

    try {
      await updateDeck.mutateAsync(payload);
      setEditOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Unable to save the deck');
    }
  };

  const handleDeleteDeck = async () => {
    setDeleteError(null);

    try {
      await deleteDeck.mutateAsync(deckId);
      void navigate('/dashboard', { replace: true });
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : 'Unable to delete the deck');
    }
  };

  const handleExport = async () => {
    setExportError(null);

    try {
      const { blob, filename } = await exportDeck.mutateAsync(deckId);
      downloadBlob(blob, filename ?? `${deck.title}.csv`);
    } catch (error) {
      setExportError(error instanceof ApiError ? error.message : 'Unable to export the deck');
    }
  };

  const handleAddGenerated = async (cards: GeneratedCardInput[]): Promise<GeneratedCardsResult> => {
    let created = 0;

    for (const card of cards) {
      try {
        await createCard.mutateAsync({ ...card, tags: [] });
        created += 1;
      } catch (error) {
        return {
          created,
          error: error instanceof ApiError ? error.message : 'Unable to add the generated cards',
        };
      }
    }

    return { created };
  };

  const handleCardSubmit = async (payload: CardFormPayload) => {
    setFormError(null);

    try {
      if (cardModal?.mode === 'edit') {
        await updateCard.mutateAsync({ cardId: cardModal.card.id, input: payload });
      } else {
        const createPayload: CreateCard = {
          front: payload.front,
          back: payload.back,
          tags: payload.tags,
          ...(payload.hint !== null ? { hint: payload.hint } : {}),
          ...(payload.difficulty !== null ? { difficulty: payload.difficulty } : {}),
        };

        await createCard.mutateAsync(createPayload);
      }
      setCardModal(null);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Unable to save the card');
    }
  };

  const handleUploadImage = async (file: File) => {
    if (cardModal?.mode !== 'edit') {
      return;
    }

    const cardId = cardModal.card.id;
    setImageError(null);

    try {
      const updated = await uploadCardImage.mutateAsync({ cardId, file });
      setCardModal((current) =>
        current?.mode === 'edit' && current.card.id === cardId
          ? { mode: 'edit', card: updated }
          : current,
      );
    } catch (error) {
      setImageError(error instanceof ApiError ? error.message : 'Unable to upload the image');
    }
  };

  const handleRemoveImage = async () => {
    if (cardModal?.mode !== 'edit') {
      return;
    }

    const cardId = cardModal.card.id;
    setImageError(null);

    try {
      const updated = await removeCardImage.mutateAsync(cardId);
      setCardModal((current) =>
        current?.mode === 'edit' && current.card.id === cardId
          ? { mode: 'edit', card: updated }
          : current,
      );
    } catch (error) {
      setImageError(error instanceof ApiError ? error.message : 'Unable to remove the image');
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) {
      return;
    }

    setDeleteError(null);

    try {
      await deleteCard.mutateAsync(cardToDelete.id);
      setCardToDelete(null);
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : 'Unable to delete the card');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-200">
        ← All decks
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-white">{deck.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {deck.subject ? <Badge tone="sky">{deck.subject}</Badge> : null}
            <Badge>{formatVisibility(deck.visibility)}</Badge>
            <Badge tone={deck.dueCount > 0 ? 'amber' : 'neutral'}>{deck.dueCount} due</Badge>
            <Badge>{deck.cardCount} cards</Badge>
            {deck.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
          {deck.description ? <CardDescription>{deck.description}</CardDescription> : null}
        </div>

        <div className="flex gap-2">
          <LinkButton to={`/decks/${deckId}/study`}>Study</LinkButton>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <PencilIcon className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <TrashIcon className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </header>

      <FormError message={exportError ?? undefined} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">Cards</h2>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search cards"
                aria-label="Search cards"
                value={cardSearch}
                onChange={(event) => {
                  setCardSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              Import
            </Button>
            <Button
              variant="secondary"
              disabled={exportDeck.isPending}
              onClick={() => void handleExport()}
            >
              {exportDeck.isPending ? 'Exporting…' : 'Export'}
            </Button>
            <Button variant="secondary" onClick={() => setGenerateOpen(true)}>
              Generate with AI
            </Button>
            <Button
              onClick={() => {
                setFormError(null);
                setImageError(null);
                setCardModal({ mode: 'create' });
              }}
            >
              <PlusIcon className="h-4 w-4" />
              Add card
            </Button>
          </div>
        </div>

        {cardsQuery.isPending ? (
          <div className="flex justify-center py-12">
            <Spinner label="Loading cards" />
          </div>
        ) : cardsQuery.isError ? (
          <EmptyState
            title="We could not load the cards"
            description="Check your connection and try again."
            action={
              <Button variant="secondary" onClick={() => void cardsQuery.refetch()}>
                Try again
              </Button>
            }
          />
        ) : cards.length === 0 ? (
          <EmptyState
            title={cardSearch ? 'No cards match your search' : 'This deck has no cards yet'}
            description={
              cardSearch
                ? 'Try a different term.'
                : 'Add your first card to start building this deck.'
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {cards.map((card) => (
              <li key={card.id}>
                <CardRow
                  card={card}
                  onEdit={() => {
                    setFormError(null);
                    setImageError(null);
                    setCardModal({ mode: 'edit', card });
                  }}
                  onDelete={() => setCardToDelete(card)}
                />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {page} of {totalPages} · {totalCards} cards
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
      </section>

      <ImportCardsModal deckId={deckId} open={isImportOpen} onClose={() => setImportOpen(false)} />

      <GenerateCardsModal
        open={isGenerateOpen}
        onClose={() => setGenerateOpen(false)}
        onAddCards={handleAddGenerated}
      />

      <Modal open={isEditOpen} title="Edit deck" onClose={() => setEditOpen(false)}>
        <DeckForm
          deck={deck}
          submitLabel="Save changes"
          isSubmitting={updateDeck.isPending}
          errorMessage={formError ?? undefined}
          onSubmit={(payload) => void handleUpdateDeck(payload)}
        />
      </Modal>

      <Modal open={isDeleteOpen} title="Delete deck" onClose={() => setDeleteOpen(false)}>
        <p className="text-sm text-slate-300">
          Deleting <strong className="text-white">{deck.title}</strong> also removes its cards.
          Review history is kept for your statistics.
        </p>
        <FormError message={deleteError ?? undefined} />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteDeck.isPending}
            onClick={() => void handleDeleteDeck()}
          >
            {deleteDeck.isPending ? 'Deleting…' : 'Delete deck'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={cardModal !== null}
        title={cardModal?.mode === 'edit' ? 'Edit card' : 'New card'}
        onClose={() => setCardModal(null)}
      >
        <CardForm
          card={cardModal?.mode === 'edit' ? cardModal.card : undefined}
          submitLabel={cardModal?.mode === 'edit' ? 'Save changes' : 'Add card'}
          isSubmitting={createCard.isPending || updateCard.isPending}
          errorMessage={formError ?? undefined}
          imageUrl={cardModal?.mode === 'edit' ? cardModal.card.imageUrl : null}
          isImageBusy={uploadCardImage.isPending || removeCardImage.isPending}
          imageErrorMessage={imageError ?? undefined}
          onUploadImage={(file) => void handleUploadImage(file)}
          onRemoveImage={() => void handleRemoveImage()}
          onSubmit={(payload) => void handleCardSubmit(payload)}
        />
      </Modal>

      <Modal open={cardToDelete !== null} title="Delete card" onClose={() => setCardToDelete(null)}>
        <p className="text-sm text-slate-300">
          This card will be removed from the deck. Its review history stays in your statistics.
        </p>
        <FormError message={deleteError ?? undefined} />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCardToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={deleteCard.isPending}
            onClick={() => void handleDeleteCard()}
          >
            {deleteCard.isPending ? 'Deleting…' : 'Delete card'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CardRow({
  card,
  onEdit,
  onDelete,
}: {
  card: Card;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <SurfaceCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={`Image of the card ${card.front}`}
            width={64}
            height={64}
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-lg bg-slate-950/40 object-cover"
          />
        ) : null}

        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="truncate">{card.front}</CardTitle>
          <p className="line-clamp-2 text-sm text-slate-400">{card.back}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {card.difficulty ? <Badge tone="amber">{card.difficulty.toLowerCase()}</Badge> : null}
            {card.hint ? <Badge tone="sky">hint</Badge> : null}
            {card.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit card ${card.front}`}>
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label={`Delete card ${card.front}`}
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </SurfaceCard>
  );
}

function formatVisibility(visibility: Deck['visibility']): string {
  switch (visibility) {
    case 'PRIVATE':
      return 'Private';
    case 'UNLISTED':
      return 'Unlisted';
    case 'PUBLIC':
      return 'Public';
  }
}
