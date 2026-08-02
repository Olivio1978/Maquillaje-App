import { Client } from 'pg'

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('Falta la variable de entorno SUPABASE_DB_URL')
  process.exit(1)
}

const url = new URL(connectionString)
const client = new Client({
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  host: url.hostname,
  port: Number(url.port) || 5432,
  database: url.pathname.slice(1) || 'postgres',
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  const res = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name;
  `)
  console.log(res.rows.map((r) => r.table_name).join('\n'))
} catch (err) {
  console.error('Error:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
