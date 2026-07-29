import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';
import {
  MaterialTemplateAssetLayer,
  MaterialTemplateDocumentV1,
  MaterialTemplateLayer,
  MaterialTemplateProfileBinding,
} from '../entities';

const MAX_CANVAS_SIDE = 3840;
const MAX_CANVAS_PIXELS = 3840 * 2160;
const MAX_LAYERS = 200;
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

function validateTextLayer(layer: Record<string, unknown>): void {
  const editableProperties = layer.editableProperties as unknown[];
  if (typeof layer.value !== 'string' || layer.value.length > 2000) {
    throw new BadRequestException('Conteúdo do texto inválido');
  }
  if (
    !isFiniteNumber(layer.fontSize) ||
    layer.fontSize < 8 ||
    layer.fontSize > 500
  ) {
    throw new BadRequestException('Tamanho da fonte inválido');
  }
  readString(layer.fontFamily, 'Família da fonte', 100);
  if (typeof layer.fill !== 'string' || !/^#[0-9a-f]{6}$/i.test(layer.fill)) {
    throw new BadRequestException('Cor do texto inválida');
  }
  if (
    editableProperties.some((property) => property !== 'value') ||
    new Set(editableProperties).size !== editableProperties.length
  ) {
    throw new BadRequestException('Permissões do texto inválidas');
  }
  if (
    layer.profileBinding !== null &&
    !PROFILE_BINDINGS.has(
      layer.profileBinding as MaterialTemplateProfileBinding,
    )
  ) {
    throw new BadRequestException('Vínculo de perfil inválido');
  }
  if (layer.profileBinding !== null && !editableProperties.includes('value')) {
    throw new BadRequestException(
      'Textos vinculados ao perfil precisam ser editáveis',
    );
  }
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

@Injectable()
export class MaterialTemplateDocumentService {
  validate(value: unknown): MaterialTemplateDocumentV1 {
    if (!isRecord(value) || value.version !== 1) {
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
    for (const candidate of value.layers) {
      if (!isRecord(candidate)) {
        throw new BadRequestException('Camada do template inválida');
      }
      validateCommonLayer(candidate);
      if (ids.has(candidate.id as string)) {
        throw new BadRequestException('Identificador de camada duplicado');
      }
      ids.add(candidate.id as string);
      if (candidate.type === 'text') validateTextLayer(candidate);
      else if (candidate.type === 'asset') validateAssetLayer(candidate);
      else throw new BadRequestException('Tipo de camada inválido');
    }

    if (
      value.layerOrder.length !== ids.size ||
      new Set(value.layerOrder).size !== value.layerOrder.length ||
      value.layerOrder.some((id) => typeof id !== 'string' || !ids.has(id))
    ) {
      throw new BadRequestException('Ordem das camadas inválida');
    }

    return value as unknown as MaterialTemplateDocumentV1;
  }

  getAssetIds(document: MaterialTemplateDocumentV1): string[] {
    return [
      ...new Set(
        document.layers
          .filter(
            (layer): layer is MaterialTemplateAssetLayer =>
              layer.type === 'asset',
          )
          .map((layer) => layer.assetId),
      ),
    ];
  }

  hasEditableText(document: MaterialTemplateDocumentV1): boolean {
    return document.layers.some(
      (layer: MaterialTemplateLayer) =>
        layer.type === 'text' && layer.editableProperties.includes('value'),
    );
  }

  scaleForBaseReplacement(
    document: MaterialTemplateDocumentV1,
    width: number,
    height: number,
  ): MaterialTemplateDocumentV1 {
    const scaleX = width / document.canvas.width;
    const scaleY = height / document.canvas.height;
    const uniformScale = Math.min(scaleX, scaleY);

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
}
