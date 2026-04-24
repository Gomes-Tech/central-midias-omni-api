import { ModuleEntity } from '../entities';
import { CreateModuleDTO, UpdateModuleDTO } from '../dto';

export function makeModule(
  overrides: Partial<ModuleEntity> = {},
): ModuleEntity {
  return {
    id: 'module-id',
    name: 'roles',
    label: 'Perfis',
    ...overrides,
  };
}

export function makeCreateModuleDTO(
  overrides: Partial<CreateModuleDTO> = {},
): CreateModuleDTO {
  return {
    name: 'members',
    label: 'Membros',
    ...overrides,
  };
}

export function makeUpdateModuleDTO(
  overrides: Partial<UpdateModuleDTO> = {},
): UpdateModuleDTO {
  return {
    label: 'Módulo atualizado',
    ...overrides,
  };
}
