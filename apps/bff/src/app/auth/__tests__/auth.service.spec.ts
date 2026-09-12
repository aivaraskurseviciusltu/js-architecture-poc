import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockConfig = (overrides: Record<string, string> = {}) => ({
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        ...overrides,
      };
      if (!(key in values)) throw new Error(`Missing config: ${key}`);
      return values[key];
    }),
    get: jest.fn((key: string) => {
      const values: Record<string, string | undefined> = {
        DEV_USERS: undefined,
        ...overrides,
      };
      return values[key];
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfig() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('returns an access token and public user on valid credentials', () => {
    const result = service.login('admin', 'admin');

    expect(result.accessToken).toBeDefined();
    expect(result.user.username).toBe('admin');
    expect(result.user.email).toBe('admin@example.com');
    expect(result.user.roles).toContain('admin');
    expect((result.user as Record<string, unknown>)['password']).toBeUndefined();
  });

  it('returns correct user for the second default dev user', () => {
    const result = service.login('aivaras', 'aivaras');
    expect(result.user.username).toBe('aivaras');
    expect(result.user.roles).toContain('user');
  });

  it('throws UnauthorizedException for wrong password', () => {
    expect(() => service.login('admin', 'wrong')).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for unknown username', () => {
    expect(() => service.login('nobody', 'admin')).toThrow(UnauthorizedException);
  });

  it('uses DEV_USERS from env when provided', async () => {
    const customUsers = JSON.stringify([
      { username: 'alice', password: 'pass1', sub: 'u1', email: 'alice@test.com', roles: ['user'] },
    ]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => 'secret'),
            get: jest.fn((key: string) => (key === 'DEV_USERS' ? customUsers : undefined)),
          },
        },
      ],
    }).compile();

    const svc = module.get<AuthService>(AuthService);
    const result = svc.login('alice', 'pass1');
    expect(result.user.email).toBe('alice@test.com');
  });

  it('falls back to default users when DEV_USERS is invalid JSON', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => 'secret'),
            get: jest.fn((key: string) => (key === 'DEV_USERS' ? '{bad json' : undefined)),
          },
        },
      ],
    }).compile();

    const svc = module.get<AuthService>(AuthService);
    // default user should still work
    expect(() => svc.login('admin', 'admin')).not.toThrow();
  });
});
