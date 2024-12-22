import { H3Event, EventHandlerRequest } from 'h3';

export async function sendJson(ops: {
  event: H3Event<EventHandlerRequest>;
  data: Record<string, any>;
  status?: number;
}) {
  setResponseStatus(ops.event, ops.status ?? 200);
  await send(ops.event, JSON.stringify(ops.data, null, 2), 'application/json');
}
