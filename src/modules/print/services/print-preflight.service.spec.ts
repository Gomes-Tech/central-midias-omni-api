import { PrintPreflightService } from './print-preflight.service';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import {
  placeholderDocument,
  printImagePreset,
} from '../../../test-utils/print-image-fixtures';

describe('PrintPreflightService placeholders', () => {
  it('aprova a estrutura publicável sem exigir a foto que será enviada pelo agente', async () => {
    const template = {
      id: 'template',
      revision: 1,
      document: placeholderDocument,
      baseFile: { width: 1000, height: 1000 },
      assets: [],
      printPreset: {
        ...printImagePreset,
        isActive: true,
        updatedAt: new Date(),
        colorProfile: { ...printImagePreset.colorProfile, isActive: true },
      },
    };
    const prisma = {
      materialTemplate: { findFirst: jest.fn().mockResolvedValue(template) },
      printPreflight: { upsert: jest.fn(async ({ create }) => create) },
    };
    const service = new PrintPreflightService(
      prisma as never,
      {} as never,
      new MaterialTemplateDocumentService(),
    );
    const result = await service.run('material', 'org');
    expect(result.status).toBe('READY');
    expect(result.issues).toEqual([]);
    template.baseFile.width = 1;
    expect((await service.run('material', 'org')).status).toBe('FAILED');
  });
});
