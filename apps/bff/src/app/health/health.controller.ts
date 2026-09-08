import { Controller, Get } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Controller()
export class HealthController {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    const orderServiceUrl = this.config.getOrThrow<string>('ORDER_SERVICE_URL');
    try {
      await firstValueFrom(this.http.get(`${orderServiceUrl}/ready`));
      return { status: 'ok' };
    } catch {
      return { status: 'not_ready' };
    }
  }
}
