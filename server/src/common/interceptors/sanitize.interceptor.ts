import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

/**
 * Remove sensitive fields from every API response, including nested relations.
 * Prisma includes nested users in loans, applications and payments; those
 * relations must never expose password hashes to the client.
 */
function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    delete copy.passwordHash;
    for (const key of Object.keys(copy)) {
      copy[key] = redact(copy[key]);
    }
    return copy;
  }
  return value;
}

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(redact));
  }
}
