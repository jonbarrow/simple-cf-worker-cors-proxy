import {
  defineEventHandler,
  EventHandlerRequest,
  readRawBody,
  getQuery,
  isMethod,
  H3Event,
} from "h3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

async function handleRequest(
  requestData: {
    headers: Headers;
    method: string;
    body: any;
    destination: string;
  },
  iteration = 0,
): Promise<Response> {
  console.log(
    `PROXYING ${requestData.destination}${
      iteration ? " ON ITERATION " + iteration : ""
    }`,
  );

  // Create a new mutable request object for the destination
  const request = new Request(requestData.destination, {
    headers: requestData.headers,
    method: requestData.method,
    body: requestData.body,
  });

  request.headers.set("Origin", new URL(requestData.destination).origin);
  request.headers.set("Host", new URL(requestData.destination).host);

  // TODO: Make cookie handling better. PHPSESSID overwrites all other cookie related headers

  // Add custom X headers from client
  // These headers are usually forbidden to be set by fetch

  const cookieValue = request.headers.get("X-Cookie");
  if (cookieValue) {
    request.headers.set("Cookie", cookieValue);
    request.headers.delete("X-Cookie");
  }

  const refererValue = request.headers.get("X-Referer");
  if (refererValue) {
    request.headers.set("Referer", refererValue);
    request.headers.delete("X-Referer");
  }

  const originValue = request.headers.get("X-Origin");
  if (originValue) {
    request.headers.set("Origin", originValue);
    request.headers.delete("X-Origin");
  }

  // Set PHPSESSID cookie
  if (request.headers.get("PHPSESSID")) {
    request.headers.set(
      "Cookie",
      `PHPSESSID=${request.headers.get("PHPSESSID")}`,
    );
  }

  // Set User Agent, if not exists
  const userAgent = request.headers.get("User-Agent");
  if (!userAgent) {
    request.headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0",
    );
  }

  // Fetch the new resource
  const oResponse = await fetch(request.clone());

  // If the server returned a redirect, follow it
  const locationValue = oResponse.headers.get("location");

  if ((oResponse.status === 302 || oResponse.status === 301) && locationValue) {
    // Server tried to redirect too many times
    if (iteration > 5) {
      return new Response("418 Too many redirects", {
        status: 418,
      });
    }

    // Handle and return the request for the redirected destination
    return await handleRequest(
      {
        headers: oResponse.headers,
        method: requestData.method,
        body: requestData.body,
        destination: locationValue,
      },
      iteration + 1,
    );
  }

  // Create mutable response using the original response as init
  const response = new Response(oResponse.body, oResponse);

  // Set CORS headers
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Expose-Headers", "*");

  const cookiesToSet = response.headers.get("Set-Cookie");

  // Transfer Set-Cookie to X-Set-Cookie
  // Normally the Set-Cookie header is not accessible to fetch clients

  const setCookieValue = response.headers.get("Set-Cookie");
  if (cookiesToSet && setCookieValue) {
    response.headers.set("X-Set-Cookie", setCookieValue);
  }

  // Set PHPSESSID cookie
  if (
    cookiesToSet &&
    cookiesToSet.includes("PHPSESSID") &&
    cookiesToSet.includes(";")
  ) {
    let phpsessid = cookiesToSet.slice(cookiesToSet.search("PHPSESSID") + 10);
    phpsessid = phpsessid.slice(0, phpsessid.search(";"));

    response.headers.set("PHPSESSID", phpsessid);
  }

  // Append to/Add Vary header so browser will cache response correctly
  response.headers.append("Vary", "Origin");

  // Add X-Final-Destination header to get the final url
  response.headers.set("X-Final-Destination", oResponse.url);

  return response;
}

function handleOptions(request: H3Event<EventHandlerRequest>) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  const headers = request.headers;
  let response = new Response(null, {
    headers: {
      Allow: "GET, HEAD, POST, OPTIONS",
    },
  });

  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ) {
    let accessControlRequestValue = headers.get(
      "Access-Control-Request-Headers",
    );
    response = new Response(null, {
      headers: {
        ...corsHeaders,
        // Allow all future content Request headers to go back to browser
        // such as Authorization (Bearer) or X-Client-Name-Version
        "Access-Control-Allow-Headers": accessControlRequestValue || "",
      },
    });
  }

  return response;
}

export default defineEventHandler(async (event) => {
  const destination = getQuery(event).destination;

  let response = new Response("404 Not Found", {
    status: 404,
  });

  let body;
  try {
    body = await readRawBody(event);
  } catch (err) {
    body = null;
  }

  if (isMethod(event, "OPTIONS")) {
    // Handle CORS preflight requests
    response = handleOptions(event);
  } else if (!destination?.toString()) {
    response = new Response("200 OK", {
      status: 200,
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } else if (
    isMethod(event, "GET") ||
    isMethod(event, "HEAD") ||
    isMethod(event, "POST")
  ) {
    // Handle request
    response = await handleRequest({
      headers: event.headers,
      method: event.method,
      destination: destination.toString(),
      body,
    });
  }

  return response;
});
