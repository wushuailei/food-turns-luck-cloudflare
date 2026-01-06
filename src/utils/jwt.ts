import { env } from 'cloudflare:workers';
import { SignJWT, jwtVerify } from 'jose';

// 环境变量中的密钥（字符串）
const secret = new TextEncoder().encode(env.JWT_SECRET);

// 🔑 签发 Token
async function signToken(openid: string, expiresIn = '7d') {
    return await new SignJWT({ openid })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn) // 如 '1h', '7d'
        .sign(secret);
}

// 🔍 验证 Token
async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as { openid: string; exp: number };
    } catch (e) {
        return null; // 无效或过期
    }
}
export { signToken, verifyToken };