import { CreateOrganizationDTO, UpdateOrganizationDTO } from '../dto';
import { Organization } from '@prisma/client';

export function makeOrganization(
  overrides: Partial<Organization> = {},
): Organization {
  return {
    id: 'organization-id',
    name: 'Organization',
    slug: 'organization',
    domain: 'organization.com',
    shouldAttachUsersByDomain: true,
    avatarUrl: null,
    isActive: true,
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

export function makeCreateOrganizationDTO(
  overrides: Partial<CreateOrganizationDTO> = {},
): CreateOrganizationDTO {
  return {
    name: 'Organization',
    slug: 'organization',
    isActive: true,
    domain: 'organization.com',
    shouldAttachUsersByDomain: true,
    ...overrides,
  };
}

export function makeUpdateOrganizationDTO(
  overrides: Partial<UpdateOrganizationDTO> = {},
): UpdateOrganizationDTO {
  return {
    name: 'Updated Organization',
    slug: 'updated-organization',
    isActive: false,
    ...overrides,
  };
}
