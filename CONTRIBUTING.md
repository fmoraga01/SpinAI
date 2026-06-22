# Cómo contribuir a SpinAI

¡Gracias por tu interés en contribuir a SpinAI! Este documento explica cómo colaborar en el proyecto.

---

## Antes de empezar

- Revisa los [issues abiertos](../../issues) para no duplicar trabajo
- Si es una gran feature, abre un issue primero para discutirla
- Sigue el código style del proyecto (TypeScript, Tailwind, componentes funcionales)

---

## Proceso de contribución

### 1. Fork y clonar

```bash
git clone https://github.com/TU_USUARIO/SpinAI.git
cd SpinAI
npm install
```

### 2. Crear una rama

```bash
git checkout -b feature/descripcion-corta
```

Nombres recomendados:
- `feature/nueva-funcionalidad`
- `fix/descripcion-bug`
- `docs/mejora-documentacion`

### 3. Hacer cambios

- Edita los archivos necesarios
- Prueba localmente: `npm run dev`
- Si agregaste dependencias: `npm install`

### 4. Commit

```bash
git commit -m "breve descripcion del cambio"
```

Mantén los commits claros y atómicos (un cambio por commit).

### 5. Push y Pull Request

```bash
git push origin feature/descripcion-corta
```

Abre un PR en GitHub con:
- Título descriptivo
- Descripción clara de qué cambió y por qué
- Link al issue relacionado (si existe)

---

## Guía de estilo

- **TypeScript** — tipos explícitos, no `any`
- **Componentes** — funcionales con hooks, naming claro
- **Tailwind** — preferir clases antes que inline styles (cuando sea posible)
- **Funciones** — máximo 20-30 líneas, responsabilidad única
- **Comentarios** — solo si el WHY no es obvio

---

## Testing

Ejecuta antes de hacer PR:

```bash
npm run build    # Verifica que compile
npm run lint     # Si hay linter configurado
```

---

## Preguntas o dudas

Abre un issue o participa en las discusiones. ¡Cualquier contribución es bienvenida!
