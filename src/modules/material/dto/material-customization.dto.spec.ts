import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMaterialDTO } from './create-material.dto';

describe('Material customization DTO', () => {
  it('deve aceitar customization como JSON string e transformar booleans', async () => {
    const dto = plainToInstance(CreateMaterialDTO, {
      name: 'Material',
      categoryId: 'category-id',
      isCustomizable: 'true',
      customization:
        '{"position":"TOP","hasPhonePrimary":"true","hasCity":"false"}',
    });

    const errors = await validate(dto);

    expect(errors).toEqual([]);
    expect(dto.isCustomizable).toBe(true);
    expect(dto.customization).toEqual(
      expect.objectContaining({
        position: 'TOP',
        hasPhonePrimary: true,
        hasCity: false,
      }),
    );
  });

  it('deve rejeitar customization em formato inválido', async () => {
    const dto = plainToInstance(CreateMaterialDTO, {
      name: 'Material',
      categoryId: 'category-id',
      isCustomizable: 'true',
      customization: '{invalid',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'customization')).toBe(
      true,
    );
  });
});
