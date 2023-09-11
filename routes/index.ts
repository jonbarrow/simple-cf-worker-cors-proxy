import {
  defineEventHandler,
  getQuery,
  isMethod,
  handleCors,
  proxyRequest,
} from 'h3';

export default defineEventHandler(async (event) => {
  const destination = getQuery(event).destination;

  let response = new Response('404 Not Found', {
    status: 404,
  });

  if (isMethod(event, 'OPTIONS')) {
    // Handle CORS preflight requests
    return handleCors(event, {});
  } else if (!destination?.toString()) {
    return new Response('200 OK', {
      status: 200,
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } else if (
    isMethod(event, 'GET') ||
    isMethod(event, 'HEAD') ||
    isMethod(event, 'POST')
  ) {
    const headers = {
      ...event.headers,
      Cookie: event.headers.get('X-Cookie'),
      Referer: event.headers.get('X-Referer'),
      'User-Agent':
        event.headers.get('X-User-Agent') ??
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
      Origin:
        new URL(destination.toString()).origin ?? event.headers.get('X-Origin'),
      Host: new URL(destination.toString()).host ?? event.headers.get('X-Host'),
      PHPSESSID: event.headers.get('PHPSESSID')
        ? `PHPSESSID=${event.headers.get('PHPSESSID')}`
        : null,
    };

    Object.keys(headers).forEach((key) => {
      if (headers[key as keyof Headers] === null) {
        delete headers[key as keyof typeof headers];
      }
    });

    return proxyRequest(event, destination?.toString(), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': '*',
        Vary: 'Origin',
        // 'X-Final-Destination'
        // 'X-Set-Cookie'
        // 'PHPSESSID'
      },
      fetchOptions: {
        headers: {
          ...headers,
        },
        redirect: 'follow',
      },
    });
  }

  return response;
});
