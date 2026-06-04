# VitalBite Frontend Web

Aplicación web Angular para nutricionistas y administradores de VitalBite.

## Stack

- Angular standalone
- SCSS
- Apollo Client
- pnpm

## Requisitos

- Node.js 24.13+ usado en el entorno actual
- pnpm 10+
- Core NestJS ejecutándose en `http://localhost:3000/graphql`

## Desarrollo

```bash
pnpm install
pnpm start
```

La aplicación abre por defecto en `http://localhost:4200`.

## Flujo demo

- Login demo visual en `/login`.
- El ingreso consulta el contexto demo del Core.
- No usa JWT todavía.

## Pantallas implementadas

- Inicio operativo.
- Pacientes.
- Detalle de paciente.
- Citas.
- Medidas corporales y composición corporal.

## Verificación

```bash
pnpm run build
pnpm run test -- --watch=false --browsers=ChromeHeadless
```
