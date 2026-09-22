import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Deck } from '@deckup/shared';
import { describe, expect, it, vi } from 'vitest';

import { DeckForm } from './deck-form';

const EXISTING_DECK: Deck = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'History — Final',
  description: null,
  subject: 'History',
  color: null,
  visibility: 'PUBLIC',
  tags: ['final'],
  cardCount: 12,
  dueCount: 3,
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:00:00.000Z',
};

describe('DeckForm', () => {
  it('requires a title', async () => {
    const onSubmit = vi.fn();
    render(<DeckForm submitLabel="Create deck" isSubmitting={false} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /create deck/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the payload with parsed tags', async () => {
    const onSubmit = vi.fn();
    render(<DeckForm submitLabel="Create deck" isSubmitting={false} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Title'), 'Biology — Unit 3');
    await userEvent.type(screen.getByLabelText('Subject'), 'Biology');
    await userEvent.type(screen.getByLabelText('Tags'), 'exam-1, unit-3');

    await userEvent.click(screen.getByRole('button', { name: /create deck/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Biology — Unit 3',
        subject: 'Biology',
        visibility: 'PRIVATE',
        tags: ['exam-1', 'unit-3'],
      }),
    );
  });

  it('prefills the form when editing an existing deck', () => {
    render(
      <DeckForm
        deck={EXISTING_DECK}
        submitLabel="Save changes"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Title')).toHaveValue('History — Final');
    expect(screen.getByLabelText('Tags')).toHaveValue('final');
    expect(screen.getByLabelText('Visibility')).toHaveValue('PUBLIC');
  });
});
