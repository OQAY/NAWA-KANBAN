/**
 * Estratégia JWT do Passport para autenticação de rotas protegidas
 * Valida tokens Bearer e carrega dados do usuário automaticamente
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    const secret = configService.get('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  /**
   * Método chamado automaticamente após validação do token
   * Carrega dados completos do usuário para uso nos controllers
   */
  async validate(payload: { sub: string; email: string }) {
    try {
      const user = await this.authService.findUserById(payload.sub);
      return user; // Disponibilizado como req.user nos controllers
    } catch {
      throw new UnauthorizedException();
    }
  }
}