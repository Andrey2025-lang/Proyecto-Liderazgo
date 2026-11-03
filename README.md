# Préstamos J&C

Plataforma web para Préstamos J&C: sitio público informativo, portal del cliente y panel interno para la gestión de solicitudes, préstamos, pagos y cobros.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod, Recharts y Sonner.
- **Backend:** NestJS + Prisma ORM + SQLite.
- **Autenticación:** JWT en cookie `httpOnly`, contraseñas con bcrypt.
- **Documentos:** carga local en `server/uploads` (PDF, JPG o PNG, máximo 5 MB).
- **Reportes:** tablero, cartera, morosidad, cobros y exportación CSV.

## Estructura

```text
jyc-digital/
├─ client/                 # React + Vite
│  ├─ src/components/      # UI, layouts y componentes compartidos
│  ├─ src/pages/public/    # Sitio público, login y registro
│  ├─ src/pages/client/    # Portal del cliente
│  ├─ src/pages/admin/     # Panel administrativo
│  └─ src/lib/             # API, autenticación, tipos y utilidades
├─ server/                 # NestJS + Prisma
│  ├─ prisma/schema.prisma # Modelo de datos
│  ├─ prisma/seed.ts       # Datos de ejemplo
│  ├─ prisma/dev.db        # SQLite local
│  └─ src/                 # Módulos de la API
└─ package.json            # Scripts del monorepo
```

## Requisitos

- Node.js 20 o superior (probado con Node 26).
- npm 10 o superior.

## Instalación y ejecución local

```powershell
cd jyc-digital
npm install

# Solo si no existen los archivos de entorno:
Copy-Item server/.env.example server/.env
Set-Content client/.env "VITE_API_URL=/api"

# Crear la base SQLite y cargar datos de ejemplo
npm run db:push
npm run db:seed

# Levantar API y frontend en paralelo
npm run dev
```

Servicios:

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000/api>
- Swagger: <http://localhost:3000/api/docs>
- Health check: <http://localhost:3000/api/health>

También se pueden ejecutar por separado:

```powershell
npm run dev:server
npm run dev:client
```

