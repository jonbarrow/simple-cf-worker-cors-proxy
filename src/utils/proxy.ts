import {
  H3Event,
  Duplex,
  ProxyOptions,
  getProxyRequestHeaders,
  RequestHeaders,
} from 'h3';

const PayloadMethods = new Set(['PATCH', 'POST', 'PUT', 'DELETE']);

export interface ExtraProxyOptions {
  blacklistedHeaders?: string[];
}

function mergeHeaders(
  defaults: HeadersInit,
  ...inputs: (HeadersInit | RequestHeaders | undefined)[]
) {
  const _inputs = inputs.filter(Boolean) as HeadersInit[];
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    if (input.entries) {
      for (const [key, value] of (input.entries as any)()) {
        if (value !== undefined) {
          merged.set(key, value);
        }
      }
    } else {
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          merged.set(key, value);
        }
      }
    }
  }
  return merged;
}

export async function specificProxyRequest(
  event: H3Event,
  target: string,
  opts: ProxyOptions & ExtraProxyOptions = {},
) {
  let body;
  let duplex: Duplex | undefined;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = 'half';
    } else {
      body = await readRawBody(event, false).catch(() => undefined);
    }
  }

  const method = opts.fetchOptions?.method || event.method;
  const oldHeaders = getProxyRequestHeaders(event);
  opts.blacklistedHeaders?.forEach((header) => {
    const keys = Object.keys(oldHeaders).filter(
      (v) => v.toLowerCase() === header.toLowerCase(),
    );
    keys.forEach((k) => delete oldHeaders[k]);
  });

  const fetchHeaders = mergeHeaders(
    oldHeaders,
    opts.fetchOptions?.headers,
    opts.headers,
  );
  const headerObj = Object.fromEntries([...(fetchHeaders.entries as any)()]);
  if (process.env.REQ_DEBUG === 'true') {
    console.log({
      type: 'request',
      method,
      url: target,
      headers: headerObj,
    });
  }

  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders,
    },
  });
}
