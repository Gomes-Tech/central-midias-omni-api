import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        // Configuração padrão para todas as rotas
        ttl: 60000, // 1 minuto em milissegundos
        limit: 1000, // 1000 requisições por minuto
      },
    ]),
  ],
  exports: [ThrottlerModule],
})
export class ThrottlerConfigModule {}
