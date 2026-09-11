import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpErrorsTotal,
} from '@poc/shared-types';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();
    const route = req.path;
    const method = req.method;

    res.on('finish', () => {
      const durationNs = process.hrtime.bigint() - start;
      const durationSec = Number(durationNs) / 1e9;
      const statusCode = String(res.statusCode);
      const labels = { method, route, status_code: statusCode };

      httpRequestsTotal.inc(labels);
      httpRequestDurationSeconds.observe(labels, durationSec);

      if (res.statusCode >= 400) {
        httpErrorsTotal.inc(labels);
      }
    });

    next();
  }
}
