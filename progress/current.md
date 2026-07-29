# Current session state

- **Feature:** weekly-update-entry
- **Status:** in_progress (reviewer rechazó la primera vuelta)
- **Started:** 2026-07-29
- **Role active:** implementer
- **Next step:** `reviewer` rechazó en `progress/review_weekly-update-entry.md`
  por un único gap acotado: R16 exige `400` cuando `weekOf` está ausente
  **o no es parseable como fecha**; `app/api/proyectos/[id]/avances/route.ts`
  solo valida ausencia, no parseabilidad — un `weekOf: "banana"` atraviesa
  la validación y explota más abajo (500 en vez de 400). Fix: agregar el
  chequeo de parseabilidad de fecha antes de llamar a `mondayOf()`/Supabase,
  verificar por curl con un valor no parseable, y corregir la entrada de
  R16 en `progress/impl_weekly-update-entry.md` (decía "verificado por
  ejecución real" sin cubrir este caso). Todo lo demás del review pasó
  limpio (mondayOf(), orquestación en dos pasos, sin regresiones sobre
  project-crud/project-status-tracking, npm run verify en verde) — no
  hace falta tocar nada más. Una vez corregido: `npm run verify` de
  nuevo, volver a `in_review` para que `reviewer` re-audite el fix.
