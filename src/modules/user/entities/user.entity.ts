import { UserRole } from 'types/role';

export class User {
  constructor(
    public readonly id: string,
    public name: string,
    public socialReason: string,
    public taxIdentifier: string,
    public phone: string,
    public birthDate: Date,
    public email: string,
    public password: string,
    public role: UserRole,
    public isActive: boolean,
    public isFirstAccess: boolean,
    public subordinates?: User[],
    public boss?: {
      id: string;
      name: string;
      socialReason: string;
      taxIdentifier: string;
    },
  ) {}
}
