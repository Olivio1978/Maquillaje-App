# Maquillaje App

Aplicación de gestión para un negocio de maquillista independiente: clientas, agenda de citas, ingresos, gastos, compras, catálogo de servicios y catálogo de productos. Ver [CLAUDE.md](./CLAUDE.md) para la especificación completa del proyecto.

## Stack

- React + Vite
- Supabase (PostgreSQL + Auth)
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

3. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```
