import { TagRepository } from '@modules/tag';
import { Inject, Injectable } from '@nestjs/common';

export interface ResolvedMaterialTags {
  existingTagIds: string[];
  newTagNames: string[];
}

@Injectable()
export class ResolveMaterialTagsUseCase {
  constructor(
    @Inject('TagRepository')
    private readonly tagRepository: TagRepository,
  ) {}

  async execute(
    organizationId: string,
    tags?: string[],
  ): Promise<ResolvedMaterialTags | undefined> {
    if (tags === undefined) {
      return undefined;
    }

    const normalizedTags = this.normalizeTags(tags);

    if (!normalizedTags.length) {
      return {
        existingTagIds: [],
        newTagNames: [],
      };
    }

    const existingTags = await this.tagRepository.findManyByNames(
      normalizedTags,
      organizationId,
    );

    const existingTagsByName = new Map(
      existingTags.map((tag) => [tag.name.trim().toLowerCase(), tag.id]),
    );

    return normalizedTags.reduce<ResolvedMaterialTags>(
      (result, tagName) => {
        const normalizedTagName = tagName.toLowerCase();
        const existingTagId = existingTagsByName.get(normalizedTagName);

        if (existingTagId) {
          result.existingTagIds.push(existingTagId);
          return result;
        }

        result.newTagNames.push(tagName);
        return result;
      },
      {
        existingTagIds: [],
        newTagNames: [],
      },
    );
  }

  private normalizeTags(tags: string[]): string[] {
    return tags.reduce<string[]>((result, tag) => {
      const normalizedTag = tag.trim();

      if (!normalizedTag) {
        return result;
      }

      const tagKey = normalizedTag.toLowerCase();

      if (result.some((existingTag) => existingTag.toLowerCase() === tagKey)) {
        return result;
      }

      result.push(normalizedTag);
      return result;
    }, []);
  }
}
