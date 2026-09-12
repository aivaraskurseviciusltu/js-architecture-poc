import { AllExceptionsFilter } from '../all-exceptions.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';

function makeHost(method = 'GET', url = '/orders') {
  const json   = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest:  () => ({ method, url }),
      }),
    } as unknown as ArgumentsHost,
    json,
    status,
  };
}

describe('AllExceptionsFilter (order-service)', () => {
  let filter: AllExceptionsFilter;
  beforeEach(() => { filter = new AllExceptionsFilter(); });

  it('maps HttpException to its status code', () => {
    const { host, status } = makeHost();
    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), host);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('maps unknown errors to 500', () => {
    const { host, status } = makeHost();
    filter.catch(new Error('db exploded'), host);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('includes path and timestamp in response', () => {
    const { host, json } = makeHost('POST', '/orders');
    filter.catch(new Error('oops'), host);
    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body['path']).toBe('/orders');
    expect(body['timestamp']).toBeDefined();
  });

  it('passes object HttpException response through', () => {
    const { host, json } = makeHost();
    filter.catch(new HttpException({ message: 'Validation failed', errors: ['x'] }, 422), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: { message: 'Validation failed', errors: ['x'] } }),
    );
  });
});
