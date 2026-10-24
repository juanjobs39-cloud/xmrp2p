import type { APIRoute, GetStaticPaths } from "astro";

/** Archivo de llave de IndexNow (/<llave>.txt). Solo se genera si INDEXNOW_KEY está definida. */
export const getStaticPaths: GetStaticPaths = () => {
  const key = process.env.INDEXNOW_KEY ?? "";
  return /^[a-zA-Z0-9-]{8,128}$/.test(key) ? [{ params: { key } }] : [];
};

export const GET: APIRoute = ({ params }) => new Response(String(params.key), { headers: { "content-type": "text/plain; charset=utf-8" } });
