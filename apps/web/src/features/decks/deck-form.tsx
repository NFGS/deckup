import { zodResolver } from '@hookform/resolvers/zod';
import {
  DECK_DESCRIPTION_MAX_LENGTH,
  DECK_SUBJECT_MAX_LENGTH,
  DECK_TAGS_MAX_COUNT,
  DECK_TAG_MAX_LENGTH,
  DECK_TITLE_MAX_LENGTH,
  deckVisibilitySchema,
} from '@deckup/shared';
import type { Deck, DeckVisibility } from '@deckup/shared';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../../components/ui/button';
import { Input, Select, Textarea } from '../../components/ui/controls';
import { Field, FormError } from '../../components/ui/field';
import { parseTags } from './tags';

// UI shape: tags arrive as a comma-separated string and are mapped to the
// shared contract array when submitting. Limits come from @deckup/shared so
// the form can never drift from the API contract.
const deckFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(DECK_TITLE_MAX_LENGTH, `At most ${DECK_TITLE_MAX_LENGTH} characters`),
  subject: z
    .string()
    .trim()
    .max(DECK_SUBJECT_MAX_LENGTH, `At most ${DECK_SUBJECT_MAX_LENGTH} characters`),
  description: z
    .string()
    .trim()
    .max(DECK_DESCRIPTION_MAX_LENGTH, `At most ${DECK_DESCRIPTION_MAX_LENGTH} characters`),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #1E88E5')
    .or(z.literal('')),
  visibility: deckVisibilitySchema,
  tags: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const tags = parseTags(value);

      if (tags.length > DECK_TAGS_MAX_COUNT) {
        ctx.addIssue({ code: 'custom', message: `At most ${DECK_TAGS_MAX_COUNT} tags` });
      }

      if (tags.some((tag) => tag.length > DECK_TAG_MAX_LENGTH)) {
        ctx.addIssue({
          code: 'custom',
          message: `Tags can be at most ${DECK_TAG_MAX_LENGTH} characters`,
        });
      }
    }),
});

type DeckFormValues = z.infer<typeof deckFormSchema>;

export interface DeckFormPayload {
  title: string;
  subject: string | null;
  description: string | null;
  color: string | null;
  visibility: DeckVisibility;
  tags: string[];
}

export interface DeckFormProps {
  deck?: Deck;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (payload: DeckFormPayload) => void;
}

export function DeckForm({
  deck,
  submitLabel,
  isSubmitting,
  errorMessage,
  onSubmit,
}: DeckFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeckFormValues>({
    resolver: zodResolver(deckFormSchema),
    defaultValues: {
      title: deck?.title ?? '',
      subject: deck?.subject ?? '',
      description: deck?.description ?? '',
      color: deck?.color ?? '',
      visibility: deck?.visibility ?? 'PRIVATE',
      tags: deck?.tags.join(', ') ?? '',
    },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      title: values.title,
      subject: values.subject || null,
      description: values.description || null,
      color: values.color || null,
      visibility: values.visibility,
      tags: parseTags(values.tags),
    });
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" noValidate>
      <FormError message={errorMessage} />

      <Field label="Title" htmlFor="deck-title" error={errors.title?.message}>
        <Input id="deck-title" placeholder="Biology — Unit 3" {...register('title')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subject" htmlFor="deck-subject" error={errors.subject?.message}>
          <Input id="deck-subject" placeholder="Biology" {...register('subject')} />
        </Field>

        <Field label="Visibility" htmlFor="deck-visibility" error={errors.visibility?.message}>
          <Select id="deck-visibility" {...register('visibility')}>
            <option value="PRIVATE">Private</option>
            <option value="UNLISTED">Unlisted</option>
            <option value="PUBLIC">Public</option>
          </Select>
        </Field>
      </div>

      <Field label="Description" htmlFor="deck-description" error={errors.description?.message}>
        <Textarea
          id="deck-description"
          placeholder="What does this deck cover?"
          {...register('description')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Color"
          htmlFor="deck-color"
          error={errors.color?.message}
          hint="Hex value, e.g. #1E88E5"
        >
          <Input id="deck-color" placeholder="#1E88E5" {...register('color')} />
        </Field>

        <Field label="Tags" htmlFor="deck-tags" error={errors.tags?.message} hint="Comma separated">
          <Input id="deck-tags" placeholder="exam-1, unit-3" {...register('tags')} />
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
