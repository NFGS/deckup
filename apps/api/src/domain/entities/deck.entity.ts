import { randomUUID } from 'node:crypto';

import type { DeckVisibility } from '@deckup/shared';

import { ValidationError } from '../errors/domain-errors.js';

const TITLE_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
const SUBJECT_MAX_LENGTH = 60;
const TAG_MAX_LENGTH = 40;
const MAX_TAGS = 20;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export interface DeckProps {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  subject: string | null;
  color: string | null;
  visibility: DeckVisibility;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateDeckInput {
  ownerId: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  color?: string | null;
  visibility?: DeckVisibility;
  tags?: string[];
  id?: string;
  now?: Date;
}

export interface DeckPatch {
  title?: string;
  description?: string | null;
  subject?: string | null;
  color?: string | null;
  visibility?: DeckVisibility;
  tags?: string[];
}

export class Deck {
  private constructor(private readonly props: DeckProps) {}

  static create(input: CreateDeckInput): Deck {
    const now = input.now ?? new Date();
    return new Deck({
      id: input.id ?? randomUUID(),
      ownerId: input.ownerId,
      title: normalizeTitle(input.title),
      description: normalizeOptionalText(input.description, DESCRIPTION_MAX_LENGTH, 'description'),
      subject: normalizeOptionalText(input.subject, SUBJECT_MAX_LENGTH, 'subject'),
      color: normalizeColor(input.color),
      visibility: input.visibility ?? 'PRIVATE',
      tags: normalizeTags(input.tags),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  static restore(props: DeckProps): Deck {
    return new Deck(props);
  }

  get id(): string {
    return this.props.id;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | null {
    return this.props.description;
  }

  get subject(): string | null {
    return this.props.subject;
  }

  get color(): string | null {
    return this.props.color;
  }

  get visibility(): DeckVisibility {
    return this.props.visibility;
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

  update(patch: DeckPatch, now = new Date()): Deck {
    return new Deck({
      ...this.props,
      title: patch.title !== undefined ? normalizeTitle(patch.title) : this.props.title,
      description:
        patch.description !== undefined
          ? normalizeOptionalText(patch.description, DESCRIPTION_MAX_LENGTH, 'description')
          : this.props.description,
      subject:
        patch.subject !== undefined
          ? normalizeOptionalText(patch.subject, SUBJECT_MAX_LENGTH, 'subject')
          : this.props.subject,
      color: patch.color !== undefined ? normalizeColor(patch.color) : this.props.color,
      visibility: patch.visibility ?? this.props.visibility,
      tags: patch.tags !== undefined ? normalizeTags(patch.tags) : this.props.tags,
      updatedAt: now,
    });
  }

  markDeleted(now = new Date()): Deck {
    return new Deck({ ...this.props, deletedAt: now, updatedAt: now });
  }
}

function normalizeTitle(raw: string): string {
  const title = raw.trim();
  if (title.length === 0 || title.length > TITLE_MAX_LENGTH) {
    throw new ValidationError('Deck title must be between 1 and 120 characters', {
      field: 'title',
    });
  }
  return title;
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

function normalizeColor(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined || raw.trim().length === 0) {
    return null;
  }

  const color = raw.trim();
  if (!COLOR_PATTERN.test(color)) {
    throw new ValidationError('Color must be a hex value like #1E88E5', { field: 'color' });
  }

  return color;
}

function normalizeTags(raw: string[] | undefined): string[] {
  if (!raw || raw.length === 0) {
    return [];
  }

  const tags = raw.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);

  if (tags.length > MAX_TAGS) {
    throw new ValidationError(`A deck can have at most ${MAX_TAGS} tags`, { field: 'tags' });
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
