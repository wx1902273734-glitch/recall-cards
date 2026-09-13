export default async function handler(_request, response) {
  try {
    const upstream = await fetch('https://recall-cards.wx1902273734.workers.dev/api/health');
    return response.status(upstream.status).send(await upstream.text());
  } catch {
    return response.status(503).json({ok:false});
  }
}
