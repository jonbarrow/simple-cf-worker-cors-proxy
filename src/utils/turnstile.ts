import { H3Event, EventHandlerRequest } from 'h3';
import { SignJWT, jwtVerify } from 'jose';
import { getIp } from '@/utils/ip';

const turnstileSecret = process.env.TURNSTILE_SECRET ?? null;
const jwtSecret = process.env.JWT_SECRET ?? null;

const tokenHeader = 'X-Token';
const jwtPrefix = 'jwt|';
const turnstilePrefix = 'turnstile|';

export function isTurnstileEnabled() {
  return !!turnstileSecret && !!jwtSecret;
}

export async function makeToken(ip: string) {
  if (!jwtSecret) throw new Error('Cannot make token without a secret');
  return await new SignJWT({ ip })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(jwtSecret));
}

export function setTokenHeader(
  event: H3Event<EventHandlerRequest>,
  token: string,
) {
  setHeader(event, tokenHeader, token);
}

export async function createTokenIfNeeded(
  event: H3Event<EventHandlerRequest>,
): Promise<null | string> {
  if (!isTurnstileEnabled()) return null;
  if (!jwtSecret) return null;
  const token = event.headers.get(tokenHeader);
  if (!token) return null;
  if (!token.startsWith(turnstilePrefix)) return null;

  return await makeToken(getIp(event));
}

export async function isAllowedToMakeRequest(
  event: H3Event<EventHandlerRequest>,
) {
  if (!isTurnstileEnabled()) return true;

  const token = event.headers.get(tokenHeader);
  if (!token) return false;
  if (!jwtSecret || !turnstileSecret) return false;

  if (token.startsWith(jwtPrefix)) {
    const jwtToken = token.slice(jwtPrefix.length);
    let jwtPayload: { ip: string } | null = null;
    try {
      const jwtResult = await jwtVerify<{ ip: string }>(
        jwtToken,
        new TextEncoder().encode(jwtSecret),
        {
          algorithms: ['HS256'],
        },
      );
      jwtPayload = jwtResult.payload;
    } catch {}
    if (!jwtPayload) return false;
    if (getIp(event) !== jwtPayload.ip) return false;
    return true;
  }

  if (token.startsWith(turnstilePrefix)) {
    const turnstileToken = token.slice(turnstilePrefix.length);
    const formData = new FormData();
    formData.append('secret', turnstileSecret);
    formData.append('response', turnstileToken);
    formData.append('remoteip', getIp(event));

    const result = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        body: formData,
        method: 'POST',
      },
    );

    const outcome: { success: boolean } = await result.json();
    return outcome.success;
  }

  return false;
}
