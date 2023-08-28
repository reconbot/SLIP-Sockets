import { describe, it } from 'node:test'
import assert from 'node:assert'
import { JWT } from './JWT'

describe('JWT', () => {
  it('generates and verifies', () => {
    const jwt = new JWT({ jwtSecret: 'SecretKey' })
    const audience = 'ControlEvent'
    const token = jwt.generateToken({ audience, expiresIn: '1m' })
    const { aud } = jwt.verifyToken(token, audience)
    assert.equal(aud, audience)
    assert.throws(() => jwt.verifyToken(token, 'WebSocketEvent'))
    const expiredToken = jwt.generateToken({ audience, expiresIn: '0m' })
    assert.throws(() => jwt.verifyToken(expiredToken, audience))
  })
})
