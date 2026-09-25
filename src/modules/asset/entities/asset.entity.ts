export interface AssetEntity {
  id: string;
  organizationId: string;
  name: string;
  fileKey: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetResponse {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toAssetResponse(
  asset: AssetEntity,
  url: string,
): AssetResponse {
  return {
    id: asset.id,
    name: asset.name,
    url,
    mimeType: asset.mimeType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}
