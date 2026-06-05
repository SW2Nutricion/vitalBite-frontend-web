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

- Login real en `/login` contra el Core.
- Registro profesional en `/register`.
- El token de sesión se guarda en `localStorage` y se envía como Bearer en operaciones GraphQL protegidas.
- Las rutas internas usan guards de autenticación, rol y permiso por módulo.

## Pantallas implementadas

- Inicio operativo.
- Login y registro.
- Pacientes.
- Detalle de paciente.
- Citas.
- Medidas corporales y composición corporal.

## Verificación

```bash
pnpm run build
pnpm run test -- --watch=false --browsers=ChromeHeadless
```