## Credenciales de acceso

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@jyc.cr` | `Staff123!` |
| Supervisor | `supervisor@jyc.cr` | `Staff123!` |
| Oficinista | `oficinista@jyc.cr` | `Staff123!` |
| Cobrador | `cobrador@jyc.cr` | `Staff123!` |
| Cobrador 2 | `cobrador2@jyc.cr` | `Staff123!` |
| Cliente | `cliente@jyc.cr` | `Cliente123!` |

Otros clientes de ejemplo: `luis@jyc.cr`, `carla@jyc.cr`, `mario@jyc.cr`, `paola@jyc.cr` y `jorge@jyc.cr`, todos con contraseña `Cliente123!`.

La pantalla de login incluye botones para completar automáticamente las cuentas principales.

## Roles y permisos

- **Cliente:** se registra e inicia sesión para poder crear y enviar solicitudes, adjuntar documentos, consultar sus préstamos y recibir avisos. El sitio público no inicia trámites de préstamo.
- **Cobrador:** ve únicamente sus clientes y préstamos asignados; registra pagos de su ruta. No aprueba solicitudes ni administra usuarios.
- **Supervisor:** revisa solicitudes, recomienda, solicita información y asigna cobradores. La aprobación final queda reservada al administrador.
- **Oficinista:** registra clientes y solicitudes asistidas desde **Recepción**, consulta el historial y deja observaciones. No aprueba, rechaza, desembolsa, anula pagos ni cambia la configuración.
- **Administrador:** gestiona todo el proceso, aprueba o rechaza solicitudes, desembolsa, registra y anula pagos, administra usuarios, configuración y auditoría.

## Flujo de prueba recomendado

1. Ingresar con `cliente@jyc.cr` y revisar el portal y los avisos.
2. Crear una cuenta nueva desde `/registro`.
3. Completar el formulario de solicitud en tres pasos, usando los selectores de zona, ocupación, ingreso, monto, plazo, frecuencia y destino.
4. Enviar la solicitud.
5. Ingresar como administrador y abrir **Solicitudes**.
6. Marcar la solicitud en revisión, aprobarla con uno de los montos permitidos, interés total, plazo, frecuencia, primer vencimiento y cobrador.
7. Abrir el préstamo generado y confirmar el desembolso.
8. Registrar un pago y verificar que el saldo, las cuotas y el estado se actualicen.
9. Revisar el movimiento en **Pagos**, **Reportes** y **Auditoría**.
10. Volver al portal del cliente para comprobar el préstamo, el plan de pagos y las notificaciones.

## Funcionalidades incluidas

### Sitio público

- Página de inicio informativa con propuesta de valor, pasos, requisitos, preguntas frecuentes, logo de la empresa, teléfonos de contacto y simulador de cuota.
- Páginas de cómo funciona, requisitos, preguntas frecuentes y privacidad.
- Registro e inicio de sesión obligatorios para iniciar una solicitud.
- Diseño responsive con identidad verde, crema y dorado, usando los logos entregados por la empresa como referencia visual.

### Portal del cliente

- Tablero con resumen de solicitudes, préstamos, saldo, próximo pago y avisos.
- Listado y detalle de solicitudes con seguimiento por etapas.
- Formulario de solicitud en tres pasos con selectores, guardado de borrador, carga de documentos y envío.
- Préstamos con plan de pagos, cuotas, pagos y saldo.
- Edición de perfil y datos socioeconómicos.
- Notificaciones internas con opción de marcar como leídas.

### Panel administrativo

- Tablero con cartera, solicitudes, cobros, mora y desempeño del equipo.
- Bandeja de solicitudes con filtros y búsqueda.
- Revisión, solicitud de información, recomendación, aprobación y rechazo.
- Gestión de clientes, asignación de cobradores e historial.
- Préstamos con desembolso, asignación, pagos, anulación y plan de pagos.
- Registro de pagos con método, fecha, referencia externa y notas.
- Reportes de cartera, antigüedad de mora, cobros y comunidades.
- Administración de usuarios internos y estados de cuenta.
- Configuración del interés total vigente (5% sobre el monto por defecto), montos disponibles, plazo mínimo y máximo en semanas, teléfonos y textos. Los valores iniciales son ₡50.000, ₡75.000 y ₡100.000, de 1 a 8 semanas. Las modificaciones no alteran préstamos existentes.
- Auditoría de acciones sensibles.

## Reglas de negocio

- Las solicitudes pueden crearlas clientes autenticados o personal de recepción autorizado, en nombre de un cliente activo y con su consentimiento. La API responde `401` sin sesión.
- La aprobación final solo puede realizarla un administrador.
- Un cliente no puede tener dos solicitudes activas simultáneas.
- La restricción incluye borradores y renovaciones, y se protege con un índice único parcial de SQLite creado al iniciar la API (`one_pending_application_per_client`). Si se sincroniza el esquema, reiniciar la API para asegurar que el índice esté presente.
- Con un préstamo activo o en mora, solo se permite renovar ese préstamo. Con desembolso pendiente, no se reciben más solicitudes.
- En el portal, el cliente guarda un borrador, adjunta únicamente su cédula (`ID_CARD`, PDF/JPG/PNG hasta 5 MB) y lo envía. No se requieren otros documentos. Recepción verifica la cédula al registrar una solicitud asistida.
- Los montos disponibles se administran en **Configuración**, separados por comas y sin separadores de miles. El plazo mínimo y máximo se expresan en semanas (entre 1 y 104).
- El monto aprobado no puede superar el solicitado y debe estar habilitado en la configuración vigente.
- El interés total configurable se aplica una sola vez sobre el monto y se reparte entre las cuotas según el plazo y la frecuencia de pago.
- Los pagos se aplican a las cuotas pendientes en orden.
- Un pago puede anularse únicamente por un administrador y con un motivo; la operación queda auditada.
- Los montos se manejan en colones costarricenses (CRC) y se muestran con formato `es-CR`.
- El interés total es configurable: se aplica una sola vez sobre el monto completo, no como tasa anual. Se conserva el nombre técnico `annualRate` por compatibilidad con los datos existentes.

## Renovación de préstamos

1. El cliente abre **Mis préstamos → detalle → Solicitar renovación** y elige monto, plazo y frecuencia.
2. Se muestran saldo anterior, neto estimado, interés y total del nuevo plan. El monto solicitado debe ser mayor que el saldo anterior.
3. Administración revisa **Solicitudes**, el historial de préstamos, pagos y atrasos, y aprueba o rechaza manualmente. No hay aprobación automática por puntuación.
4. Aprobar crea un nuevo préstamo pendiente de desembolso; todavía no cancela el anterior.
5. Al desembolsar se recalcula y confirma el saldo anterior. En una misma transacción se cancela ese saldo, se registra el movimiento interno y se activa el nuevo préstamo.

Ejemplo: nuevo monto **₡100.000**, saldo anterior **₡25.000**, entrega neta **₡75.000**. Con interés total de **5 % sobre ₡100.000**, el nuevo plan suma **₡105.000**. El saldo anterior incluye las cuotas pendientes de capital e interés pactado; no se inventan recargos.

La cancelación usa el método interno `REFINANCE`: aparece en el historial, pero no suma a los cobros del tablero ni al total cobrado de Pagos. No puede anularse como un pago común ni repetirse el desembolso. Los pagos previos de un préstamo ya renovado tampoco se pueden anular para evitar reabrir una deuda cancelada. No se implementa registro sin conexión.

### Actualizar una instalación existente sin borrar datos

```powershell
npm run db:push
npm run db:upgrade --workspace server
```

El segundo comando fija el interés inicial en 5 % y agrega la cuenta de oficinista si no existe; no modifica préstamos existentes. No usar `db:seed` para actualizar: ese script elimina y recrea los datos de ejemplo.

### Prueba automatizada de los cambios

```powershell
npm run test:integration --workspace server
```

Crea una base temporal aislada y prueba configuración, recepción, permisos, renovación con entrega neta de ₡75.000, confirmación de saldo, prevención del doble desembolso y exclusión de cancelaciones internas en cobros. No modifica la base de uso diario.

## Listo Recaudo

El flujo de Listo Recaudo está preparado mediante:

- Campo de referencia externa (`listoRecaudoLoanId`) al desembolsar.
- Campo de recibo o referencia externa al registrar un pago.
- Exportación CSV de pagos para conciliación manual.

La exportación está disponible en **Pagos → Exportar CSV** para administradores y supervisores. Una integración futura puede reemplazar las referencias manuales por llamadas a la API y conciliación automática.

## Base de datos y datos de ejemplo

- La base local es `server/prisma/dev.db`.
- Para reiniciar los datos de ejemplo:

```powershell
npm run db:push
npm run db:seed
```

Si Prisma solicita una reconstrucción completa, se puede ejecutar desde `server/`:

```powershell
npx prisma db push --force-reset
npm run db:seed
```

Esto elimina los datos locales y vuelve a cargar la cartera de ejemplo. No usar en producción.

## Variables de entorno

`server/.env`:

```env
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET="cambia-esta-clave-en-produccion"
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_DIR=./uploads
```

`client/.env`:

```env
VITE_API_URL=/api
```

En producción se debe usar un secreto JWT seguro, HTTPS, una base de datos administrada, almacenamiento de archivos apropiado y controles adicionales de seguridad.

En desarrollo, Vite recibe `/api` y lo redirige al backend en el puerto 3000. Esto permite acceder desde otro dispositivo usando `http://IP-DE-LA-COMPUTADORA:5173` sin que el navegador intente conectarse a su propio localhost. El dispositivo debe estar en la misma red y el firewall debe permitir el puerto 5173. En producción, el servidor web debe redirigir `/api` al backend o se debe configurar `VITE_API_URL` con la dirección pública de la API.

