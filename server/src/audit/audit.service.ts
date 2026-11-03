import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    entity: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }

  async list(limit = 100) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return logs.map((log) => ({
      ...log,
      metadata: log.metadata ? this.safeParse(log.metadata) : null,
    }));
  }

  private safeParse(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
