import { BadRequestException } from '@common/filters';
import { TagRepository } from '@modules/tag';
import { Inject, Injectable } from '@nestjs/common';
import type { ResolvedMaterialTags } from './resolve-material-tags.use-case';

@Injectable()
export class ResolveMaterialTagIdsUseCase {
  constructor(
    @Inject('TagRepository')
    private readonly tagRepository: TagRepository,
  ) {}

  async execute(
    organizationId: string,
    tagIds?: string[],
  ): Promise<ResolvedMaterialTags | undefined> {
    if (tagIds === undefined) {
      return undefined;
    }

    const normalizedTagIds = this.normalizeTagIds(tagIds);

    if (!normalizedTagIds.length) {
      return {
        existingTagIds: [],
        newTagNames: [],
      };
    }

    const existingTags = await this.tagRepository.findManyByIds(
      normalizedTagIds,
      organizationId,
    );

    if (existingTags.length !== normalizedTagIds.length) {
      throw new BadRequestException(
        'Uma ou mais tags informadas não existem nesta organização',
      );
    }

    return {
      existingTagIds: normalizedTagIds,
      newTagNames: [],
    };
  }

  private normalizeTagIds(tagIds: string[]): string[] {
    return tagIds.reduce<string[]>((result, tagId) => {
      const normalizedTagId = tagId.trim();

      if (!normalizedTagId) {
        return result;
      }

      if (result.includes(normalizedTagId)) {
        return result;
      }

      result.push(normalizedTagId);
      return result;
    }, []);
  }
}
