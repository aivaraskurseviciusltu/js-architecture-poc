import { MongoSanitizeMiddleware } from '../mongo-sanitize.middleware';
import { BadRequestException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

function makeReq(body: unknown, query: Record<string, string> = {}): Request {
  return { body, query } as unknown as Request;
}
const res = {} as Response;
const next: NextFunction = jest.fn();

describe('MongoSanitizeMiddleware', () => {
  let middleware: MongoSanitizeMiddleware;

  beforeEach(() => {
    middleware = new MongoSanitizeMiddleware();
    (next as jest.Mock).mockClear();
  });

  it('passes clean payloads through', () => {
    const req = makeReq({ customerId: 'c1', items: [{ productId: 'p1', name: 'Widget', quantity: 1, unitPrice: 9.99 }] });
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.customerId).toBe('c1');
  });

  it('throws BadRequestException when body contains $ key (NoSQL injection)', () => {
    const req = makeReq({ customerId: { $gt: '' } });
    expect(() => middleware.use(req, res, next)).toThrow(BadRequestException);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when body contains dot-notation key', () => {
    const req = makeReq({ 'foo.bar': 'inject' });
    expect(() => middleware.use(req, res, next)).toThrow(BadRequestException);
  });

  it('sanitizes nested objects', () => {
    const req = makeReq({ outer: { $where: '1==1' } });
    expect(() => middleware.use(req, res, next)).toThrow(BadRequestException);
  });

  it('sanitizes arrays of objects', () => {
    const req = makeReq({ items: [{ $set: 'x' }] });
    expect(() => middleware.use(req, res, next)).toThrow(BadRequestException);
  });

  it('throws when query contains $ key', () => {
    const req = makeReq({}, { '$where': '1==1' } as Record<string, string>);
    expect(() => middleware.use(req, res, next)).toThrow(BadRequestException);
  });
});
