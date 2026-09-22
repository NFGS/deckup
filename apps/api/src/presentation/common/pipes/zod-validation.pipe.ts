import { Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

import { ValidationError } from '../../../domain/errors/domain-errors.js';

@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new ValidationError('Request validation failed', {
        errors: result.error.issues.map((issue) => ({
          path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
          message: issue.message,
        })),
      });
    }

    return result.data;
  }
}
