import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import {
  IMPORTANT_DATE_TYPE,
  ImportantDateItem,
} from '../entities';
import { MemberRepository } from '../repository';

function getCompletedYears(date: Date, now: Date): number {
  return now.getUTCFullYear() - date.getUTCFullYear();
}

@Injectable()
export class ListImportantDatesUseCase {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(organizationId: string): Promise<ImportantDateItem[]> {
    const members =
      await this.memberRepository.findPlatformMembersWithDates(organizationId);

    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;

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
        const years = getCompletedYears(birthDate, now);
        if (years >= 1) {
          items.push({
            avatarUrl,
            name,
            day: birthDate.getUTCDate(),
            month: currentMonth,
            years,
            type: IMPORTANT_DATE_TYPE.BIRTHDAY,
          });
        }
      }

      if (admissionDate && admissionDate.getUTCMonth() + 1 === currentMonth) {
        const years = getCompletedYears(admissionDate, now);
        if (years >= 1) {
          items.push({
            avatarUrl,
            name,
            day: admissionDate.getUTCDate(),
            month: currentMonth,
            years,
            type: IMPORTANT_DATE_TYPE.COMPANY_ANNIVERSARY,
          });
        }
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
