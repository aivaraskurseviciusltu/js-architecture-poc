import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * NoSQL injection sanitizer.
 *
 * Strips MongoDB operator keys (keys starting with '$') and dot notation
 * from request bodies and query params to prevent NoSQL operator injection.
 *
 * This complements `express-mongo-sanitize` but is implemented manually
 * so it integrates cleanly with NestJS DI and can be unit-tested directly.
 */
@Injectable()
export class MongoSanitizeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.body) {
      req.body = sanitize(req.body);
    }
    if (req.query) {
      // req.query is a read-only getter in Express 5 — mutate in place instead of reassigning
      sanitizeInPlace(req.query);
    }
    next();
  }
}

function sanitize<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(sanitize) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value as object)) {
      if (key.startsWith('$') || key.includes('.')) {
        throw new BadRequestException(`Forbidden key in request: "${key}"`);
      }
      (value as Record<string, unknown>)[key] = sanitize(
        (value as Record<string, unknown>)[key],
      );
    }
  }
  return value;
}

/** Validates query params in-place (cannot reassign req.query in Express 5). */
function sanitizeInPlace(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      throw new BadRequestException(`Forbidden key in request: "${key}"`);
    }
  }
}
