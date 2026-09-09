import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

/**
 * JWT strategy: validates a Bearer token from the Authorization header.
 * The JWT_SECRET env var must match the secret used by your identity provider.
 *
 * For OIDC/external IdP, replace secretOrKey with:
 *   secretOrKeyProvider: passportJwtSecret({ jwksUri: process.env.JWKS_URI })
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    // Fall back to a dev-only placeholder so nx serve starts without crashing.
    // In production JWT_SECRET must be set — requests with tokens signed by the
    // fallback will be rejected because the secret won't match.
    const secret =
      config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me-in-production';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
