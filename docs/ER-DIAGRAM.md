# Doorway Cortex Bio-Pass — Modelo Entidad-Relación

Base: **PostgreSQL** vía Prisma ORM (`backend/prisma/schema.prisma`).
Imágenes y estudios (`fileUrl`) viven en **S3 / MinIO**, nunca en la base.

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "agrupa (co-branding)"
    USER ||--o{ EMERGENCY_CONTACT : "tiene"
    USER ||--o{ MEDICAL_STUDY : "posee"
    USER ||--o{ SUBSCRIPTION : "contrata"
    USER ||--o{ PAYMENT_ORDER : "genera"
    USER ||--o{ SCAN_AUDIT_LOG : "registra"
    SUBSCRIPTION ||--o{ PAYMENT_ORDER : "se cobra con"

    USER {
        uuid   id PK
        string phoneNumber UK "Usuario Maestro (validado por OTP)"
        enum   language "ES | GN"
        string fullName
        string ciNumber
        string ciFrontUrl "S3"
        string ciBackUrl "S3"
        string bloodType "RH factor, ej O+"
        string emergencyConditions "JSON: [Diabetes, Epilepsia...]"
        string severeAllergies
        string contraindicatedMeds
        string address
        string email
        string photoUrl "S3"
        string pinHash "hash verificación PIN 4 dígitos"
        string encryptionSalt "salt PBKDF2 (cliente)"
        string encryptedMedicalBlob "AES-256-GCM, historial privado"
        uuid   emergencyToken UK "URL pública /e/:token"
        string onboardingState "máquina de estados del bot"
        string onboardingData "buffer JSON temporal del registro"
        enum   status "PENDING_PAYMENT|ACTIVE|EXPIRED|CANCELLED|PURGED"
        uuid   organizationId FK
        datetime createdAt
        datetime updatedAt
    }

    EMERGENCY_CONTACT {
        uuid   id PK
        uuid   userId FK
        string fullName
        string phoneNumber
        string relationship "Madre, Esposa..."
        bool   isPrimary
        datetime createdAt
        datetime updatedAt
    }

    MEDICAL_STUDY {
        uuid   id PK
        uuid   userId FK
        string title
        enum   studyType "LABORATORY|XRAY|TOMOGRAPHY|PRESCRIPTION|CARDIOLOGY|OTHER"
        datetime studyDate
        string fileUrl "S3 (imagen/PDF del estudio)"
        text   ocrRawText "texto extraído por OCR"
        text   aiSummary "resumen GPT-4-Vision / Gemini"
        text   encryptedMetadata "anotaciones zero-knowledge"
        datetime createdAt
        datetime updatedAt
    }

    SUBSCRIPTION {
        uuid   id PK
        uuid   userId FK
        enum   plan "MONTHLY | ANNUAL"
        enum   country "PARAGUAY | BRASIL | OTHER"
        string currency "PYG | BRL | USD"
        float  amount
        enum   status
        datetime startDate
        datetime expiryDate "revisado por el CRON diario"
        enum   lastNotification "NONE|D_MINUS_5|D_0|D_PLUS_3|D_PLUS_4_CANCELLED|PURGED"
        bool   finePending
        float  fineAmount "Gs. 50.000 / R$ 44"
        datetime createdAt
        datetime updatedAt
    }

    PAYMENT_ORDER {
        uuid   id PK
        uuid   userId FK
        uuid   subscriptionId FK
        enum   gateway "MERCADOPAGO|TIGO_MONEY|PIX|BANK_TRANSFER"
        string paymentMethod "ALIAS|PIX|LINK|QR|CARD"
        string referenceCode UK
        text   pixPayload "PIX copia-e-cola (Brasil)"
        string aliasInfo "Alias SIPAP (Paraguay)"
        string paymentLink
        float  amount
        string currency
        enum   status "PENDING|PAID|EXPIRED|FAILED"
        datetime paidAt
        datetime createdAt
        datetime updatedAt
    }

    SCAN_AUDIT_LOG {
        uuid   id PK
        uuid   userId FK
        datetime scannedAt
        string ipAddress
        string userAgent
        enum   mode "EMERGENCY_NO_PIN | CONSULTATION_PIN"
        string city
        string country
        float  lat
        float  lng
        bool   alertSentViaWhatsApp "push de alerta al titular"
    }

    ORGANIZATION {
        uuid   id PK
        string name
        string slug UK
        string logoUrl "escudo/logo impreso junto al QR"
        string primaryColor "#E11D48"
        string customMessage
        datetime createdAt
        datetime updatedAt
    }
```

## Notas de diseño

| Regla | Implementación |
|---|---|
| **Zero-Knowledge** | `encryptedMedicalBlob` y `MedicalStudy.encryptedMetadata` van cifrados AES-256-GCM con clave derivada de `PIN + encryptionSalt` en el cliente. El servidor guarda solo `pinHash` (verificación) y el `salt`. |
| **Purga GDPR/LGPD (día +30)** | Borrado físico en cascada: `onDelete: Cascade` en `EMERGENCY_CONTACT`, `MEDICAL_STUDY`, `SUBSCRIPTION`, `PAYMENT_ORDER`, `SCAN_AUDIT_LOG` al eliminar el `USER`; los objetos S3 se borran por el `ExportService` / job de purga. |
| **Identidad = teléfono** | `USER.phoneNumber @unique`; sin usuario/contraseña. Login = OTP + PIN. |
| **QR público** | `USER.emergencyToken @unique` → `https://bio-pass.com/e/{token}`. |
| **Cobranza escalonada** | `SUBSCRIPTION.expiryDate` + `lastNotification` mueven la notificación por el CRON (ver `docs/BOT-STATE-MACHINE.md`). |
