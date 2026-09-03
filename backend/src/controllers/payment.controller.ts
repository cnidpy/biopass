import crypto from 'crypto';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../security/jwt';
import { PaymentService } from '../services/payment.service';
import { config } from '../config';

/** Constant-time comparison of the webhook shared secret. */
function webhookSecretValid(req: Request): boolean {
  const expected = config.paymentWebhookSecret;
  if (!expected) return config.env === 'development'; // no secret set -> only allowed in dev
  const provided = String(req.headers['x-webhook-secret'] || '');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export class PaymentController {
  public static async createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.userId || req.body.userId;
    const { plan, country, isFine } = req.body;

    if (!userId || !plan || !country) {
      res.status(400).json({ error: 'Faltan parámetros requeridos (userId, plan, country)' });
      return;
    }

    try {
      const order = await PaymentService.createPaymentOrder({
        userId,
        plan,
        country,
        isFine,
      });

      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: 'Error generando orden de pago', details: err.message });
    }
  }

  public static async webhook(req: Request, res: Response): Promise<void> {
    if (!webhookSecretValid(req)) {
      res.status(401).json({ error: 'Webhook no autorizado (X-Webhook-Secret inválido)' });
      return;
    }

    const { referenceCode } = req.body;
    if (!referenceCode) {
      res.status(400).json({ error: 'Reference code required' });
      return;
    }

    const success = await PaymentService.handlePaymentSuccess(referenceCode);
    if (!success) {
      res.status(404).json({ error: 'Orden no encontrada o ya procesada' });
      return;
    }

    res.json({ success: true, message: 'Pago acreditado y Bio-Pass activado' });
  }

  public static async getPaymentMethods(req: Request, res: Response): Promise<void> {
    res.json({
      paraguay: {
        currency: 'PYG',
        plans: {
          monthly: { name: 'Plan Mensual', amount: 35000, formatted: 'Gs. 35.000' },
          annual: { name: 'Plan Anual', amount: 300000, formatted: 'Gs. 300.000' },
          fine: { name: 'Multa de Reactivación', amount: 50000, formatted: 'Gs. 50.000' },
        },
        methods: ['SIPAP / Alias Bancario', 'Tigo Money', 'Bancard / QR', 'Tarjetas de Crédito y Débito'],
      },
      brasil: {
        currency: 'BRL',
        plans: {
          monthly: { name: 'Plano Mensal', amount: 25, formatted: 'R$ 25,00' },
          annual: { name: 'Plano Anual', amount: 220, formatted: 'R$ 220,00' },
          fine: { name: 'Multa de Reativação', amount: 44, formatted: 'R$ 44,00' },
        },
        methods: ['PIX Instantâneo', 'Cartão de Crédito / Débito', 'Boleto / Link'],
      },
    });
  }
}
