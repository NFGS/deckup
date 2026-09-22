import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { DomainError } from '../../../domain/errors/domain-errors.js';
import type { DomainErrorCode } from '../../../domain/errors/domain-errors.js';

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  VALIDATION: 422,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
};

const TITLE_BY_STATUS: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  409: 'Conflict',
  413: 'Payload too large',
  422: 'Validation failed',
  429: 'Too many requests',
  500: 'Internal server error',
};

interface ProblemPayload {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: unknown;
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<FastifyReply>();
    const request = context.getRequest<FastifyRequest>();

    const { status, problem } = this.toProblem(exception, request.url);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    void response.status(status).send(problem);
  }

  private toProblem(
    exception: unknown,
    instance: string,
  ): { status: number; problem: ProblemPayload } {
    if (exception instanceof DomainError) {
      const status = STATUS_BY_CODE[exception.code];
      return {
        status,
        problem: {
          type: `https://deckup.app/problems/${exception.code.toLowerCase().replace('_', '-')}`,
          title: TITLE_BY_STATUS[status] ?? 'Request failed',
          status,
          detail: exception.message,
          instance,
          ...(exception.details ? { errors: exception.details.errors } : {}),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();
      const detail = typeof responseBody === 'string' ? responseBody : exception.message;

      return {
        status,
        problem: {
          type: `https://deckup.app/problems/http-${status}`,
          title: TITLE_BY_STATUS[status] ?? 'Request failed',
          status,
          detail,
          instance,
        },
      };
    }

    return {
      status: 500,
      problem: {
        type: 'https://deckup.app/problems/internal-error',
        title: TITLE_BY_STATUS[500] ?? 'Internal server error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance,
      },
    };
  }
}
