# Doorway Cortex Bio-Pass — Máquina de Estados del Bot de WhatsApp

Motor: **Baileys** (`@whiskeysockets/baileys`) → `backend/src/whatsapp/baileys.client.ts`
Dispatcher: `backend/src/whatsapp/bot-state-machine.ts` (`BotStateMachine.handleMessage`)
NLP: `backend/src/whatsapp/nlp-handler.ts`

El estado por usuario se persiste en `User.onboardingState` (+ buffer `User.onboardingData`).
Comando global `REINICIAR` → vuelve a `STEP1_WELCOME`.

## 1. Flujo conversacional (onboarding 100% self-service + menú activo)

```mermaid
stateDiagram-v2
    [*] --> UNREGISTERED

    UNREGISTERED --> STEP1_WELCOME : primer mensaje (se crea el User)
    note right of STEP1_WELCOME
        Bienvenida + elección de idioma
        [1] Español   [2] Guaraní
        "El registro dura menos de 3 minutos"
    end note

    STEP1_WELCOME --> STEP2_DOCUMENT : idioma elegido
    STEP2_DOCUMENT --> STEP2_CONFIRM_CI : foto de CI (OCR) o "Nombre, CI" manual
    STEP2_CONFIRM_CI --> STEP3_CONTACT : [1] datos correctos
    STEP2_CONFIRM_CI --> STEP2_DOCUMENT : [2] corregir

    STEP3_CONTACT --> STEP4_ADDRESS : "Nombre, Teléfono, Parentesco" (crea EmergencyContact)
    STEP4_ADDRESS --> STEP5_EMAIL : dirección exacta
    STEP5_EMAIL --> STEP6_CONDITIONS : correo electrónico
    STEP6_CONDITIONS --> STEP7_PIN : condiciones [1-5] + alergias severas
    note right of STEP7_PIN
        PIN de 4 dígitos → deriva salt + pinHash
        Genera encryptedMedicalBlob (AES-256-GCM)
        Zero-Knowledge: el servidor nunca ve el PIN
    end note

    STEP7_PIN --> STEP8_PAYMENT : PIN válido (\\d{4})
    STEP8_PAYMENT --> AWAITING_PAYMENT_CONFIRMATION : elige plan [1-4]\n(PaymentService.createPaymentOrder)

    AWAITING_PAYMENT_CONFIRMATION --> ACTIVE_MEMBER : webhook de pago OK\n(PaymentService.handlePaymentSuccess)
    note right of AWAITING_PAYMENT_CONFIRMATION
        Hasta confirmar el pago NO se genera el QR.
        Al confirmar: status=ACTIVE, se emite QR +
        PDF de stickers 3x3 cm al chat.
    end note

    ACTIVE_MEMBER --> ACTIVE_MEMBER : [1] subir estudio (OCR+IA) /\n[2] modificar datos (NLP) /\n[3] descargar QR+Kit /\n[4] soporte

    state "EXPIRED / CANCELLED" as DUNNING
    ACTIVE_MEMBER --> DUNNING : CRON marca vencimiento
    DUNNING --> ACTIVE_MEMBER : "PAGAR" (cuota, o cuota+multa si CANCELLED)
    DUNNING --> PURGED : día +30 sin pago
    PURGED --> [*] : datos eliminados físicamente (GDPR/LGPD)
```

### Ramas de entrada según `User.status` (cada mensaje entrante)

| Situación | Rama en `handleMessage` |
|---|---|
| No existe el número | crea `User`, responde bienvenida, `onboardingState = STEP1_WELCOME` |
| En onboarding | avanza por `STEPx_*` según `onboardingState` |
| `status = ACTIVE` | menú de miembro + procesado de media + NLP (`CHANGE_ALLERGY`, `CHANGE_CONTACT`, `CHANGE_ADDRESS`) |
| `status = EXPIRED` o `CANCELLED` | genera orden de renovación (con multa si `CANCELLED`), espera `PAGAR` |
| `status = PURGED` | mensaje genérico; requiere registro nuevo |

## 2. Ciclo de vida de la suscripción — CRON diario (08:00)

`backend/src/services/cron.service.ts` → `runSubscriptionCheck()` recorre las suscripciones
`ACTIVE | EXPIRED | CANCELLED` y calcula `diffDays = expiryDate - hoy`.

```mermaid
flowchart TD
    A[CRON 08:00 diario] --> B{diffDays vs expiryDate}
    B -->|"-5 < d <= 0 días<br/>lastNotification = NONE"| N5["WhatsApp: 'vence en 5 días'<br/>lastNotification = D_MINUS_5"]
    B -->|"d <= 0 (día de vencimiento)"| D0["WhatsApp: 'HOY vence'<br/>Subscription.status = EXPIRED<br/>User.status = EXPIRED<br/>lastNotification = D_0"]
    B -->|"d <= -3"| D3["WhatsApp: 'venció hace 3 días'<br/>lastNotification = D_PLUS_3"]
    B -->|"d <= -4"| D4["WhatsApp: 'CANCELADO por falta de pago'<br/>status = CANCELLED · finePending = true<br/>fineAmount = Gs 50.000 / R$ 44<br/>lastNotification = D_PLUS_4_CANCELLED"]
    B -->|"d <= -30 y status = CANCELLED"| P["PURGA FÍSICA (GDPR/LGPD):<br/>StorageService.purgeUserData()<br/>deleteMany: auditLog, studies, contacts, orders, subs<br/>User → status = PURGED, campos sensibles a null<br/>WhatsApp: 'Tus datos han sido desechados'"]

    N5 --> Z[fin del ciclo]
    D0 --> Z
    D3 --> Z
    D4 --> Z
    P --> Z
```

`lastNotification` (enum `NotificationStage`) es el candado de idempotencia: cada etapa se
envía una sola vez aunque el CRON corra a diario.

## 3. Alerta de escaneo (fuera del flujo conversacional)

Cada `GET /api/emergency/:token` (modo emergencia, sin PIN) inserta un `ScanAuditLog`
(IP geolocalizada con `geoip-lite`, `mode = EMERGENCY_NO_PIN`) y dispara un push por
WhatsApp al titular:

> ⚠️ Tu código fue escaneado hoy a las HH:MM en \[ciudad/país aprox. por IP\]. Si no fuiste tú, contacta a soporte.
