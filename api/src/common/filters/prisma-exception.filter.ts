import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    console.error(
      `[PrismaExceptionFilter] ${request.method} ${request.url} — ${exception.code}: ${exception.message}`,
      exception.meta ?? '',
    );

    let status = HttpStatus.BAD_REQUEST;
    let message = exception.message;

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = 'Record already exists.';
        break;

      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'The selected health record is no longer valid.';
        break;

      case 'P2010':
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Health-goal tracking storage could not complete the database operation.';
        break;

      case 'P2021':
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'The health-goal database table is missing or unavailable. Apply the latest migrations and restart the API.';
        break;

      case 'P2022':
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'The health-goal database schema is out of date. Apply the latest migrations and restart the API.';
        break;

      case 'P2024':
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'The health database took too long to respond. Please try again.';
        break;

      case 'P2034':
        status = HttpStatus.CONFLICT;
        message = 'Another health-goal update was processed at the same time. Please retry.';
        break;
    }

    const isLocalRequest =
      request.hostname === 'localhost' ||
      request.hostname === '127.0.0.1' ||
      request.hostname === '::1';

    if (exception.code === 'P2010' && (process.env.NODE_ENV !== 'production' || isLocalRequest)) {
      const meta = exception.meta as Record<string, unknown> | undefined;
      const dbCode =
        typeof meta?.code === 'string'
          ? meta.code
          : /Code:\s*[\`"]?([0-9A-Z]{5})/.exec(exception.message)?.[1] ?? null;
      const dbMessage =
        typeof meta?.message === 'string'
          ? meta.message
          : /Message:\s*([\\s\\S]+)$/i.exec(exception.message)?.[1]?.trim() ?? exception.message;

      response.status(status).json({
        success: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message,
        debug: {
          prismaCode: exception.code,
          databaseCode: dbCode,
          databaseMessage: dbMessage,
          prismaMessage: exception.message,
        },
      });
      return;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
