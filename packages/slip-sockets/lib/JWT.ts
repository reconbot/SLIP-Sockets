import jwt from 'jsonwebtoken'

const algorithm = 'HS256' // for HMAC (shared secret) operations
const issuer = 'slip-sockets'

interface JWTToken {
  aud: string
  iat: number
  exp: number
  iss: typeof issuer
}

export interface WebSocketEventJWT extends JWTToken {
  aud: 'WebSocketEvent'
}

export interface ControlEventJWT extends JWTToken {
  aud: 'ControlEvent'
}

export class JWT {
  jwtSecret: string
  constructor({ jwtSecret }: { jwtSecret: string }) {
    if (!jwtSecret) {
      throw new Error('"jwtSecret" is required to verify JWT tokens')
    }
    this.jwtSecret = jwtSecret
  }

  generateToken<R extends WebSocketEventJWT | ControlEventJWT>({
    audience,
    data,
    expiresIn,
  }: {
    audience: R['aud']
    data?: Omit<R, 'aud' | 'iat' | 'exp' | 'iss'>
    expiresIn?: string
  }) {
    if (!audience) {
      throw new Error('"audience" is required')
    }
    if (typeof expiresIn !== 'string' && expiresIn !== undefined) {
      throw new Error('"expiresIn" must be a string')
    }

    return jwt.sign(data ?? {}, this.jwtSecret, {
      algorithm,
      issuer,
      audience,
      // for expiresIn undefined is invalid but a missing key is not
      ...expiresIn && { expiresIn },
    })
  }

  verifyToken<R extends WebSocketEventJWT | ControlEventJWT>(token: string, audience: R['aud']) {
    if (!token) {
      throw new Error('"token" is required')
    }
    if (!audience) {
      throw new Error('"audience" is required')
    }

    return jwt.verify(token, this.jwtSecret, {
      algorithms: [algorithm],
      issuer,
      audience,
    }) as R
  }

  verifyAuthTokenFromHeader<R extends WebSocketEventJWT | ControlEventJWT>(auth: string | undefined | null, audience: R['aud']) {
    if (!auth) {
      return false
    }
    const bearer = auth.match(/^Bearer (.+)/)
    const token = bearer && bearer[1]
    if (!token) {
      return false
    }
    try {
      this.verifyToken(token, audience)
      return true
    } catch (error) {
      console.error('Error validating token')
      return false
    }
  }
}
