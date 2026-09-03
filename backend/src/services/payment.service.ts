import { prisma } from '../database/prisma';
import { config } from '../config';
import { QrPdfService } from './qr-pdf.service';
import { whatsappBot } from '../whatsapp/baileys.client';
import { v4 as uuidv4 } from 'uuid';

export interface CreateOrderParams {
  userId: string;
  plan: 'MONTHLY' | 'ANNUAL';
  country: 'PARAGUAY' | 'BRASIL';
  paymentMethod?: string;
  isFine?: boolean;
}

export class PaymentService {
  /**
   * Creates a payment order customized for Paraguay or Brasil
   */
  public static async createPaymentOrder(params: CreateOrderParams) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: { organization: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isPY = params.country === 'PARAGUAY';
    const currency = isPY ? 'PYG' : 'BRL';
    let baseAmount = isPY
      ? (params.plan === 'ANNUAL' ? config.payments.planPrices.PY.ANNUAL : config.payments.planPrices.PY.MONTHLY)
      : (params.plan === 'ANNUAL' ? config.payments.planPrices.BR.ANNUAL : config.payments.planPrices.BR.MONTHLY);

    if (params.isFine) {
      baseAmount += isPY ? config.payments.planPrices.PY.FINE : config.payments.planPrices.BR.FINE;
    }

    const referenceCode = `BIO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Generate Subscription record
    const expiryDays = params.plan === 'ANNUAL' ? 365 : 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: params.plan,
        country: isPY ? 'PARAGUAY' : 'BRASIL',
        currency,
        amount: baseAmount,
        status: 'PENDING_PAYMENT',
        expiryDate,
        finePending: !!params.isFine,
        fineAmount: params.isFine ? (isPY ? config.payments.planPrices.PY.FINE : config.payments.planPrices.BR.FINE) : 0,
      },
    });

    // Generate payment details
    let aliasInfo: string | undefined;
    let pixPayload: string | undefined;
    const paymentLink = `${config.frontendUrl}/checkout?ref=${referenceCode}`;

    if (isPY) {
      aliasInfo = `BANCO: ${config.payments.paraguayBank}\nALIAS SIPAP: ${config.payments.paraguayAlias}\nBILLETERA TIGO MONEY: ${config.payments.paraguayTigoWallet}\nTITULAR: DOORWAY CORTEX BIO-PASS PY\nREF: ${referenceCode}`;
    } else {
      pixPayload = `00020126580014BR.GOV.BCB.PIX0136${config.payments.brasilPixKey}520400005303986540${baseAmount}.005802BR5925DOORWAY CORTEX BIOPASS6009SAO PAULO62070503***6304`;
    }

    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        gateway: isPY ? 'MERCADOPAGO' : 'PIX',
        paymentMethod: isPY ? 'ALIAS / TRANSFERENCIA / LINK' : 'PIX / LINK',
        referenceCode,
        amount: baseAmount,
        currency,
        status: 'PENDING',
        aliasInfo,
        pixPayload,
        paymentLink,
      },
    });

    return {
      orderId: paymentOrder.id,
      referenceCode,
      amount: baseAmount,
      currency,
      formattedAmount: isPY ? `Gs. ${baseAmount.toLocaleString('es-PY')}` : `R$ ${baseAmount.toFixed(2)}`,
      paymentLink,
      aliasInfo,
      pixPayload,
      pixKey: config.payments.brasilPixKey,
    };
  }

  /**
   * Webhook handler confirming payment -> Activates account, generates QR & Sticker PDF and dispatches via WhatsApp
   */
  public static async handlePaymentSuccess(referenceCode: string): Promise<boolean> {
    console.log(`💳 Processing Payment Success Webhook for Ref: ${referenceCode}`);

    const order = await prisma.paymentOrder.findUnique({
      where: { referenceCode },
      include: {
        user: {
          include: { organization: true },
        },
        subscription: true,
      },
    });

    if (!order || order.status === 'PAID') {
      return false;
    }

    // Update order status
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Update subscription status
    if (order.subscriptionId) {
      await prisma.subscription.update({
        where: { id: order.subscriptionId },
        data: {
          status: 'ACTIVE',
          finePending: false,
        },
      });
    }

    // Activate User
    const updatedUser = await prisma.user.update({
      where: { id: order.userId },
      data: {
        status: 'ACTIVE',
        onboardingState: 'ACTIVE_MEMBER',
      },
    });

    // Generate Sticker PDF
    const sticker = await QrPdfService.generateStickerPdf({
      emergencyToken: updatedUser.emergencyToken,
      userName: updatedUser.fullName || 'Usuario Bio-Pass',
      bloodType: updatedUser.bloodType || 'RH Registrado',
      organizationName: order.user.organization?.name,
    });

    const emergencyUrl = `${config.publicEmergencyBaseUrl}/${updatedUser.emergencyToken}`;

    // Dispatch WhatsApp confirmation + Sticker PDF
    const welcomeMsg = `🎉 *¡PAGO CONFIRMADO Y SERVICIO ACTIVADO!*\n\n` +
      `Bienvenido a *Doorway Cortex Bio-Pass*, ${updatedUser.fullName || ''}.\n\n` +
      `✅ Tu código de emergencia ya está activo en la red global.\n` +
      `🌐 *Tu enlace público:* ${emergencyUrl}\n\n` +
      `📄 *Descarga tu Kit de Stickers (3x3 cm):*\n${sticker.fileUrl}\n\n` +
      `💡 *Recomendaciones de impresión:*\n` +
      `• Imprime el PDF en *papel Contact (vinilo adhesivo laminado resistente al agua)*.\n` +
      `• Pega un sticker en la parte trasera de tu celular 📱, en tu casco de seguridad 👷, o en tu billetera/carnet 💼.\n\n` +
      `⚙️ *Menú Principal Bio-Pass:*\n` +
      `Envía:\n` +
      `*[1]* Para subir un nuevo estudio médico (Foto/PDF)\n` +
      `*[2]* Para actualizar tu perfil de emergencia\n` +
      `*[3]* Para volver a descargar tu QR y Stickers\n` +
      `*[4]* Para contactar a soporte técnico`;

    await whatsappBot.sendMessage(updatedUser.phoneNumber, welcomeMsg);

    return true;
  }
}
