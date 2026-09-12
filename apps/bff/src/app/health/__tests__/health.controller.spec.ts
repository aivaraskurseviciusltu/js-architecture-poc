import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

function okResponse(): AxiosResponse {
  return { data: { status: 'ok' }, status: 200, statusText: 'OK', headers: {}, config: {} as never };
}

describe('HealthController (bff)', () => {
  let controller: HealthController;
  let http: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HttpService,    useValue: { get: jest.fn() } },
        { provide: ConfigService,  useValue: { getOrThrow: jest.fn(() => 'http://order-service') } },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    http       = module.get(HttpService);
  });

  it('health() returns { status: "ok" }', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });

  it('ready() returns { status: "ok" } when order-service responds', async () => {
    http.get.mockReturnValue(of(okResponse()));
    const result = await controller.ready();
    expect(result).toEqual({ status: 'ok' });
  });

  it('ready() returns { status: "not_ready" } when order-service is unreachable', async () => {
    http.get.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
    const result = await controller.ready();
    expect(result).toEqual({ status: 'not_ready' });
  });
});
