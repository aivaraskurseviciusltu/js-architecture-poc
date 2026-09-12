import { AllExceptionsFilter } from '../all-exceptions.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';

function makeHost(method = 'GET', url = '/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method, url };
  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest:  () => request,
      }),
    } as unknown as ArgumentsHost,
    json,
    status,
  };
}

describe('AllExceptionsFilter (bff)', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('returns the HTTP status and message for HttpException', () => {
    const { host, status, json } = makeHost();
    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, path: '/test' }),
    );
  });

  it('returns 500 for non-HTTP exceptions', () => {
    const { host, status } = makeHost();
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('wraps string message in an object', () => {
    const { host, json } = makeHost();
    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: { message: 'Forbidden' } }),
    );
  });

  it('passes object response through directly', () => {
    const { host, json } = makeHost();
    filter.catch(new HttpException({ message: 'Bad Request', errors: [] }, 400), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: { message: 'Bad Request', errors: [] } }),
    );
  });

  it('includes a timestamp and path in the response', () => {
    const { host, json } = makeHost('POST', '/api/auth/login');
    filter.catch(new Error('unexpected'), host);
    const call = json.mock.calls[0][0] as Record<string, unknown>;
    expect(call['path']).toBe('/api/auth/login');
    expect(call['timestamp']).toBeDefined();
  });
});
