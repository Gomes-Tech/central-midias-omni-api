import { BadRequestException } from '@common/filters';
import { TagRepository } from '../repository';
import { FindTagByIdUseCase } from './find-tag-by-id.use-case';
import { UpdateTagUseCase } from './update-tag.use-case';
import { makeTagEntity, makeUpdateTagDTO } from './test-helpers';

describe('UpdateTagUseCase', () => {
  const organizationId = 'organization-id';
  let tagRepository: jest.Mocked<TagRepository>;
  let findTagByIdUseCase: { execute: jest.Mock };
  let useCase: UpdateTagUseCase;

  beforeEach(() => {
    tagRepository = {
      findByName: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<TagRepository>;

    findTagByIdUseCase = { execute: jest.fn() };

    useCase = new UpdateTagUseCase(
      tagRepository,
      findTagByIdUseCase as unknown as FindTagByIdUseCase,
    );
  });

  it('deve atualizar quando houver novo nome disponível', async () => {
    const tag = makeTagEntity();
    const dto = makeUpdateTagDTO({ name: 'Institucional' });
    const updated = makeTagEntity({ name: 'Institucional' });

    findTagByIdUseCase.execute.mockResolvedValue(tag);
    tagRepository.findByName.mockResolvedValue(null);
    tagRepository.update.mockResolvedValue(updated);

    await expect(useCase.execute(tag.id, organizationId, dto)).resolves.toEqual(
      updated,
    );
    expect(tagRepository.findByName).toHaveBeenCalledWith(
      'Institucional',
      organizationId,
    );
    expect(tagRepository.update).toHaveBeenCalledWith(
      tag.id,
      organizationId,
      dto,
    );
  });

  it('deve impedir nome duplicado em outra tag', async () => {
    const tag = makeTagEntity();
    const dto = makeUpdateTagDTO({ name: 'Institucional' });

    findTagByIdUseCase.execute.mockResolvedValue(tag);
    tagRepository.findByName.mockResolvedValue({
      id: 'other-tag',
      name: 'Institucional',
    });

    await expect(useCase.execute(tag.id, organizationId, dto)).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute(tag.id, organizationId, dto)).rejects.toThrow(
      'Já existe uma tag com este nome',
    );
  });

  it('deve retornar a tag atual quando o nome não mudar de fato', async () => {
    const tag = makeTagEntity({ name: 'Campanha' });
    const dto = makeUpdateTagDTO({ name: 'campanha' });

    findTagByIdUseCase.execute.mockResolvedValue(tag);
    tagRepository.findByName.mockResolvedValue({
      id: tag.id,
      name: tag.name,
    });

    await expect(useCase.execute(tag.id, organizationId, dto)).resolves.toEqual(
      tag,
    );
    expect(tagRepository.update).not.toHaveBeenCalled();
  });
});
