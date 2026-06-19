import { StorageService } from '@infrastructure/providers';
import { IMPORTANT_DATE_TYPE } from '../entities';
import { MemberRepository } from '../repository';
import { ListImportantDatesUseCase } from './list-important-dates.use-case';

describe('ListImportantDatesUseCase', () => {
  let useCase: ListImportantDatesUseCase;
  let memberRepository: jest.Mocked<
    Pick<MemberRepository, 'findPlatformMembersWithDates'>
  >;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;

  const organizationId = 'org-1';

  beforeEach(() => {
    memberRepository = { findPlatformMembersWithDates: jest.fn() };
    storageService = { getPublicUrl: jest.fn() };

    useCase = new ListImportantDatesUseCase(
      memberRepository as unknown as MemberRepository,
      storageService as unknown as StorageService,
    );

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-19T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deve retornar aniversário com type birthday no mês atual', async () => {
    memberRepository.findPlatformMembersWithDates.mockResolvedValue([
      {
        user: {
          name: 'Marlon',
          avatarKey: 'avatars/marlon.png',
          birthDate: new Date('1990-06-15T00:00:00.000Z'),
          admissionDate: null,
        },
      },
    ]);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/avatar.png');

    const result = await useCase.execute(organizationId);

    expect(result).toEqual([
      {
        avatarUrl: 'https://cdn.test/avatar.png',
        name: 'Marlon',
        day: 15,
        month: 6,
        years: 36,
        type: IMPORTANT_DATE_TYPE.BIRTHDAY,
      },
    ]);
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'avatars/marlon.png',
    );
  });

  it('deve retornar tempo de casa com type company_anniversary no mês atual', async () => {
    memberRepository.findPlatformMembersWithDates.mockResolvedValue([
      {
        user: {
          name: 'Ana',
          avatarKey: null,
          birthDate: null,
          admissionDate: new Date('2024-06-20T00:00:00.000Z'),
        },
      },
    ]);

    const result = await useCase.execute(organizationId);

    expect(result).toEqual([
      {
        avatarUrl: null,
        name: 'Ana',
        day: 20,
        month: 6,
        years: 2,
        type: IMPORTANT_DATE_TYPE.COMPANY_ANNIVERSARY,
      },
    ]);
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve retornar duas entradas quando birthDate e admissionDate caem no mês atual', async () => {
    memberRepository.findPlatformMembersWithDates.mockResolvedValue([
      {
        user: {
          name: 'Marlon',
          avatarKey: 'avatars/marlon.png',
          birthDate: new Date('1990-06-15T00:00:00.000Z'),
          admissionDate: new Date('2024-06-20T00:00:00.000Z'),
        },
      },
    ]);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/avatar.png');

    const result = await useCase.execute(organizationId);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      name: 'Marlon',
      day: 15,
      type: IMPORTANT_DATE_TYPE.BIRTHDAY,
      years: 36,
    });
    expect(result[1]).toMatchObject({
      name: 'Marlon',
      day: 20,
      type: IMPORTANT_DATE_TYPE.COMPANY_ANNIVERSARY,
      years: 2,
    });
  });

  it('deve ignorar datas fora do mês atual', async () => {
    memberRepository.findPlatformMembersWithDates.mockResolvedValue([
      {
        user: {
          name: 'Carlos',
          avatarKey: null,
          birthDate: new Date('1990-01-15T00:00:00.000Z'),
          admissionDate: new Date('2024-03-20T00:00:00.000Z'),
        },
      },
    ]);

    await expect(useCase.execute(organizationId)).resolves.toEqual([]);
  });

  it('deve retornar avatarUrl null quando getPublicUrl falhar', async () => {
    memberRepository.findPlatformMembersWithDates.mockResolvedValue([
      {
        user: {
          name: 'Marlon',
          avatarKey: 'avatars/marlon.png',
          birthDate: new Date('1990-06-15T00:00:00.000Z'),
          admissionDate: null,
        },
      },
    ]);
    storageService.getPublicUrl.mockRejectedValue(new Error('S3 error'));

    const result = await useCase.execute(organizationId);

    expect(result[0].avatarUrl).toBeNull();
  });

  it('deve ordenar por day e depois por name', async () => {
    memberRepository.findPlatformMembersWithDates.mockResolvedValue([
      {
        user: {
          name: 'Zeca',
          avatarKey: null,
          birthDate: new Date('1990-06-20T00:00:00.000Z'),
          admissionDate: null,
        },
      },
      {
        user: {
          name: 'Ana',
          avatarKey: null,
          birthDate: new Date('1985-06-10T00:00:00.000Z'),
          admissionDate: null,
        },
      },
      {
        user: {
          name: 'Bruno',
          avatarKey: null,
          birthDate: new Date('1992-06-10T00:00:00.000Z'),
          admissionDate: null,
        },
      },
    ]);

    const result = await useCase.execute(organizationId);

    expect(result.map((item) => `${item.day}-${item.name}`)).toEqual([
      '10-Ana',
      '10-Bruno',
      '20-Zeca',
    ]);
  });
});
