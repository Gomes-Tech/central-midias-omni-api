import { Inject, Injectable } from '@nestjs/common';
import { FindReportFiltersDTO } from '../dto';
import { ReportRepository } from '../repository';

@Injectable()
export class FindTopSearchesUseCase {
  constructor(
    @Inject('ReportRepository')
    private readonly reportRepository: ReportRepository,
  ) {}

  execute(organizationId: string, filters: FindReportFiltersDTO = {}) {
    return this.reportRepository.findTopSearches(organizationId, filters);
  }
}
