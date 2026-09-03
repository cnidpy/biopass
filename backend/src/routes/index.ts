import { Router } from 'express';
import multer from 'multer';
import { AuthController } from '../controllers/auth.controller';
import { EmergencyController } from '../controllers/emergency.controller';
import { MedicalController } from '../controllers/medical.controller';
import { PaymentController } from '../controllers/payment.controller';
import { ExportController } from '../controllers/export.controller';
import { StickerController } from '../controllers/sticker.controller';
import { BotController } from '../controllers/bot.controller';
import { PushController } from '../controllers/push.controller';
import { authMiddleware, optionalAuthMiddleware } from '../security/jwt';
import { authLimiter, otpRequestLimiter, emergencyLimiter } from '../security/rate-limit';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// Authentication (OTP via WhatsApp + PIN)
router.post('/auth/request-otp', otpRequestLimiter, authLimiter, AuthController.requestOtp);
router.post('/auth/verify-login', authLimiter, AuthController.verifyLogin);
router.get('/auth/profile', authMiddleware, AuthController.getProfile);

// Emergency & Rescuer Access (Public & Consultation Mode)
router.get('/emergency/:token', emergencyLimiter, EmergencyController.getEmergencyCard);
router.post('/emergency/:token/consultation', emergencyLimiter, EmergencyController.unlockConsultationMode);
router.post('/emergency/:token/call-contact', emergencyLimiter, EmergencyController.callEmergencyContact);

// Medical Vault & Studies
router.get('/medical/studies', authMiddleware, MedicalController.getStudies);
router.post('/medical/studies/upload', authMiddleware, upload.single('file'), MedicalController.uploadStudy);
router.put('/medical/profile', authMiddleware, MedicalController.updateProfile);

// Payments & Subscriptions
router.post('/payments/create-order', PaymentController.createOrder);
router.post('/payments/webhook', PaymentController.webhook);
router.get('/payments/methods', PaymentController.getPaymentMethods);

// Data Portability & Export (Encrypted ZIP with PIN)
router.post('/export/full-vault', authMiddleware, ExportController.createFullExport);
router.get('/export/download/:filename', ExportController.downloadExportFile);

// QR & Physical Stickers (3x3 cm PDF)
router.get('/stickers/:token/pdf', StickerController.downloadStickerPdf);
router.get('/stickers/:token/png', StickerController.getQrPng);
router.post('/stickers/co-branding', authMiddleware, upload.single('logo'), StickerController.updateCoBranding);

// Web Push notifications (VAPID)
router.get('/push/vapid-public-key', PushController.getVapidPublicKey);
router.post('/push/subscribe', optionalAuthMiddleware, PushController.subscribe);
router.post('/push/unsubscribe', PushController.unsubscribe);
router.post('/push/test', authMiddleware, PushController.test);

// WhatsApp Bot & Automation
router.get('/bot/status', BotController.getBotStatus);
router.post('/bot/reconnect', BotController.reconnect);
router.post('/bot/simulate-message', BotController.simulateMessage);
router.post('/bot/run-cron', BotController.triggerCronCheck);

export default router;
