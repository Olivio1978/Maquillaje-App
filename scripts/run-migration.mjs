import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const file = process.argv[2]
if (!file) {
  console.error('Uso: node scripts/run-migration.mjs <archivo.sql>')
  process.exit(1)
}

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('Falta la variable de entorno SUPABASE_DB_URL')
  process.exit(1)
}

const sql = readFileSync(file, 'utf8')
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
  await client.query(sql)
  console.log(`Migración aplicada: ${file}`)
} catch (err) {
  console.error('Error aplicando la migración:', err.message)
  process.exitCode = 1
} finally {
  await client.end()
}
