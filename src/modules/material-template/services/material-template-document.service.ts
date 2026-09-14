import { BadRequestException } from '@common/filters';
import { MAX_IMAGE_PLACEHOLDERS } from '@common/constants/print-image-limits';
import { Injectable } from '@nestjs/common';
import {
  MaterialTemplateDocument,
  MaterialTemplateDocumentV1,
  MaterialTemplateDocumentV2,
  MaterialTemplateProfileBinding,
} from '../entities';

// Limites alinhados a formatos de impressão comuns (ex.: A4/A3 @ 300 DPI).
// O teto antigo (3840×2160) era voltado a arte digital 16:9 e rejeitava A4@300.
const MAX_CANVAS_SIDE = 6000;
const MAX_CANVAS_PIXELS = 30_000_000;
const MAX_LAYERS = 200;
const MAX_TEXT_LENGTH = 2000;
const MAX_TEXT_RUNS = 500;
// O editor aplica o limite proporcional; este teto protege o contrato persistido.
const MAX_TEXT_FONT_SIZE = 1800;
const PROFILE_BINDINGS = new Set<MaterialTemplateProfileBinding>([
  'NAME',
  'PHONE',
  'CITY',
  'UF',
  'CITY_UF',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new BadRequestException(`${label} inválido`);
  }
  return value;
}

function validateCommonLayer(layer: Record<string, unknown>) {
  readString(layer.id, 'Identificador da camada', 100);
  readString(layer.name, 'Nome da camada', 150);
  for (const property of ['x', 'y', 'rotation']) {
    if (!isFiniteNumber(layer[property])) {
      throw new BadRequestException(`Propriedade ${property} inválida`);
    }
  }
  if (typeof layer.isVisible !== 'boolean') {
    throw new BadRequestException('Visibilidade da camada inválida');
  }
  if (!Array.isArray(layer.editableProperties)) {
    throw new BadRequestException('Permissões da camada inválidas');
  }
}

function validateProfileBinding(
  layer: Record<string, unknown>,
  editableProperty: 'value' | 'content',
) {
  const editableProperties = layer.editableProperties as unknown[];
  if (
    layer.profileBinding !== null &&
    !PROFILE_BINDINGS.has(
      layer.profileBinding as MaterialTemplateProfileBinding,
    )
  ) {
    throw new BadRequestException('Vínculo de perfil inválido');
  }
  if (
    layer.profileBinding !== null &&
    !editableProperties.includes(editableProperty)
  ) {
    throw new BadRequestException(
      'Textos vinculados ao perfil precisam ser editáveis',
    );
  }
}

function validateTextStyle(style: Record<string, unknown>) {
  if (
    !isFiniteNumber(style.fontSize) ||
    style.fontSize < 8 ||
    style.fontSize > MAX_TEXT_FONT_SIZE
  ) {
    throw new BadRequestException('Tamanho da fonte inválido');
  }
  readString(style.fontFamily, 'Família da fonte', 100);
  if (typeof style.fill !== 'string' || !/^#[0-9a-f]{6}$/i.test(style.fill)) {
    throw new BadRequestException('Cor do texto inválida');
  }
  for (const property of ['bold', 'italic', 'underline']) {
    if (typeof style[property] !== 'boolean') {
      throw new BadRequestException('Estilo do texto inválido');
    }
  }
}

function validateTextLayerV1(layer: Record<string, unknown>): void {
  const editableProperties = layer.editableProperties as unknown[];
  if (typeof layer.value !== 'string' || layer.value.length > MAX_TEXT_LENGTH) {
    throw new BadRequestException('Conteúdo do texto inválido');
  }
  validateTextStyle({
    fontSize: layer.fontSize,
    fontFamily: layer.fontFamily,
    fill: layer.fill,
    bold: false,
    italic: false,
    underline: false,
  });
  if (
    editableProperties.some((property) => property !== 'value') ||
    new Set(editableProperties).size !== editableProperties.length
  ) {
    throw new BadRequestException('Permissões do texto inválidas');
  }
  validateProfileBinding(layer, 'value');
}

