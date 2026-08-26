import { ValidationPipe } from '@nestjs/common';
import { UpdateMaterialDTO } from './update-material.dto';

describe('UpdateMaterialDTO', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });

  it('aceita exportTypes e printPresetId no PATCH multipart', async () => {
    const result = (await pipe.transform(
      {
        name: 'Material CMYK',
        categoryId: '02f8dc5b-af8e-4680-9a92-099788b420d6',
        requiresAcceptance: 'false',
        isCustomizable: 'true',
        hasTextCopy: 'false',
        exportTypes: ['png', 'jpg', 'pdf', 'print_pdf'],
        printPresetId: '98470ede-6b4d-4156-9565-5dff55417447',
        hasExternalLink: 'false',
      },
      { type: 'body', metatype: UpdateMaterialDTO },
    )) as UpdateMaterialDTO;

    expect(result.exportTypes).toEqual(['png', 'jpg', 'pdf', 'print_pdf']);
    expect(result.printPresetId).toBe('98470ede-6b4d-4156-9565-5dff55417447');
    expect(result.isCustomizable).toBe(true);
  });
});
