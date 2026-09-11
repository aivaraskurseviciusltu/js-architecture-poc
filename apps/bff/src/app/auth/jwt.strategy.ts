import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email?: string;
  roles?: string[];
  /** Cognito groups claim */
  'cognito:groups'?: string[];
  'cognito:username'?: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT strategy — works in two modes, selected automatically via env vars:
 *
 * LOCAL (default):
 *   JWT_SECRET is set → validates tokens with a symmetric HMAC secret.
 *   Tokens are issued by the BFF's own AuthService (POST /api/auth/login).
 *
 * AWS / COGNITO:
 *   JWKS_URI is set → validates tokens against the Cognito JWKS endpoint.
 *   The BFF never issues tokens; Cognito's Hosted UI does.
 *   Set JWKS_URI to:
 *     https://cognito-idp.<region>.amazonaws.com/<userPoolId>/.well-known/jwks.json
 *
 * Only one of JWT_SECRET or JWKS_URI should be set in any given environment.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const jwksUri  = config.get<string>('JWKS_URI');
    const jwtSecret = config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me-in-production';

    const base = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
    };

    if (jwksUri) {
      // ── Cognito / OIDC mode — verify against the provider's public JWKS ──────
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { passportJwtSecret } = require('jwks-rsa') as typeof import('jwks-rsa');
      super({
        ...base,
        secretOrKeyProvider: passportJwtSecret({
          jwksUri,
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 10,
        }),
      } as unknown as StrategyOptionsWithoutRequest);
    } else {
      // ── Local / symmetric mode — verify against JWT_SECRET ───────────────────
      super({ ...base, secretOrKey: jwtSecret });
    }
  }

  validate(payload: JwtPayload): JwtPayload {
    // Normalise Cognito groups → roles so the rest of the app is provider-agnostic
    if (payload['cognito:groups'] && !payload.roles) {
      payload.roles = payload['cognito:groups'];
    }
    return payload;
  }
}
