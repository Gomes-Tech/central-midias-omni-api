import { BadRequestException } from '@common/filters';
import {
  MaterialTemplateDocumentService,
  MaterialTemplateDocumentV2,
} from '@modules/material-template';
import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class PrintDocumentService {
  constructor(private readonly documents: MaterialTemplateDocumentService) {}

  validateCustomizedDocument(
    publishedValue: unknown,
    customizedValue: unknown,
  ): MaterialTemplateDocumentV2 {
    const published = this.documents.validate(publishedValue);
    const customized = this.documents.validate(customizedValue);
    if (published.version !== 2 || customized.version !== 2) {
      throw new BadRequestException(
        'A exportação para impressão requer um template V2',
      );
    }
    if (published.layers.length !== customized.layers.length) {
      throw new BadRequestException('A estrutura do template foi alterada');
    }

    const customizedById = new Map(
      customized.layers.map((layer) => [layer.id, layer]),
    );
    const expected = {
      ...published,
      layers: published.layers.map((layer) => {
        const candidate = customizedById.get(layer.id);
        if (!candidate || candidate.type !== layer.type) {
          throw new BadRequestException('A estrutura do template foi alterada');
        }
        if (
          layer.type === 'text' &&
          candidate.type === 'text' &&
          layer.editableProperties.includes('content')
        ) {
          return { ...layer, runs: candidate.runs };
        }
        return layer;
      }),
    };

    if (this.stableStringify(expected) !== this.stableStringify(customized)) {
      throw new BadRequestException(
        'A personalização contém alterações não permitidas',
      );
    }
    return customized;
  }

  hash(document: MaterialTemplateDocumentV2) {
    return createHash('sha256')
      .update(this.stableStringify(document))
      .digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(
          ([key, item]) =>
            `${JSON.stringify(key)}:${this.stableStringify(item)}`,
        )
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }
}
