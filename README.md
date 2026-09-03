# Doorway Cortex Bio-Pass — Mobile Health Passport

Pasaporte médico digital **Zero-Knowledge** con triple canal: **Web (SPA) + Bot de WhatsApp + API REST**.
Un QR físico (sticker 3×3 cm) enlaza a una ficha pública de emergencia; el historial clínico
completo queda cifrado en el navegador con una clave derivada del **PIN + teléfono** del titular.

> Estado: backend funcional + panel web + motor de bot. Los integradores externos
> (WhatsApp real, pasarelas de pago, OCR/IA, Twilio Voice, S3) están abstraídos en servicios
> y funcionan en **modo mock** hasta cargar credenciales reales en `backend/.env`.

---

## 1. Arquitectura

| Capa | Stack |
|---|---|
| **API REST** | Node.js + Express + TypeScript, Prisma ORM |
| **Base de datos** | PostgreSQL (relacional) |
| **Object storage** | S3 / MinIO (imágenes de CI, estudios médicos, PDFs, ZIPs de export) |
| **Bot WhatsApp** | Baileys (`@whiskeysockets/baileys`) — multi-device, sin API oficial |
| **Panel web** | React 18 + Vite + React Router 7 + Tailwind |
| **Cripto Zero-Knowledge** | AES-256-GCM + PBKDF2 (100k it.) — `crypto` (Node) / Web Crypto API (browser) |
| **Automatización** | `node-cron` — ciclo de cobranzas y purga GDPR/LGPD |
| **Docs API** | Swagger UI en `/api/docs` |

```
AI ENGINEER/
├─ backend/            API REST + motor Baileys + CRON
│  ├─ prisma/          schema.prisma (8 modelos) + seed.ts
│  └─ src/
│     ├─ controllers/  auth · emergency · medical · payment · export · sticker · bot
│     ├─ services/     qr-pdf · ocr-ai · emergency · export · payment · cron
│     ├─ security/     zero-knowledge (AES-256-GCM) · jwt
│     ├─ whatsapp/     baileys.client · bot-state-machine · nlp-handler
│     ├─ storage/      storage.service (local | S3/MinIO)
│     └─ swagger/      swagger.ts
├─ frontend/           SPA React (panel de usuario + ficha pública /e/:token)
├─ docs/               ER-DIAGRAM.md · BOT-STATE-MACHINE.md
└─ docker-compose.yml  PostgreSQL + MinIO
```

---

## 2. Puesta en marcha (local)

### Requisitos
- Node.js ≥ 20, npm ≥ 10
- Docker (para PostgreSQL + MinIO) — o un PostgreSQL propio

### Pasos

```bash
# 1. Infraestructura (PostgreSQL :5432 + MinIO :9000/:9001)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate      # crea el esquema
npm run prisma:seed         # usuario demo + organización
npm run dev                 # API en http://localhost:4000  ·  Swagger en /api/docs

# 3. Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # SPA en http://localhost:5173
```

### Vincular el bot de WhatsApp
Al arrancar el backend, Baileys imprime un **QR en la consola**. Escanéalo desde
*WhatsApp → Dispositivos vinculados*. La sesión se guarda en `backend/auth_info_baileys/`
(ignorado por git). Sin vincular, el bot queda en `disconnected / awaiting scan` y el
resto de la API funciona igual.

---

## 3. Credenciales demo (tras `prisma:seed`)

| Campo | Valor |
|---|---|
| Teléfono maestro | `595981123456` |
| OTP (mock, fijo) | `123456` |
| PIN Zero-Knowledge | `8492` |

Panel: `http://localhost:5173/login` · Ficha pública: `http://localhost:5173/e/<emergencyToken>`
(el token se imprime en el log del seed).

---

## 4. Flujos clave

### Doble capa de acceso
- **Modo emergencia** (`/e/:token`, sin PIN): foto, nombre, RH, dirección, botón "Llamar a familiar"
  (Twilio Voice), íconos de riesgo y alérgenos / medicación contraindicada. Cada visita registra
  un `ScanAuditLog` y notifica al titular por WhatsApp.
- **Modo consulta** (con PIN): descifra `encryptedMedicalBlob` en el cliente → ficha unificada +
  estudios en la nube.

### Onboarding por WhatsApp (8 pasos) y cobranzas
Ver **[docs/BOT-STATE-MACHINE.md](docs/BOT-STATE-MACHINE.md)** — diagrama de estados del bot +
escalera de notificaciones del CRON (día −5 / 0 / +3 / +4 cancela / +30 purga GDPR).

### Modelo de datos
Ver **[docs/ER-DIAGRAM.md](docs/ER-DIAGRAM.md)** — 8 entidades, reglas de cifrado y cascadas de borrado.

---

## 5. API REST (resumen)

`Base: http://localhost:4000/api` · documentación navegable: **`/api/docs`** (Swagger)

