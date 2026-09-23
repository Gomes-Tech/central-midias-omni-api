import { BadRequestException } from '@common/filters';
import type {
  MaterialTemplateDocumentV2,
  MaterialTemplateDocumentV3,
  MaterialTemplateLink,
  MaterialTemplatePageV3,
} from '@modules/material-template/entities';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { createHash } from 'node:crypto';

export type PrintableDocument =
  | MaterialTemplateDocumentV2
  | MaterialTemplateDocumentV3;

export interface PrintDocumentHashImage {
  materialFileId?: string;
  layerId: string;
  checksum: string;
  fit?: 'cover' | 'contain';
  positionX?: number;
  positionY?: number;
  zoom?: number;
}

type PrintablePage =
  | MaterialTemplateDocumentV2
  | Omit<MaterialTemplatePageV3, 'materialFileId'>;

function compare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

@Injectable()
export class PrintDocumentService {
  constructor(
    @Inject(forwardRef(() => MaterialTemplateDocumentService))
    private readonly documents: MaterialTemplateDocumentService,
  ) {}

  validateCustomizedDocument(
    publishedValue: unknown,
    customizedValue: unknown,
  ): PrintableDocument {
    const published = this.documents.validate(publishedValue);
    const customized = this.documents.validate(customizedValue);
    if (published.version === 1) {
      throw new BadRequestException(
        'A exportação para impressão requer um template V2 ou V3',
      );
    }
    if (customized.version !== published.version) {
      throw new BadRequestException('A estrutura do template foi alterada');
    }

    let expected: PrintableDocument;
    if (published.version === 2) {
      expected = this.expectedPage(
        published,
        customized as MaterialTemplateDocumentV2,
      );
    } else {
      const customizedPages = (customized as MaterialTemplateDocumentV3).pages;
      if (published.pages.length !== customizedPages.length) {
        throw new BadRequestException('A estrutura do template foi alterada');
      }
      const customizedByFile = new Map(
        customizedPages.map((page) => [page.materialFileId, page]),
      );
      expected = {
        ...published,
        pages: published.pages.map((page) => {
          const candidate = customizedByFile.get(page.materialFileId);
          if (!candidate) {
            throw new BadRequestException(
              'A estrutura do template foi alterada',
            );
          }
          return this.expectedPage(page, candidate);
        }),
      };
    }

    if (this.stableStringify(expected) !== this.stableStringify(customized)) {
      throw new BadRequestException(
        'A personalização contém alterações não permitidas',
      );
    }
    return this.withoutLinks(customized as PrintableDocument);
  }

  hash(document: PrintableDocument, images: PrintDocumentHashImage[] = []) {
    const value = images.length
      ? {
          document,
          images: images
            .map(
              ({
                materialFileId,
                layerId,
                checksum,
                fit = 'cover',
                positionX = 0.5,
                positionY = 0.5,
                zoom = 1,
              }) => ({
                // Omitted for V2 so hashes of existing exports stay stable.
                ...(materialFileId === undefined ? {} : { materialFileId }),
                layerId,
                checksum,
                fit,
                positionX,
                positionY,
                zoom,
              }),
            )
            .sort(
              (a, b) =>
                compare(a.materialFileId ?? '', b.materialFileId ?? '') ||
                compare(a.layerId, b.layerId),
            ),
        }
      : document;
    return createHash('sha256')
      .update(this.stableStringify(value))
      .digest('hex');
  }

  private expectedPage<T extends PrintablePage>(
    published: T,
    customized: PrintablePage,
  ): T {
    if (published.layers.length !== customized.layers.length) {
      throw new BadRequestException('A estrutura do template foi alterada');
    }
    const customizedById = new Map(
      customized.layers.map((layer) => [layer.id, layer]),
    );
    return {
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
      ...('links' in published && published.links
        ? {
            links: this.expectedLinks(
              published.links,
              'links' in customized ? customized.links : undefined,
            ),
          }
        : {}),
    };
  }

  private expectedLinks(
    published: MaterialTemplateLink[],
    customized: MaterialTemplateLink[] | undefined,
  ): MaterialTemplateLink[] {
    if (!customized || published.length !== customized.length) {
      throw new BadRequestException('A estrutura do template foi alterada');
    }
    const customizedById = new Map(customized.map((link) => [link.id, link]));
    return published.map((link) => {
      const candidate = customizedById.get(link.id);
      if (!candidate) {
        throw new BadRequestException('A estrutura do template foi alterada');
      }
      return link.editableProperties.length > 0
        ? { ...link, href: candidate.href }
        : link;
    });
  }

  private withoutLinks(document: PrintableDocument): PrintableDocument {
    if (document.version === 2) return document;
    return {
      ...document,
      pages: document.pages.map((page) => ({
        materialFileId: page.materialFileId,
        canvas: page.canvas,
        layerOrder: page.layerOrder,
        layers: page.layers,
      })),
    };
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