## Scripts útiles

Desde `jyc-digital/`:

```powershell
npm run dev        # API + frontend
npm run dev:server # Solo API con recarga
npm run dev:client # Solo frontend
npm run build      # Compilar backend y frontend
npm run db:push    # Sincronizar el esquema Prisma
npm run db:seed    # Cargar datos de ejemplo
```

## Seguridad y alcance

- Las contraseñas se almacenan con bcrypt y nunca se devuelven en las respuestas de la API.
- La sesión usa una cookie `httpOnly` con `sameSite=lax`.
- Los controladores protegidos validan JWT y roles.
- Las acciones sensibles se registran en auditoría.
- La información médica no forma parte del proceso de evaluación.
- La verificación de correo y el captcha quedan como mejoras pendientes; el modelo y el flujo están preparados para incorporarlos.
- La identidad visual usa los logos entregados por la empresa: `client/public/prestamos-jyc-logo.png` para la marca horizontal y `client/public/prestamos-jyc-icon.png` para el emblema circular. Los teléfonos de contacto se administran desde la configuración interna.

## Despliegue completo en Render

El repositorio contiene el código y los archivos de ejemplo de configuración. No incluye la base de datos local, documentos adjuntos, contraseñas del entorno ni dependencias instaladas.

Una sola instancia Node sirve React y la API bajo la misma URL HTTPS. No se necesita Netlify ni un segundo servicio. `npm start` prepara las carpetas, crea las tablas sin autorizar borrados, crea el primer administrador si falta y luego inicia el servidor. Nunca ejecuta `db:seed` ni modifica las contraseñas existentes. Los accesos rápidos de desarrollo no se incluyen en la página de producción.

