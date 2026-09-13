import gameHtml from './public/game/index.html?raw';

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
let apiRouterPromise: Promise<typeof import('./src/api-router')> | undefined;

function isGameApplicationRoute(pathname: string): boolean {
  return (
    pathname === '/game' ||
    pathname === '/game/' ||
    pathname.startsWith('/game/') ||
    pathname === '/signin' ||
    pathname.startsWith('/signin/') ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/')
  );
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import('@tanstack/react-start/server-entry').then(
      (module) => (module.default ?? module) as ServerEntry,
    );
  }

  return serverEntryPromise;
}

async function getApiRouter() {
  if (!apiRouterPromise) {
    apiRouterPromise = import('./src/api-router');
  }

  return apiRouterPromise;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const { handleApiRequest } = await getApiRouter();
      const apiResponse = await handleApiRequest(request, env);
      if (apiResponse) return apiResponse;
    }

    const isStaticAsset = url.pathname.includes('.') && !url.pathname.endsWith('.html');
    if (isGameApplicationRoute(url.pathname) && !isStaticAsset) {
      return new Response(gameHtml, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    const handler = await getServerEntry();
    return handler.fetch(request, env, ctx);
  },
};
