const UPSTREAM = 'https://recall-cards.wx1902273734.workers.dev/api/cards';

export default async function handler(request, response) {
  if (!['GET', 'PUT'].includes(request.method)) return response.status(405).json({error:'Method not allowed'});
  try {
    const upstream = await fetch(UPSTREAM, {
      method:request.method,
      headers:{
        ...(request.headers.authorization ? {Authorization:request.headers.authorization} : {}),
        ...(request.method === 'PUT' ? {'Content-Type':'application/json'} : {})
      },
      body:request.method === 'PUT' ? JSON.stringify(request.body) : undefined
    });
    const body = await upstream.text();
    response.status(upstream.status);
    response.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    return response.send(body);
  } catch {
    return response.status(503).json({error:'同步服务暂时不可用'});
  }
}
