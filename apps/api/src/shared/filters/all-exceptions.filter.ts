import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ThrottlerException } from '@nestjs/throttler';
import * as Sentry from '@sentry/nestjs';

/**
 * Standard error response format
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: unknown;
}

/**
 * Global Exception Filter
 *
 * Catches all unhandled exceptions and returns a consistent error response.
 * - Hides internal error details in production
 * - Logs all errors with appropriate context
 * - Handles common exception types (HTTP, Prisma, validation)
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error, details } = this.getErrorInfo(exception);

    // Get request ID for tracing (if set by middleware)
    const requestId = (request as any).id || request.headers['x-request-id'];

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message:
        this.isProduction && status === 500 ? 'Internal server error' : message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (requestId) {
      errorResponse.requestId = String(requestId);
    }

    // Include details in non-production or for client errors
    if (!this.isProduction || status < 500) {
      if (details) {
        errorResponse.details = details;
      }
    }

    // Log the error
    this.logError(exception, request, status, requestId);

    response.status(status).json(errorResponse);
  }

  /**
   * Extract error information from exception
   */
  private getErrorInfo(exception: unknown): {
    status: number;
    message: string;
    error: string;
    details?: unknown;
  } {
    // HTTP Exception (NestJS built-in)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const response = exceptionResponse as Record<string, unknown>;
        return {
          status,
          message: String(response.message || exception.message),
          error: String(response.error || HttpStatus[status]),
          details: response.details,
        };
      }

      return {
        status,
        message: String(exceptionResponse),
        error: HttpStatus[status],
      };
    }

    // Throttler Exception
    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        message: exception.message || 'Rate limit exceeded',
        error: 'Too Many Requests',
      };
    }

    // Prisma Errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid data provided',
        error: 'Validation Error',
        details: this.isProduction ? undefined : exception.message,
      };
    }

    // Generic Error
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        error: 'Internal Server Error',
        details: this.isProduction ? undefined : exception.stack,
      };
    }

    // Unknown exception
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
    };
  }

  /**
   * Handle Prisma-specific errors
   */
  private handlePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    error: string;
    details?: unknown;
  } {
    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        const target =
          (exception.meta?.target as string[])?.join(', ') || 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${target} already exists`,
          error: 'Conflict',
          details: this.isProduction
            ? undefined
            : { code: exception.code, target },
        };
      }

      case 'P2025': // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested resource was not found',
          error: 'Not Found',
        };

      case 'P2003': // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related resource',
          error: 'Bad Request',
        };

      case 'P2014': // Required relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The operation would violate a required relation',
          error: 'Bad Request',
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          error: 'Internal Server Error',
          details: this.isProduction ? undefined : { code: exception.code },
        };
    }
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(
    exception: unknown,
    request: Request,
    status: number,
    requestId?: string,
  ): void {
    const context = {
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId,
      organizationId: (request as any).auth?.organizationId,
      userId: (request as any).auth?.userId,
    };

    if (status >= 500) {
      // Server errors - log full details
      this.logger.error(
        {
          message:
            exception instanceof Error ? exception.message : 'Unknown error',
          stack: exception instanceof Error ? exception.stack : undefined,
          ...context,
        },
        exception instanceof Error ? exception.stack : undefined,
      );

      // Report to Sentry for 5xx errors
      Sentry.withScope((scope) => {
        scope.setTag('status_code', status.toString());
        scope.setTag('path', request.url);
        scope.setTag('method', request.method);

        if (requestId) {
          scope.setTag('request_id', requestId);
        }
        if (context.organizationId) {
          scope.setTag('organization_id', context.organizationId);
        }
        if (context.userId) {
          scope.setUser({ id: context.userId });
        }

        scope.setContext('request', {
          url: request.url,
          method: request.method,
          headers: {
            'user-agent': request.headers['user-agent'],
            'content-type': request.headers['content-type'],
          },
        });

        Sentry.captureException(exception);
      });
    } else if (status >= 400) {
      // Client errors - log warning
      this.logger.warn({
        message:
          exception instanceof Error ? exception.message : 'Client error',
        status,
        ...context,
      });
    }
  }
}