### Opción automática: Blueprint

En Render: **New → Blueprint → conectar este repositorio → main**. Render lee `render.yaml`. Introducir únicamente `ADMIN_EMAIL` y `ADMIN_PASSWORD` (propia, al menos 12 caracteres). Se genera `JWT_SECRET` automáticamente y se configura el disco y el resto de las variables.

**La plantilla solicita un servicio Starter de pago y un disco persistente de 1 GB. Revisar y aceptar los cargos en Render antes de crear el servicio.** Este repositorio no crea servicios ni contrata planes automáticamente. Si ya existe un Web Service, es preferible configurarlo como se indica abajo para evitar duplicarlo y pagar dos servicios.

### Actualizar el Web Service existente

| Campo de Render | Valor |
| --- | --- |
| Branch | `main` |
| Root Directory | vacío |
| Build Command | `npm run render:build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Disco persistente (Mount Path) | `/var/data` |

En **Environment** configurar:

| Variable | Valor |
| --- | --- |
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `VITE_API_URL` | `/api` (si existe un valor anterior, reemplazarlo) |
| `DATA_DIR` | `/var/data` |
| `DATABASE_URL` | `file:/var/data/jyc.db` |
| `UPLOAD_DIR` | `/var/data/uploads` |
| `JWT_SECRET` | generar una clave privada aleatoria de al menos 32 caracteres |
| `ADMIN_EMAIL` | correo propio para iniciar sesión |
| `ADMIN_PASSWORD` | contraseña propia de al menos 12 caracteres |

No poner comillas alrededor de los valores. Render asigna `PORT` automáticamente. `CLIENT_ORIGIN` es opcional para este despliegue de un solo origen: puede quitarse el valor localhost anterior; el servidor usa `RENDER_EXTERNAL_URL` automáticamente.

Guardar y ejecutar **Manual Deploy → Deploy latest commit**. Abrir la URL principal para ver el sitio; `/api/health` verifica el backend. Los enlaces directos como `/login` o `/app/prestamos` funcionan sin errores 404. Ingresar con las credenciales propias de administrador; desde Usuarios se pueden crear cuentas internas. No hay datos ni usuarios de ejemplo en la base nueva.

Después del primer inicio correcto, se puede retirar `ADMIN_PASSWORD` de Environment. Cambiar esa variable después no cambia una cuenta ya creada. No borrar ni reemplazar el disco: contiene SQLite y las cédulas adjuntas. Mantener una única instancia y realizar copias de seguridad del disco.

### Validación antes de publicar

`npm run build` y `npm run test:integration --workspace server` verifican el código. `npm run test:deployment` prueba además el inicio completo en una base temporal: sitio React, rutas directas, API, creación del administrador, cookies seguras y conservación de la cuenta al reiniciar. No utiliza la base local.

No ejecutar `db:seed` ni `setup` contra una instalación que deba conservarse: cargan datos de ejemplo y eliminan los existentes. La actualización de esquema al iniciar no usa `--accept-data-loss` ni `--force-reset`; si un cambio requiere migración manual, el inicio se detiene con un mensaje.

GitHub Pages no puede ejecutar Node ni alojar esta base. El repositorio solo contiene código; los datos y secretos permanecen en Render. Antes de abrir acceso con información real, revisar vulnerabilidades de dependencias, respaldos y controles de privacidad.

## Limitaciones conocidas

- SQLite y almacenamiento local son adecuados para desarrollo; para producción se recomienda una base administrada y almacenamiento de objetos.
- La integración con Listo Recaudo es manual mediante referencias y CSV.
- No hay envío de correos ni verificación de identidad real.
- No se implementó un motor de decisiones crediticias; la evaluación es humana.
