import { getProxyHeaders, getAfterResponseHeaders } from '../utils/headers';

export default defineEventHandler(async (event) => {
  // handle cors, if applicable
  if (isPreflightRequest(event)) return handleCors(event, {});

  // parse destination URL
  const destination = getQuery<{ destination?: string }>(event).destination;
  if (!destination) throw new Error('invalid destination');

  // proxy
  await proxyRequest(event, destination, {
    fetchOptions: {
      redirect: 'follow',
      headers: getProxyHeaders(event.headers),
    },
    onResponse(outputEvent, response) {
      const headers = getAfterResponseHeaders(response.headers, response.url);
      appendResponseHeaders(outputEvent, headers);
    },
  });
});
