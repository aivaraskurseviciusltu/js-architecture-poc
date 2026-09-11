import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';

export interface DevUser {
  username: string;
  password: string;
  sub: string;
  email: string;
  roles: string[];
}

/**
 * Local-dev authentication service.
 *
 * Validates credentials against the DEV_USERS env var (JSON array) and issues
 * a signed JWT. This is intentionally simple — in production replace with
 * Cognito / Auth0 / any OIDC provider (the JwtStrategy already supports JWKS).
 *
 * DEV_USERS format (JSON, base64-encoded in the env var):
 *   [{"username":"alice","password":"alice123","sub":"u1","email":"alice@example.com","roles":["user"]}]
 */
@Injectable()
export class AuthService {
  private readonly devUsers: DevUser[];
  private readonly jwtSecret: string;

  constructor(private readonly config: ConfigService) {
    this.jwtSecret = config.getOrThrow<string>('JWT_SECRET');

    const raw = config.get<string>('DEV_USERS') ?? '';
    try {
      this.devUsers = raw ? (JSON.parse(raw) as DevUser[]) : defaultDevUsers();
    } catch {
      this.devUsers = defaultDevUsers();
    }
  }

  login(username: string, password: string): { accessToken: string; user: Omit<DevUser, 'password'> } {
    const user = this.devUsers.find(
      u => u.username === username && u.password === password,
    );
    if (!user) throw new UnauthorizedException('Invalid username or password');

    const { password: _pw, ...publicUser } = user;
    const accessToken = sign(
      { sub: user.sub, email: user.email, roles: user.roles },
      this.jwtSecret,
      { expiresIn: '8h' },
    );
    return { accessToken, user: publicUser };
  }
}

/** Fallback users when DEV_USERS env var is not set — local dev only. */
function defaultDevUsers(): DevUser[] {
  return [
    { username: 'admin',   password: 'admin',   sub: 'u1', email: 'admin@example.com',   roles: ['admin'] },
    { username: 'aivaras', password: 'aivaras', sub: 'u2', email: 'aivaras@example.com', roles: ['user']  },
  ];
}
