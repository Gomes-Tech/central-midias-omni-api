export function buildPortalMaterialLink(
  materialId: string,
): string | undefined {
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';

  return frontendUrl ? `${frontendUrl}/material/${materialId}` : undefined;
}
