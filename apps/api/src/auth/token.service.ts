import { ACCESS_TOKEN_TTL_SECONDS } from '@forestwatch/config';
import type { AccessTokenClaims } from '@forestwatch/types';
import { accessTokenClaimsSchema } from '@forestwatch/validation';
import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { ApiException } from '../common/http/api-exception';
import { getEnv } from '../env';

@Injectable()
export class TokenService {
  signAccessToken(claims: AccessTokenClaims): string {
    return jwt.sign(claims, getEnv().JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    try {
      const payload = jwt.verify(token, getEnv().JWT_SECRET, { algorithms: ['HS256'] });
      return accessTokenClaimsSchema.parse(payload);
    } catch {
      throw new ApiException(401, 'UNAUTHORIZED', 'Invalid or expired access token');
    }
  }
}
