import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import {
  IMPORTANT_DATE_TYPE,
  ImportantDateItem,
} from '../entities';
import { MemberRepository } from '../repository';

@Injectable()
export class ListImportantDatesUseCase {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(organizationId: string): Promise<ImportantDateItem[]> {
    const members =
      await this.memberRepository.findPlatformMembersWithDates(organizationId);

    const currentMonth = new Date().getUTCMonth() + 1;
    const currentYear = new Date().getUTCFullYear();

    const items: ImportantDateItem[] = [];

    for (const member of members) {
      const { birthDate, admissionDate, name, avatarKey } = member.user;

      let avatarUrl: string | null = null;
      if (avatarKey) {
        avatarUrl = await this.storageService
          .getPublicUrl(avatarKey)
          .catch(() => null);
      }

      if (birthDate && birthDate.getUTCMonth() + 1 === currentMonth) {
        items.push({
          avatarUrl,
          name,
          day: birthDate.getUTCDate(),
          month: currentMonth,
          years: currentYear - birthDate.getUTCFullYear(),
          type: IMPORTANT_DATE_TYPE.BIRTHDAY,
        });
      }

      if (admissionDate && admissionDate.getUTCMonth() + 1 === currentMonth) {
        items.push({
          avatarUrl,
          name,
          day: admissionDate.getUTCDate(),
          month: currentMonth,
          years: currentYear - admissionDate.getUTCFullYear(),
          type: IMPORTANT_DATE_TYPE.COMPANY_ANNIVERSARY,
        });
      }
    }

    return items.sort((a, b) => {
      if (a.day !== b.day) {
        return a.day - b.day;
      }

      return a.name.localeCompare(b.name);
    });
  }
}
