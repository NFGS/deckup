import { zodResolver } from '@hookform/resolvers/zod';
import {
  CARD_BACK_MAX_LENGTH,
  CARD_FRONT_MAX_LENGTH,
  CARD_HINT_MAX_LENGTH,
  CARD_IMAGE_MAX_BYTES,
  CARD_IMAGE_MIME_TYPES,
  CARD_TAGS_MAX_COUNT,
  CARD_TAG_MAX_LENGTH,
} from '@deckup/shared';
import type { Card, CardDifficulty } from '@deckup/shared';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../../components/ui/button';
import { Input, Select, Textarea } from '../../components/ui/controls';
import { Field, FormError } from '../../components/ui/field';
import { parseTags } from './tags';

// Limits come from @deckup/shared so the form can never drift from the API.
const cardFormSchema = z.object({
  front: z
    .string()
    .trim()
    .min(1, 'Front is required')
    .max(CARD_FRONT_MAX_LENGTH, `At most ${CARD_FRONT_MAX_LENGTH} characters`),
  back: z
    .string()
    .trim()
    .min(1, 'Back is required')
    .max(CARD_BACK_MAX_LENGTH, `At most ${CARD_BACK_MAX_LENGTH} characters`),
  hint: z.string().trim().max(CARD_HINT_MAX_LENGTH, `At most ${CARD_HINT_MAX_LENGTH} characters`),
  difficulty: z.enum(['', 'EASY', 'MEDIUM', 'HARD']),
  tags: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const tags = parseTags(value);

      if (tags.length > CARD_TAGS_MAX_COUNT) {
        ctx.addIssue({ code: 'custom', message: `At most ${CARD_TAGS_MAX_COUNT} tags` });
      }

      if (tags.some((tag) => tag.length > CARD_TAG_MAX_LENGTH)) {
        ctx.addIssue({
          code: 'custom',
          message: `Tags can be at most ${CARD_TAG_MAX_LENGTH} characters`,
        });
      }
    }),
});

type CardFormValues = z.infer<typeof cardFormSchema>;

export interface CardFormPayload {
  front: string;
  back: string;
  hint: string | null;
  difficulty: CardDifficulty | null;
  tags: string[];
}

export interface CardFormProps {
  card?: Card;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  /** Current image of the card (edit mode only). */
  imageUrl?: string | null;
  isImageBusy?: boolean;
  imageErrorMessage?: string;
  onUploadImage?: (file: File) => void;
  onRemoveImage?: () => void;
  onSubmit: (payload: CardFormPayload) => void;
}

export function CardForm({
  card,
  submitLabel,
  isSubmitting,
  errorMessage,
  imageUrl,
  isImageBusy = false,
  imageErrorMessage,
  onUploadImage,
  onRemoveImage,
  onSubmit,
}: CardFormProps) {
  const [imageError, setImageError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      front: card?.front ?? '',
      back: card?.back ?? '',
      hint: card?.hint ?? '',
      difficulty: card?.difficulty ?? '',
      tags: card?.tags.join(', ') ?? '',
    },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      front: values.front,
      back: values.back,
      hint: values.hint || null,
      difficulty: values.difficulty || null,
      tags: parseTags(values.tags),
    });
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !onUploadImage) {
      return;
    }

    if (!(CARD_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setImageError('Choose a JPEG or PNG image');
      return;
    }

    if (file.size > CARD_IMAGE_MAX_BYTES) {
      setImageError('The image must be at most 5 MB');
      return;
    }

    setImageError(null);
    onUploadImage(file);
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" noValidate>
      <FormError message={errorMessage} />

      <Field label="Front" htmlFor="card-front" error={errors.front?.message}>
        <Textarea id="card-front" placeholder="What is mitosis?" {...register('front')} />
      </Field>

      <Field label="Back" htmlFor="card-back" error={errors.back?.message}>
        <Textarea
          id="card-back"
          placeholder="Cell division that produces two identical cells"
          {...register('back')}
        />
      </Field>

      <Field
        label="Hint"
        htmlFor="card-hint"
        error={errors.hint?.message}
        hint="Optional nudge shown during study"
      >
        <Input id="card-hint" placeholder="Think about the nucleus" {...register('hint')} />
      </Field>

      {onUploadImage ? (
        <fieldset className="flex flex-col gap-3 rounded-xl border border-slate-700/60 p-4">
          <legend className="px-1 text-sm text-slate-300">Image</legend>

          {imageUrl ? (
            <img
              src={imageUrl}
              alt={card ? `Image of the card ${card.front}` : 'Card image'}
              className="max-h-44 w-full rounded-lg bg-slate-950/40 object-contain"
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700 has-disabled:cursor-not-allowed has-disabled:opacity-50">
              {imageUrl ? 'Replace image' : 'Upload image'}
              <input
                type="file"
                accept={CARD_IMAGE_MIME_TYPES.join(',')}
                className="sr-only"
                disabled={isImageBusy}
                onChange={handleFileChange}
              />
            </label>

            {imageUrl && onRemoveImage ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isImageBusy}
                onClick={onRemoveImage}
              >
                Remove image
              </Button>
            ) : null}
          </div>

          <p className="text-xs text-slate-400">JPEG or PNG, up to 5 MB.</p>
          <FormError message={imageError ?? imageErrorMessage} />
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Difficulty" htmlFor="card-difficulty" error={errors.difficulty?.message}>
          <Select id="card-difficulty" {...register('difficulty')}>
            <option value="">Not set</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </Select>
        </Field>

        <Field label="Tags" htmlFor="card-tags" error={errors.tags?.message} hint="Comma separated">
          <Input id="card-tags" placeholder="unit-3, definitions" {...register('tags')} />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
