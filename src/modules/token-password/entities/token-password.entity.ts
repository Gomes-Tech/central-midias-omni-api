export class TokenPassword {
  constructor(
    public readonly id: string,
    public token: string,
    public email: string,
    public expiresAt: Date,
    public used?: boolean,
  ) {}
}
