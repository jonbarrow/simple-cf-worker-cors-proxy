import { getBodyBuffer } from '@/utils/body';
import {
  getProxyHeaders,
  getAfterResponseHeaders,
  cleanupHeadersBeforeProxy,
} from '@/utils/headers';

export default defineEventHandler(async (event) => {
  // handle cors, if applicable
  if (isPreflightRequest(event)) return handleCors(event, {});

  // parse destination URL
  const destination = getQuery<{ destination?: string }>(event).destination;
  if (!destination)
    return await sendJson({
      event,
      status: 400,
      data: {
        error: 'destination query parameter invalid',
      },
    });

  // read body
  const body = await getBodyBuffer(event);

  // proxy
  cleanupHeadersBeforeProxy(event);
  await proxyRequest(event, destination, {
    fetchOptions: {
      redirect: 'follow',
      headers: getProxyHeaders(event.headers),
      body,
    },
    onResponse(outputEvent, response) {
      const headers = getAfterResponseHeaders(response.headers, response.url);
      setResponseHeaders(outputEvent, headers);
    },
  });
});
