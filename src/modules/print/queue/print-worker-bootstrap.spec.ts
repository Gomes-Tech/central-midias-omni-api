import { Test } from '@nestjs/testing';
import { PrintWorkerModule } from '../../../print-worker.module';
import { PrintImageInputService } from '../services/print-image-input.service';
import { PrintExportProcessor } from './print-export.processor';

jest.mock('@infrastructure/config', () => {
  const { Module } = jest.requireActual('@nestjs/common');
  class ConfigModule {}
  Module({})(ConfigModule);
  return { ConfigModule };
});

jest.mock('@infrastructure/log', () => {
  const { Module, Global } = jest.requireActual('@nestjs/common');
  class LoggerService {
    info = jest.fn();
    error = jest.fn();
  }
  class LogModule {}
  Global()(LogModule);
  Module({ providers: [LoggerService], exports: [LoggerService] })(LogModule);
  return { LoggerService, LogModule };
});

jest.mock('@infrastructure/providers', () => {
  const { Module, Global } = jest.requireActual('@nestjs/common');
  class StorageService {}
  class StorageModule {}
  Global()(StorageModule);
  Module({ providers: [StorageService], exports: [StorageService] })(
    StorageModule,
  );
  return { StorageService, StorageModule };
});

jest.mock('@infrastructure/queue', () => {
  const { Module, Global } = jest.requireActual('@nestjs/common');
  const { getQueueToken } = jest.requireActual('@nestjs/bullmq');
  const constants = jest.requireActual('@infrastructure/queue/queue.constants');
  const token = getQueueToken(constants.PRINT_EXPORT_QUEUE);
  class QueueModule {}
  Global()(QueueModule);
  Module({
    providers: [
      { provide: token, useValue: { add: jest.fn().mockResolvedValue({}) } },
    ],
    exports: [token],
  })(QueueModule);
  return { ...constants, QueueModule };
});

describe('PrintWorkerModule', () => {
  it('inicializa o worker separado com o serviço de imagens temporárias', async () => {
    const worker = await Test.createTestingModule({
      imports: [PrintWorkerModule],
    }).compile();
    try {
      await worker.init();
      expect(worker.get(PrintImageInputService)).toBeInstanceOf(
        PrintImageInputService,
      );
      expect(worker.get(PrintExportProcessor)).toBeInstanceOf(
        PrintExportProcessor,
      );
    } finally {
      await worker.close();
    }
  });
});