| Método | Ruta | Auth | Rate limit | Descripción |
|---|---|---|---|---|
| POST | `/auth/request-otp` | — | 4/10min por teléfono | Genera OTP de 6 dígitos y lo envía por WhatsApp (Baileys). Si el bot está offline, queda en el log; en dev se devuelve en `devOtp` |
| POST | `/auth/verify-login` | — | 10/15min | Verifica OTP (un solo uso, TTL 5 min, máx 5 intentos) + PIN → JWT |
| GET | `/auth/profile` | JWT | — | Perfil del titular |
| GET | `/emergency/:token` | — | 60/5min | Ficha pública (+ audit log + alerta WhatsApp **y push**) |
| POST | `/emergency/:token/consultation` | — | 60/5min | Desbloquea modo consulta con PIN |
| POST | `/emergency/:token/call-contact` | — | 60/5min | Llamada al contacto primario (Twilio — mock por ahora) |
| GET | `/medical/studies` | JWT | — | Lista de estudios del titular |
| POST | `/medical/studies/upload` | JWT | — | Sube estudio (OCR + IA clasifica) |
| PUT | `/medical/profile` | JWT | — | Actualiza datos de emergencia |
| POST | `/payments/create-order` | — | — | Genera orden (Alias / PIX / link / QR) |
| POST | `/payments/webhook` | `X-Webhook-Secret` | — | Confirmación de pasarela → activa el QR. Rechaza (401) sin el secreto |
| GET | `/payments/methods` | — | — | Métodos por país (PY / BR) |
| POST | `/export/full-vault` | JWT | — | Empaqueta todo en ZIP cifrado con el PIN |
| GET | `/export/download/:filename` | — | — | Descarga el ZIP (link expira en 24 h) |
| GET | `/stickers/:token/pdf` | — | — | PDF del sticker 3×3 cm con sangrado + co-branding |
| GET | `/stickers/:token/png` | — | — | PNG del QR |
| POST | `/stickers/co-branding` | JWT | — | Sube logo de la empresa/club |
| GET | `/push/vapid-public-key` | — | — | Clave pública VAPID `{ enabled, publicKey }` |
| POST | `/push/subscribe` | opcional | — | Registra la suscripción del navegador (anónima o ligada al usuario) |
| POST | `/push/unsubscribe` | — | — | Elimina una suscripción por `endpoint` |
| POST | `/push/test` | JWT | — | Notificación de prueba a los dispositivos del usuario |
| GET | `/bot/status` | — | — | Estado de Baileys + **QR de vinculación** (data URL) |
| POST | `/bot/reconnect` | — | — | Fuerza un nuevo intento tras agotar reintentos |
| POST | `/bot/simulate-message` | — | — | Inyecta un mensaje al bot (simulador web) |
| POST | `/bot/run-cron` | — | — | Dispara `runSubscriptionCheck()` manualmente |

---

## 5b. Notificaciones y acceso

### OTP de acceso por WhatsApp
El login es **teléfono → OTP → PIN**. El código de 6 dígitos se genera aleatorio,
se guarda **hasheado (bcrypt)** con TTL de 5 minutos, un solo uso y máximo 5 intentos,
y se entrega por el mismo bot de Baileys (`OtpService`). Si el bot no está vinculado,
el código se escribe en el log del servidor y —solo en `NODE_ENV=development` con
`OTP_DEV_ECHO=true`— se devuelve en el campo `devOtp` para poder probar.

### Vincular el bot
Pantalla **`/bot-connect`**: muestra el QR real de Baileys (`GET /api/bot/status`),
lo refresca solo y detecta la conexión. Si el cliente agota los reintentos
(`WHATSAPP_MAX_RECONNECT`, def. 8) hay un botón que llama a `POST /api/bot/reconnect`.

### Web Push (VAPID)
El titular activa las notificaciones desde el panel (`PushOptIn` en el Dashboard).
El navegador registra `/sw.js` y crea una `PushSubscription` que se guarda en
`PushSubscription` (ligada al usuario). En cada escaneo de emergencia,
`EmergencyService` dispara **en paralelo**: mensaje de WhatsApp + `PushService.sendEmergencyAlert`
(urgencia alta, `requireInteraction`). Las suscripciones muertas (404/410) se purgan solas.

Generar claves: `npx web-push generate-vapid-keys` → `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` en `.env`.
Sin claves, `/push/*` responde `enabled:false` y la tarjeta de opt-in lo indica.

> Push necesita un contexto seguro: `http://localhost` sirve para desarrollo; en
> producción, HTTPS obligatorio.

## 6. Seguridad y cumplimiento

- **Zero-Knowledge**: `medical_data` cifrado **AES-256-GCM**, clave = PBKDF2(PIN + Salt).
  El servidor almacena solo `pinHash` (verificación) y `encryptionSalt`. Ningún administrador
  puede descifrar sin el PIN del usuario.
- **Logs de auditoría forense**: cada escaneo registra fecha, IP geolocalizada y si fue con/sin PIN.
- **Portabilidad de datos**: botón "Descargar Historial Completo" → ZIP protegido con contraseña
  (el PIN), link con expiración de 24 h.
- **Derecho al olvido (GDPR/LGPD)**: purga física en cascada a los 30 días de la cancelación.

### Variables sensibles (`backend/.env`)
`DATABASE_URL`, `JWT_SECRET`, `TWILIO_*`, `OPENAI_API_KEY` / `GEMINI_API_KEY`, `S3_*`,
`MERCADOPAGO_ACCESS_TOKEN`, claves PIX/Alias. Nunca se comitean (`.gitignore`).

---

## 7. Scripts

| Backend (`backend/`) | |
|---|---|
| `npm run dev` | API con recarga (tsx watch) |
| `npm run build` / `npm start` | Compila a `dist/` y ejecuta |
| `npm run prisma:migrate` | Migraciones de desarrollo |
| `npm run prisma:seed` | Datos demo |

| Frontend (`frontend/`) | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + build de producción |
| `npm run preview` | Sirve el build |
