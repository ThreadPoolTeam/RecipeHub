const ALLOWED_PREFIXES = ['api/v1/identity', 'api/v1/recipes', 'api/v1/content'] as const;

function getGatewayUrl(): string {
  const value = process.env.GATEWAY_INTERNAL_URL ?? 'http://localhost:5262';
  return value.replace(/\/$/, '');
}

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(
  request: Request,
  context: RouteContext
): Promise<Response> {
  const { path } = await context.params;
  const backendPath = path.join('/');
  if (!isAllowedPath(backendPath)) {
    return Response.json({ message: 'Backend route is not allowed.' }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const targetUrl = `${getGatewayUrl()}/${backendPath}${requestUrl.search}`;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : null;
  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Unknown connection error';
    return Response.json(
      {
        title: 'Gateway unavailable',
        detail: `Không thể kết nối RecipeHub Gateway tại ${getGatewayUrl()}. Hãy khởi động Gateway trước. Nguyên nhân: ${reason}`,
      },
      { status: 502 }
    );
  }
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
