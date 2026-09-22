import { zodResolver } from '@hookform/resolvers/zod';
import type { Card, CardDifficulty } from '@deckup/shared';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../../components/ui/button';
import { Input, Select, Textarea } from '../../components/ui/controls';
import { Field, FormError } from '../../components/ui/field';
import { parseTags } from './tags';

const cardFormSchema = z.object({
  front: z.string().trim().min(1, 'Front is required').max(2000, 'At most 2000 characters'),
  back: z.string().trim().min(1, 'Back is required').max(2000, 'At most 2000 characters'),
  hint: z.string().trim().max(300, 'At most 300 characters'),
  difficulty: z.enum(['', 'EASY', 'MEDIUM', 'HARD']),
  tags: z.string().trim().max(400, 'Too many tags'),
});

type CardFormValues = z.infer<typeof cardFormSchema>;

export interface CardFormPayload {
  front: string;
  back: string;
  hint?: string;
  difficulty?: CardDifficulty;
  tags: string[];
}

export interface CardFormProps {
  card?: Card;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (payload: CardFormPayload) => void;
}

export function CardForm({
  card,
  submitLabel,
  isSubmitting,
  errorMessage,
  onSubmit,
}: CardFormProps) {
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
      hint: values.hint || undefined,
      difficulty: values.difficulty || undefined,
      tags: parseTags(values.tags),
    });
  });

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
