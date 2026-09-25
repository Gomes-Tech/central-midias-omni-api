import type { PrintPresetSnapshot } from '../entities';

export function toPrintPresetSnapshot(preset: any): PrintPresetSnapshot {
  return {
    id: preset.id,
    name: preset.name,
    trimWidthMm: Number(preset.trimWidthMm),
    trimHeightMm: Number(preset.trimHeightMm),
    bleedTopMm: Number(preset.bleedTopMm),
    bleedRightMm: Number(preset.bleedRightMm),
    bleedBottomMm: Number(preset.bleedBottomMm),
    bleedLeftMm: Number(preset.bleedLeftMm),
    safeMarginTopMm: Number(preset.safeMarginTopMm),
    safeMarginRightMm: Number(preset.safeMarginRightMm),
    safeMarginBottomMm: Number(preset.safeMarginBottomMm),
    safeMarginLeftMm: Number(preset.safeMarginLeftMm),
    minimumDpi: preset.minimumDpi,
    includeCropMarks: preset.includeCropMarks,
    cropMarkOffsetMm: Number(preset.cropMarkOffsetMm),
    renderingIntent: preset.renderingIntent,
    updatedAt: preset.updatedAt.toISOString(),
    colorProfile: {
      id: preset.colorProfile.id,
      name: preset.colorProfile.name,
      storageKey: preset.colorProfile.storageKey,
      checksum: preset.colorProfile.checksum,
      outputConditionIdentifier: preset.colorProfile.outputConditionIdentifier,
    },
  };
}
