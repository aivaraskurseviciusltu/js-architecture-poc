import { JwtStrategy } from '../jwt.strategy';
import { ConfigService } from '@nestjs/config';

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  return {
    get: jest.fn((key: string) => overrides[key]),
  } as unknown as ConfigService;
}

describe('JwtStrategy', () => {
  it('constructs in symmetric (local) mode when JWT_SECRET is set', () => {
    const config = makeConfig({ JWT_SECRET: 'my-secret', JWKS_URI: undefined });
    expect(() => new JwtStrategy(config)).not.toThrow();
  });

  describe('validate()', () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
      const config = makeConfig({ JWT_SECRET: 'my-secret', JWKS_URI: undefined });
      strategy = new JwtStrategy(config);
    });

    it('returns the payload unchanged when roles are already set', () => {
      const payload = { sub: 'u1', email: 'u@test.com', roles: ['admin'] };
      expect(strategy.validate(payload)).toEqual(payload);
    });

    it('normalises cognito:groups → roles when roles is absent', () => {
      const payload = { sub: 'u1', 'cognito:groups': ['admins'] } as Parameters<JwtStrategy['validate']>[0];
      const result = strategy.validate(payload);
      expect(result.roles).toEqual(['admins']);
    });

    it('does not overwrite existing roles with cognito:groups', () => {
      const payload = { sub: 'u1', roles: ['user'], 'cognito:groups': ['admins'] } as Parameters<JwtStrategy['validate']>[0];
      const result = strategy.validate(payload);
      expect(result.roles).toEqual(['user']);
    });
  });
});
