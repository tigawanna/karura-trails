import pg from "pg";

function resolvePgliteConnectionUrl(): string {
  const useBrowserProxy = process.env.PGLITE_USE_BROWSER_PROXY === "true";
  if (useBrowserProxy) {
    return (
      process.env.PGLITE_BROWSER_PROXY_URL ??
      `postgresql://postgres@127.0.0.1:${process.env.PGLITE_BROWSER_PROXY_TCP_PORT ?? "15432"}/postgres`
    );
  }

  return (
    process.env.PGLITE_GATEWAY_URL ??
    `postgresql://postgres@127.0.0.1:${process.env.PGLITE_GATEWAY_PORT ?? "5433"}/postgres`
  );
}

const sql = process.argv.slice(2).join(" ").trim();
if (!sql) {
  console.error('Usage: pnpm run db:pglite:query -- "SELECT 1"');
  process.exit(1);
}

const client = new pg.Client({ connectionString: resolvePgliteConnectionUrl() });

try {
  await client.connect();
  const result = await client.query(sql);
  if (result.command === "SELECT") {
    console.table(result.rows);
  } else {
    console.log(`${result.command} ${result.rowCount ?? 0} row(s)`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
