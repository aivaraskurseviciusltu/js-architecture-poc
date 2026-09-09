import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects routes by requiring a valid JWT Bearer token.
 * Apply at controller or route level: @UseGuards(JwtAuthGuard)
 *
 * Routes that are intentionally public (e.g. /health, /ready) should NOT
 * use this guard, or you can use a custom IS_PUBLIC decorator to bypass it.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
