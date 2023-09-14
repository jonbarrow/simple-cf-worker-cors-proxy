import { H3Event, EventHandlerRequest } from 'h3';

export function sendJson(ops: {
  event: H3Event<EventHandlerRequest>;
  data: Record<string, any>;
  status?: number;
}) {
  setResponseStatus(ops.event, ops.status ?? 200);
  appendResponseHeader(ops.event, 'content-type', 'application/json');
  send(ops.event, JSON.stringify(ops.data, null, 2));
}
