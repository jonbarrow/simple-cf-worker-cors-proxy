import { EventHandlerRequest, H3Event } from 'h3';

export function getIp(_event: H3Event<EventHandlerRequest>) {
  return 'not-a-real-ip'; // TODO cross platform IP
}
