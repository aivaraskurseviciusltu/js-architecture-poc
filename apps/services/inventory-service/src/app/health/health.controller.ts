import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

@Controller()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  ready() {
    const isReady = this.connection.readyState === ConnectionStates.connected;
    return { status: isReady ? 'ok' : 'not_ready' };
  }
}
