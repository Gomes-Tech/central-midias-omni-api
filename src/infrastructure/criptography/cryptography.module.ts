import { Global, Module } from '@nestjs/common';
import { CryptographyService } from './cryptography.service';

@Global()
@Module({
  imports: [],
  providers: [CryptographyService],
  exports: [CryptographyService],
})
export class CryptographyModule {}
