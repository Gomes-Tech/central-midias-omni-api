import { BadRequestException } from '@common/filters';
import { TagRepository } from '../repository';
import { CreateTagUseCase } from './create-tag.use-case';
import { makeCreateTagDTO, makeTagEntity } from './test-helpers';

describe('CreateTagUseCase', () => {
  let tagRepository: jest.Mocked<TagRepository>;
  let useCase: CreateTagUseCase;

  beforeEach(() => {
    tagRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<TagRepository>;

    useCase = new CreateTagUseCase(tagRepository);
  });

  it('deve criar uma tag quando o nome estiver livre', async () => {
    const dto = makeCreateTagDTO();
    const created = makeTagEntity({ name: dto.name });

    tagRepository.findByName.mockResolvedValue(null);
    tagRepository.create.mockResolvedValue(created);

    await expect(useCase.execute(dto)).resolves.toEqual(created);
    expect(tagRepository.findByName).toHaveBeenCalledWith(dto.name);
    expect(tagRepository.create).toHaveBeenCalledWith(dto);
  });

  it('deve impedir duplicidade de nome', async () => {
    const dto = makeCreateTagDTO();
    tagRepository.findByName.mockResolvedValue({
      id: 'existing-tag',
      name: dto.name,
    });

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute(dto)).rejects.toThrow(
      'Já existe uma tag com este nome',
    );
  });
});
