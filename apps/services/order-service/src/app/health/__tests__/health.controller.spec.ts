import { HealthController } from '../health.controller';
import { Connection, ConnectionStates } from 'mongoose';

function makeController(readyState: ConnectionStates) {
  return new HealthController({ readyState } as unknown as Connection);
}

describe('HealthController (order-service)', () => {
  it('health() always returns { status: "ok" }', () => {
    expect(makeController(ConnectionStates.connected).health()).toEqual({ status: 'ok' });
  });

  it('ready() returns { status: "ok" } when Mongo is connected', async () => {
    expect(await makeController(ConnectionStates.connected).ready()).toEqual({ status: 'ok' });
  });

  it('ready() returns { status: "not_ready" } when Mongo is disconnected', async () => {
    expect(await makeController(ConnectionStates.disconnected).ready()).toEqual({ status: 'not_ready' });
  });

  it('ready() returns { status: "not_ready" } when Mongo is connecting', async () => {
    expect(await makeController(ConnectionStates.connecting).ready()).toEqual({ status: 'not_ready' });
  });
});
