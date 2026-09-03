import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  publicEmergencyBaseUrl: process.env.PUBLIC_EMERGENCY_BASE_URL || 'http://localhost:5173/e',
  
  jwtSecret: process.env.JWT_SECRET || 'biopass_cortex_super_secure_jwt_secret_2026_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  otp: {
    ttlMinutes: parseInt(process.env.OTP_TTL_MINUTES || '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
    devEcho: process.env.OTP_DEV_ECHO !== 'false',
  },

  push: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:soporte@bio-pass.com',
    get enabled() {
      return !!(this.vapidPublicKey && this.vapidPrivateKey);
    },
  },

  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
  whatsappMaxReconnect: parseInt(process.env.WHATSAPP_MAX_RECONNECT || '8', 10),

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'AC_mock',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'mock_token',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+15551234567',
  },
  
  baileys: {
    authDir: path.resolve(process.env.BAILEYS_AUTH_DIR || './auth_info_baileys'),
    botNumber: process.env.WHATSAPP_BOT_NUMBER || '595981000000',
  },
  
  storage: {
    useLocal: process.env.USE_LOCAL_STORAGE !== 'false',
    uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
    s3Endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    s3Bucket: process.env.S3_BUCKET_NAME || 'biopass-medical-vault',
  },
  
  payments: {
    paraguayAlias: process.env.PARAGUAY_BANK_ALIAS || 'BIOPASS.PY',
    paraguayBank: process.env.PARAGUAY_BANK_NAME || 'Banco Continental',
    paraguayTigoWallet: process.env.PARAGUAY_TIGO_MONEY_WALLET || '0981123456',
    brasilPixKey: process.env.BRASIL_PIX_KEY || 'financeiro@bio-pass.com',
    planPrices: {
      PY: {
        MONTHLY: 35000, // Gs. 35.000 / mes
        ANNUAL: 300000,  // Gs. 300.000 / año
        FINE: 50000,     // Gs. 50.000
      },
      BR: {
        MONTHLY: 25,     // R$ 25 / mes
        ANNUAL: 220,     // R$ 220 / año
        FINE: 44,        // R$ 44
      },
    },
  },
};