function validateTextLayerV2(layer: Record<string, unknown>): void {
  const editableProperties = layer.editableProperties as unknown[];
  if (
    !Array.isArray(layer.runs) ||
    layer.runs.length === 0 ||
    layer.runs.length > MAX_TEXT_RUNS
  ) {
    throw new BadRequestException('Trechos do texto inválidos');
  }
  let totalLength = 0;
  for (const run of layer.runs) {
    if (!isRecord(run) || typeof run.text !== 'string') {
      throw new BadRequestException('Trecho do texto inválido');
    }
    totalLength += run.text.length;
    validateTextStyle(run);
  }
  if (totalLength > MAX_TEXT_LENGTH) {
    throw new BadRequestException('Conteúdo do texto inválido');
  }
  if (
    editableProperties.some((property) => property !== 'content') ||
    new Set(editableProperties).size !== editableProperties.length
  ) {
    throw new BadRequestException('Permissões do texto inválidas');
  }
  validateProfileBinding(layer, 'content');
}

function validateAssetLayer(layer: Record<string, unknown>): void {
  const editableProperties = layer.editableProperties as unknown[];
  readString(layer.assetId, 'Asset da camada', 100);
  for (const property of ['width', 'height']) {
    if (!isFiniteNumber(layer[property]) || layer[property] <= 0) {
      throw new BadRequestException(`Propriedade ${property} inválida`);
    }
  }
  if (editableProperties.length !== 0) {
    throw new BadRequestException(
      'Imagens não podem ser editáveis nesta versão',
    );
  }
}

function validateImagePlaceholder(layer: Record<string, unknown>): void {
  const allowed = new Set([
    'id',
    'type',
    'name',
    'x',
    'y',
    'width',
    'height',
    'rotation',
    'isVisible',
    'editableProperties',
  ]);
  if (Object.keys(layer).some((key) => !allowed.has(key))) {
    throw new BadRequestException(`Marcador ${layer.id}: campo não permitido`);
  }
  for (const property of ['width', 'height']) {
    if (!isFiniteNumber(layer[property]) || layer[property] <= 0) {
      throw new BadRequestException(
        `Marcador ${layer.id}: ${property} inválido`,
      );
    }
  }
  const editable = layer.editableProperties as unknown[];
  if (editable.length !== 1 || editable[0] !== 'image') {
    throw new BadRequestException(`Marcador ${layer.id}: permissões inválidas`);
  }
}

@Injectable()
export class MaterialTemplateDocumentService {
  validate(value: unknown): MaterialTemplateDocument {
    if (!isRecord(value) || (value.version !== 1 && value.version !== 2)) {
      throw new BadRequestException('Versão do template inválida');
    }
    if (!isRecord(value.canvas)) {
      throw new BadRequestException('Canvas do template inválido');
    }
    const { width, height } = value.canvas;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      (width as number) <= 0 ||
      (height as number) <= 0 ||
      Math.max(width as number, height as number) > MAX_CANVAS_SIDE ||
      (width as number) * (height as number) > MAX_CANVAS_PIXELS
    ) {
      throw new BadRequestException('Dimensões do canvas inválidas');
    }
    if (
      !Array.isArray(value.layers) ||
      value.layers.length > MAX_LAYERS ||
      !Array.isArray(value.layerOrder)
    ) {
      throw new BadRequestException('Camadas do template inválidas');
    }

