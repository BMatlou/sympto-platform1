import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const error =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (!(exception instanceof HttpException)) {
      console.error(
        `[HttpExceptionFilter] ${request.method} ${request.url} — `,
        exception instanceof Error ? exception.stack ?? exception.message : exception,
      );
    }

    const responseBody: Record<string, unknown> = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error,
    };

    // Never expose database/driver internals in production. During local
    // development, include the actual exception class/message so an unexpected
    // 500 can be diagnosed from the browser without guessing at the cause.
    if (process.env.NODE_ENV !== 'production' && !(exception instanceof HttpException)) {
      responseBody.debug = {
        type: exception?.constructor?.name ?? 'UnknownError',
        message: exception instanceof Error ? exception.message : String(exception),
      };
    }

    response.status(status).json(responseBody);
  }
}