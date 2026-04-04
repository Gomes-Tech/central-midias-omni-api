import { Global, Injectable, Module } from '@nestjs/common';

/** Stub para testes — não conecta ao banco (evita $connect no bootstrap). */
@Injectable()
export class PrismaService {}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
