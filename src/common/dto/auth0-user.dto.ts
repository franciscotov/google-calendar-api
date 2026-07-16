export class Auth0UserDto {
  sub!: string;
  iss!: string;
  iat!: number;
  exp!: number;
  scope!: string;
  azp!: string;
  aud!: string[];
}
