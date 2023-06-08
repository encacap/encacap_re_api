import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomStringPrefix } from '../utils/helpers.util';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly passUrl: string[] = ['/health', '/graphql'];
  // GraphQL logging uses the apollo plugins.
  // https://docs.nestjs.com/graphql/plugins
  // https://www.apollographql.com/docs/apollo-server/integrations/plugins/
  // https://github.com/nestjs/graphql/issues/923

  private readonly loggerService = new Logger();

  public use(req: Request, res: Response, next: () => void): void {
    if (this.passUrl.includes(req.originalUrl)) {
      return next();
    }

    const requestId = req.headers['x-request-id'] || randomStringPrefix();
    res.setHeader('x-request-id', requestId);

    this.loggerService.log(`${req.method} ${req.originalUrl} - ${req.ip.replace('::ffff:', '')}`, requestId);

    return next();
  }
}
