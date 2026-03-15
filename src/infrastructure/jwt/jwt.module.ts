import { Global, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type ms from 'ms';

export const JWT_SERVICE = 'JWT_SERVICE';

@Global()
@Module({
  imports: [],
  providers: [
    {
      provide: JWT_SERVICE,
      useFactory: () =>
        new JwtService({
          secret: process.env.JWT_SECRET,
          signOptions: {
            expiresIn: (process.env.JWT_EXPIRES || '15m') as ms.StringValue,
          },
        }),
    },
  ],
  exports: [JWT_SERVICE],
})
export class JwtModule {}
