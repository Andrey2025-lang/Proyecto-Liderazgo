import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // SQLite partial uniqueness also protects simultaneous requests and all roles.
    await this.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS one_pending_application_per_client
      ON LoanApplication(clientId)
      WHERE status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED')`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
