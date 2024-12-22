import { EventHandlerRequest, H3Event } from 'h3';

export function getIp(event: H3Event<EventHandlerRequest>) {
  const value = getHeader(event, 'CF-Connecting-IP');
  if (!value)
    throw new Error(
      'Ip header not found, turnstile only works on cloudflare workers',
    );
  return value;
}
