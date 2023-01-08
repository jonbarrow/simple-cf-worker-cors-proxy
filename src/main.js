const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
};

async function handleRequest(oRequest, destination, iteration = 0) {
  console.log(
    `PROXYING ${destination}${iteration ? ' ON ITERATION ' + iteration : ''}`,
  );

  // Create a new mutable request object for the destination
  const request = new Request(destination, oRequest);
  request.headers.set('Origin', new URL(destination).origin);

  // TODO - Make cookie handling better. PHPSESSID overwrites all other cookie related headers

  // Add custom X headers from client
  // These headers are usually forbidden to be set by fetch
  if (oRequest.headers.has('X-Cookie')) {
    request.headers.set('Cookie', oRequest.headers.get('X-Cookie'));
    request.headers.delete('X-Cookie');
  }

  if (request.headers.has('X-Referer')) {
    request.headers.set('Referer', request.headers.get('X-Referer'));
    request.headers.delete('X-Referer');
  }

  if (request.headers.has('X-Origin')) {
    request.headers.set('Origin', request.headers.get('X-Origin'));
    request.headers.delete('X-Origin');
  }

  // Set PHPSESSID cookie
  if (request.headers.get('PHPSESSID')) {
    request.headers.set(
      'Cookie',
      `PHPSESSID=${request.headers.get('PHPSESSID')}`,
    );
  }

  // Set User Agent, if not exists
  const useragent = request.headers.get('User-Agent');
  if (!useragent) {
    request.headers.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
    );
  }

  // Fetch the new resource
  const oResponse = await fetch(request);

  // If the server returned a redirect, follow it
  if (
    (oResponse.status === 302 || oResponse.status === 301) &&
    oResponse.headers.get('location')
  ) {
    // Server tried to redirect too many times
    if (iteration > 5) {
      return event.respondWith(
        new Response('418 Too many redirects', {
          status: 418,
        }),
      );
    }

    // Handle and return the request for the redirected destination
    return await handleRequest(
      request,
      oResponse.headers.get('location'),
      iteration + 1,
    );
  }

  // Create mutable response using the original response as init
  const response = new Response(oResponse.body, oResponse);

  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Expose-Headers', '*');

  const cookiesToSet = response.headers.get('Set-Cookie');

  // Transfer Set-Cookie to X-Set-Cookie
  // Normally the Set-Cookie header is not accessible to fetch clients
  if (cookiesToSet) {
    response.headers.set('X-Set-Cookie', response.headers.get('Set-Cookie'));
  }

  // Set PHPSESSID cookie
  if (
    cookiesToSet &&
    cookiesToSet.includes('PHPSESSID') &&
    cookiesToSet.includes(';')
  ) {
    let phpsessid = cookies.slice(cookies.search('PHPSESSID') + 10);
    phpsessid = phpsessid.slice(0, phpsessid.search(';'));

    response.headers.set('PHPSESSID', phpsessid);
  }

  // Append to/Add Vary header so browser will cache response correctly
  response.headers.append('Vary', 'Origin');

  return response;
}

function handleOptions(request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  const headers = request.headers;
  let response = new Response(null, {
    headers: {
      Allow: 'GET, HEAD, POST, OPTIONS',
    },
  });

  if (
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    response = new Response(null, {
      headers: {
        ...corsHeaders,
        // Allow all future content Request headers to go back to browser
        // such as Authorization (Bearer) or X-Client-Name-Version
        'Access-Control-Allow-Headers': request.headers.get(
          'Access-Control-Request-Headers',
        ),
      },
    });
  }

  return response;
}

addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const destination = url.searchParams.get('destination');

  console.log(`HTTP ${request.method} - ${request.url}`);

  let response = new Response('404 Not Found', {
    status: 404,
  });

  if (request.method === 'OPTIONS') {
    // Handle CORS preflight requests
    response = handleOptions(request);
  } else if (!destination) {
    response = new Response('200 OK', {
      status: 200,
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } else if (
    request.method === 'GET' ||
    request.method === 'HEAD' ||
    request.method === 'POST'
  ) {
    // Handle request
    response = handleRequest(request, destination);
  }

  event.respondWith(response);
});
