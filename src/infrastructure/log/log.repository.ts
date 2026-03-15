import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { LogLevel, Prisma } from '@prisma/client';

export type { LogLevel };

export interface CreateLogInput {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  path?: string;
  method?: string;
  userId?: string;
}

@Injectable()
export class LogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLogInput): Promise<void> {
    await this.prisma.log.create({
      data: {
        level: data.level,
        message: data.message,
        context: (data.context ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        requestId: data.requestId ?? null,
        path: data.path ?? null,
        method: data.method ?? null,
        userId: data.userId ?? null,
      },
    });
  }
}
