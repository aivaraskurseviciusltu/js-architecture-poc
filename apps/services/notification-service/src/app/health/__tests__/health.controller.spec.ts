import { HealthController } from '../health.controller';
import { Connection, ConnectionStates } from 'mongoose';

function makeController(readyState: ConnectionStates) {
  return new HealthController({ readyState } as unknown as Connection);
}

describe('HealthController (notification-service)', () => {
  it('health() always returns { status: "ok" }', () => {
    expect(makeController(ConnectionStates.connected).health()).toEqual({ status: 'ok' });
  });

  it('ready() returns { status: "ok" } when connected', () => {
    expect(makeController(ConnectionStates.connected).ready()).toEqual({ status: 'ok' });
  });

  it('ready() returns { status: "not_ready" } when disconnected', () => {
    expect(makeController(ConnectionStates.disconnected).ready()).toEqual({ status: 'not_ready' });
  });

  it('ready() returns { status: "not_ready" } when connecting', () => {
    expect(makeController(ConnectionStates.connecting).ready()).toEqual({ status: 'not_ready' });
  });
});
