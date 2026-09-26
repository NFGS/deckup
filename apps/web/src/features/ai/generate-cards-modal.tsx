import type { CardSuggestion } from '@deckup/shared';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '../../components/ui/button';
import { Input, Textarea } from '../../components/ui/controls';
import { Field, FormError } from '../../components/ui/field';
import { Badge } from '../../components/ui/surfaces';
import { Modal } from '../../components/ui/modal';
import { ApiError } from '../../lib/api-client';
import { useGenerateCardSuggestions } from './hooks';

export interface GeneratedCardInput {
  front: string;
  back: string;
  hint?: string;
}

export interface GeneratedCardsResult {
  created: number;
  error?: string;
}

export interface GenerateCardsModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Adds the selected suggestions. Resolves with how many were persisted and,
   * on a partial failure, the error to show; the modal keeps only the cards
   * that were not added so retrying never duplicates them.
   */
  onAddCards: (cards: GeneratedCardInput[]) => Promise<GeneratedCardsResult>;
}

const DEFAULT_MAX_CARDS = 10;
const MIN_CARDS = 1;
const MAX_CARDS = 30;

export function GenerateCardsModal({ open, onClose, onAddCards }: GenerateCardsModalProps) {
  const [notes, setNotes] = useState('');
  const [maxCards, setMaxCards] = useState(DEFAULT_MAX_CARDS);
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setAdding] = useState(false);

  const generate = useGenerateCardSuggestions();

  const maxCardsError =
    Number.isInteger(maxCards) && maxCards >= MIN_CARDS && maxCards <= MAX_CARDS
      ? null
      : `Choose a number between ${MIN_CARDS} and ${MAX_CARDS}`;

  const close = () => {
    setNotes('');
    setSuggestions([]);
    setSelected(new Set());
    setError(null);
    onClose();
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuggestions([]);

    try {
      const response = await generate.mutateAsync({ notes, maxCards });
      setSuggestions(response.suggestions);
      setSelected(new Set(response.suggestions.map((_, index) => index)));

      if (response.suggestions.length === 0) {
        setError('The assistant did not find cards in those notes');
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to generate cards');
    }
  };

  const toggle = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  };

  const handleAdd = async () => {
    const selectedIndexes = suggestions
      .map((_, index) => index)
      .filter((index) => selected.has(index));

    const cards = selectedIndexes.map((index) => {
      const suggestion = suggestions[index] as CardSuggestion;

      return {
        front: suggestion.front,
        back: suggestion.back,
        hint: suggestion.hint ?? undefined,
      };
    });

    if (cards.length === 0) {
      setError('Select at least one suggestion');
      return;
    }

    setAdding(true);

    try {
      const result = await onAddCards(cards);

      if (result.error) {
        const addedIndexes = new Set(selectedIndexes.slice(0, result.created));
        const remaining = suggestions.filter((_, index) => !addedIndexes.has(index));

        setSuggestions(remaining);
        setSelected(new Set(remaining.map((_, index) => index)));
        setError(
          `${result.created} of ${cards.length} cards were added. ${result.error} Retry to add the rest.`,
        );
        return;
      }

      close();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to add the selected cards');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal open={open} title="Generate cards with AI" onClose={close}>
      <form onSubmit={(event) => void handleGenerate(event)} className="flex flex-col gap-4">
        <FormError message={error ?? undefined} />

        <Field
          label="Study notes"
          htmlFor="ai-notes"
          hint="Paste a summary or your class notes. The assistant drafts cards; you review them before saving."
        >
          <Textarea
            id="ai-notes"
            className="min-h-32"
            placeholder="Mitosis is a type of cell division that produces two identical daughter cells…"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex items-end gap-3">
          <Field label="Cards" htmlFor="ai-max-cards" error={maxCardsError ?? undefined}>
            <Input
              id="ai-max-cards"
              type="number"
              min={MIN_CARDS}
              max={MAX_CARDS}
              className="w-24"
              value={maxCards}
              onChange={(event) => {
                const value = event.target.value;
                setMaxCards(value === '' ? Number.NaN : Number(value));
              }}
            />
          </Field>

          <Button
            type="submit"
            disabled={generate.isPending || notes.trim().length < 20 || maxCardsError !== null}
          >
            {generate.isPending ? 'Generating…' : 'Generate suggestions'}
          </Button>
        </div>
      </form>

      {suggestions.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-sm text-slate-400">
            {selected.size} of {suggestions.length} selected
          </p>

          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion.front}-${index}`}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-emerald-500"
                    checked={selected.has(index)}
                    onChange={() => toggle(index)}
                    aria-label={`Use suggestion ${index + 1}`}
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-medium text-white">{suggestion.front}</span>
                    <span className="text-sm text-slate-400">{suggestion.back}</span>
                    {suggestion.hint ? <Badge tone="sky">hint</Badge> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button disabled={isAdding} onClick={() => void handleAdd()}>
              {isAdding ? 'Adding…' : `Add selected (${selected.size})`}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
