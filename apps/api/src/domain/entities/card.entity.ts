import { randomUUID } from 'node:crypto';

import type { CardDifficulty } from '@deckup/shared';

import { ValidationError } from '../errors/domain-errors.js';

const FACE_MAX_LENGTH = 2000;
const HINT_MAX_LENGTH = 300;
const TAG_MAX_LENGTH = 40;
const MAX_TAGS = 20;

export interface CardProps {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  difficulty: CardDifficulty | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateCardInput {
  deckId: string;
  front: string;
  back: string;
  hint?: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  difficulty?: CardDifficulty | null;
  tags?: string[];
  id?: string;
  now?: Date;
}

export interface CardPatch {
  front?: string;
  back?: string;
  hint?: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  difficulty?: CardDifficulty | null;
  tags?: string[];
}

export class Card {
  private constructor(private readonly props: CardProps) {}

  static create(input: CreateCardInput): Card {
    const now = input.now ?? new Date();
    return new Card({
      id: input.id ?? randomUUID(),
      deckId: input.deckId,
      front: normalizeFace(input.front, 'front'),
      back: normalizeFace(input.back, 'back'),
      hint: normalizeOptionalText(input.hint, HINT_MAX_LENGTH, 'hint'),
      imageUrl: normalizeOptionalText(input.imageUrl, 2048, 'imageUrl'),
      imagePublicId: normalizeOptionalText(input.imagePublicId, 255, 'imagePublicId'),
      difficulty: input.difficulty ?? null,
      tags: normalizeTags(input.tags),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: CardProps): Card {
    return new Card(props);
  }

  get id(): string {
    return this.props.id;
  }

  get deckId(): string {
    return this.props.deckId;
  }

  get front(): string {
    return this.props.front;
  }

  get back(): string {
    return this.props.back;
  }

  get hint(): string | null {
    return this.props.hint;
  }

  get imageUrl(): string | null {
    return this.props.imageUrl;
  }

  get imagePublicId(): string | null {
    return this.props.imagePublicId;
  }

  get difficulty(): CardDifficulty | null {
    return this.props.difficulty;
  }

  get tags(): string[] {
    return [...this.props.tags];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  update(patch: CardPatch, now = new Date()): Card {
    return new Card({
      ...this.props,
      front: patch.front !== undefined ? normalizeFace(patch.front, 'front') : this.props.front,
      back: patch.back !== undefined ? normalizeFace(patch.back, 'back') : this.props.back,
      hint:
        patch.hint !== undefined
          ? normalizeOptionalText(patch.hint, HINT_MAX_LENGTH, 'hint')
          : this.props.hint,
      imageUrl:
        patch.imageUrl !== undefined
          ? normalizeOptionalText(patch.imageUrl, 2048, 'imageUrl')
          : this.props.imageUrl,
      imagePublicId:
        patch.imagePublicId !== undefined
          ? normalizeOptionalText(patch.imagePublicId, 255, 'imagePublicId')
          : this.props.imagePublicId,
      difficulty: patch.difficulty !== undefined ? patch.difficulty : this.props.difficulty,
      tags: patch.tags !== undefined ? normalizeTags(patch.tags) : this.props.tags,
      updatedAt: now,
    });
  }

  markDeleted(now = new Date()): Card {
    return new Card({ ...this.props, deletedAt: now, updatedAt: now });
  }
}

function normalizeFace(raw: string, field: 'front' | 'back'): string {
  const value = raw.trim();
  if (value.length === 0 || value.length > FACE_MAX_LENGTH) {
    throw new ValidationError(`Card ${field} must be between 1 and ${FACE_MAX_LENGTH} characters`, {
      field,
    });
  }
  return value;
}

function normalizeOptionalText(
  raw: string | null | undefined,
  maxLength: number,
  field: string,
): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const value = raw.trim();
  if (value.length === 0) {
    return null;
  }

  if (value.length > maxLength) {
    throw new ValidationError(`${field} must be at most ${maxLength} characters`, { field });
  }

  return value;
}

function normalizeTags(raw: string[] | undefined): string[] {
  if (!raw || raw.length === 0) {
    return [];
  }

  const tags = raw.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);

  if (tags.length > MAX_TAGS) {
    throw new ValidationError(`A card can have at most ${MAX_TAGS} tags`, { field: 'tags' });
  }

  for (const tag of tags) {
    if (tag.length > TAG_MAX_LENGTH) {
      throw new ValidationError(`Tags must be at most ${TAG_MAX_LENGTH} characters`, {
        field: 'tags',
      });
    }
  }

  return [...new Set(tags)];
}
