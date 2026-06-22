# SpinAI

> Asigna aleatoriamente quién conduce la reunión de equipo cada viernes. Justo, simple y sin discusiones.

![SpinAI Home](./public/screen.png)

---

## ¿Qué es SpinAI?

SpinAI es una app interna para equipos que necesitan rotar el rol de facilitador en reuniones semanales. La ruleta decide, el calendario organiza, y el email notifica — todo en un solo lugar.

---

## Funcionalidades

- **Ruleta de asignación** — gira y asigna aleatoriamente a cada integrante activo un viernes
- **Calendario de asignados** — visualiza los próximos turnos con drag & drop para intercambiar fechas
- **Preparación de láminas** — cada asignado puede preparar su agenda, puntos clave y notas antes de la reunión
- **Vista de presentación** — modo pantalla completa con ítems tachables durante la reunión
- **Notificación manual** — botón en el home para avisar al equipo quién presenta este viernes
- **Notificación automática** — GitHub Actions envía el email cada lunes a las 9:00 AM automáticamente
- **Log de cambios** — historial de todos los intercambios de turno realizados
- **Acceso protegido** — PIN gate con JWT y cookie HttpOnly

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 · TypeScript · Tailwind CSS v4 |
| Base de datos | Supabase (PostgreSQL) |
| Email | Gmail SMTP via Nodemailer |
| Automatización | GitHub Actions (cron semanal) |
| Deploy | Vercel |

---

## Variables de entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Auth
PIN=
JWT_SECRET=

# Email
GMAIL_USER=
GMAIL_PASS=

# Cron
CRON_SECRET=
```

---

## Cómo funciona la notificación automática

1. **GitHub Actions** se ejecuta cada lunes a las 12:00 UTC (9:00 AM Santiago)
2. Llama al endpoint `GET /api/cron/notify` con el `CRON_SECRET`
3. El endpoint consulta Supabase para encontrar el próximo asignado
4. Envía el email al responsable (`to`) y al resto del equipo (`cc`) via Gmail

Para activarlo necesitas configurar en GitHub → Settings → Secrets:
- `APP_URL` — URL de tu app en Vercel
- `CRON_SECRET` — mismo valor que en Vercel

---

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Base de datos (Supabase)

Tablas requeridas: `members`, `assignments`, `templates`, `assignment_logs`

Para habilitar emails, agrega la columna de email a la tabla de miembros:

```sql
alter table members add column if not exists email text;
```
