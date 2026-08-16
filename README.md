# Maquillaje App

Aplicación de gestión para un negocio de maquillista independiente: agenda, clientas, servicios, finanzas, compras y galería de trabajos (modo Maquillista), más un portal de autoservicio para que las clientas reserven sus propias citas (modo Clienta). Instalable como PWA. Ver [CLAUDE.md](./CLAUDE.md) para la especificación completa del proyecto.

## Stack

- React + Vite (PWA vía `vite-plugin-pwa`)
- Supabase (PostgreSQL + Auth + Storage)
- Netlify (hosting)

## Configuración local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env` y completar con las credenciales del proyecto de Supabase:

   ```bash
   cp .env.example .env
   ```

3. Aplicar las migraciones de `supabase/migrations/` en orden contra tu proyecto de Supabase (con `SUPABASE_DB_URL` apuntando a tu base):

   ```bash
   node scripts/run-migration.mjs supabase/migrations/0001_init.sql
   node scripts/run-migration.mjs supabase/migrations/0002_citas_estado_pago_y_conflictos.sql
   node scripts/run-migration.mjs supabase/migrations/0003_portal_clienta_galeria_roles.sql
   ```

   La migración `0003` agrega el portal de clienta, la galería (tabla + bucket de
   Storage privado `galeria`) y las políticas de seguridad (RLS) que separan el
   acceso de la maquillista del de cada clienta.

4. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

## Cuentas y roles

- **Maquillista (administradora):** su cuenta ya existe en Supabase Auth y no
  tiene fila propia en `clientas`. Inicia sesión en `/login` y cae en `/app/*`.
- **Clienta:** se registra ella misma desde `/login` ("¿Eres clienta y no
  tienes cuenta? Regístrate"), lo que crea su cuenta de Auth y su fila en
  `clientas` (con `auth_user_id` vinculado) en un solo paso. Cae en `/portal/*`.

El rol se resuelve automáticamente: cualquier usuario autenticado sin fila en
`clientas` se trata como maquillista.

## Íconos de la PWA

Los íconos en `public/pwa-*.png` y `public/apple-touch-icon.png` se generan con:

```bash
powershell -File scripts/generate-pwa-icons.ps1
```

(Usa `System.Drawing`, no requiere Node ni paquetes adicionales — solo Windows.)