    const ids = new Set<string>();
    let placeholders = 0;
    for (const candidate of value.layers) {
      if (!isRecord(candidate)) {
        throw new BadRequestException('Camada do template inválida');
      }
      validateCommonLayer(candidate);
      if (ids.has(candidate.id as string)) {
        throw new BadRequestException('Identificador de camada duplicado');
      }
      ids.add(candidate.id as string);
      if (candidate.type === 'text') {
        if (value.version === 1) validateTextLayerV1(candidate);
        else validateTextLayerV2(candidate);
      } else if (candidate.type === 'asset') validateAssetLayer(candidate);
      else if (candidate.type === 'image-placeholder' && value.version === 2) {
        validateImagePlaceholder(candidate);
        if (++placeholders > MAX_IMAGE_PLACEHOLDERS) {
          throw new BadRequestException(
            'O template permite até 20 marcadores de imagem',
          );
        }
      } else throw new BadRequestException('Tipo de camada inválido');
    }

    if (
      value.layerOrder.length !== ids.size ||
      new Set(value.layerOrder).size !== value.layerOrder.length ||
      value.layerOrder.some((id) => typeof id !== 'string' || !ids.has(id))
    ) {
      throw new BadRequestException('Ordem das camadas inválida');
    }

    return value as unknown as MaterialTemplateDocument;
  }

  getAssetIds(document: MaterialTemplateDocument): string[] {
    const assetIds = new Set<string>();
    for (const layer of document.layers) {
      if (layer.type === 'asset') assetIds.add(layer.assetId);
    }
    return [...assetIds];
  }

  hasEditableText(document: MaterialTemplateDocument): boolean {
    if (document.version === 1) {
      return document.layers.some(
        (layer) =>
          layer.type === 'text' && layer.editableProperties.includes('value'),
      );
    }
    return document.layers.some(
      (layer) =>
        layer.type === 'text' && layer.editableProperties.includes('content'),
    );
  }

  hasEditableContent(document: MaterialTemplateDocument): boolean {
    return (
      this.hasEditableText(document) ||
      document.layers.some(
        (layer) => layer.type === 'image-placeholder' && layer.isVisible,
      )
    );
  }

  scaleForBaseReplacement(
    document: MaterialTemplateDocument,
    width: number,
    height: number,
  ): MaterialTemplateDocument {
    const scaleX = width / document.canvas.width;
    const scaleY = height / document.canvas.height;
    const uniformScale = Math.min(scaleX, scaleY);

    if (document.version === 1) {
      return this.scaleV1(
        document,
        width,
        height,
        scaleX,
        scaleY,
        uniformScale,
      );
    }
    return this.scaleV2(document, width, height, scaleX, scaleY, uniformScale);
  }

  private scaleV1(
    document: MaterialTemplateDocumentV1,
    width: number,
    height: number,
    scaleX: number,
    scaleY: number,
    uniformScale: number,
  ): MaterialTemplateDocumentV1 {
    return {
      ...document,
      canvas: { width, height },
      layers: document.layers.map((layer) =>
        layer.type === 'text'
          ? {
              ...layer,
              x: layer.x * scaleX,
              y: layer.y * scaleY,
              fontSize: layer.fontSize * uniformScale,
            }
          : {
              ...layer,
              x: layer.x * scaleX,
              y: layer.y * scaleY,
              width: layer.width * uniformScale,
              height: layer.height * uniformScale,
            },
      ),
    };
  }

  private scaleV2(
    document: MaterialTemplateDocumentV2,
    width: number,
    height: number,
    scaleX: number,
    scaleY: number,
    uniformScale: number,
  ): MaterialTemplateDocumentV2 {
    return {
      ...document,
      canvas: { width, height },
      layers: document.layers.map((layer) =>
        layer.type === 'text'
          ? {
              ...layer,
              x: layer.x * scaleX,
              y: layer.y * scaleY,
              runs: layer.runs.map((run) => ({
                ...run,
                fontSize: run.fontSize * uniformScale,
              })),
            }
          : {
              ...layer,
              x: layer.x * scaleX,
              y: layer.y * scaleY,
              width: layer.width * uniformScale,
              height: layer.height * uniformScale,
            },
      ),
    };
  }
}
