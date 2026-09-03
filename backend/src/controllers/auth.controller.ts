import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { generateToken, AuthenticatedRequest } from '../security/jwt';
import { ZeroKnowledgeSecurity } from '../security/zero-knowledge';
import { OtpService } from '../services/otp.service';

export class AuthController {
  /**
   * Request a one-time code. Delivered over WhatsApp via Baileys; if the bot is
   * offline the code is logged server-side and (in development) echoed in the response.
   */
  public static async requestOtp(req: Request, res: Response): Promise<void> {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ error: 'Phone number is required' });
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const user = await prisma.user.findUnique({ where: { phoneNumber: cleanPhone } });

    // Do not reveal whether the number is registered — always behave the same.
    const dispatch = await OtpService.createAndSend(cleanPhone, 'LOGIN');

    res.json({
      success: true,
      channel: dispatch.channel,
      message:
        dispatch.channel === 'whatsapp'
          ? `Te enviamos un código por WhatsApp al ${cleanPhone}.`
          : `Código generado para ${cleanPhone} (el bot de WhatsApp no está vinculado; revisá el log del servidor).`,
      expiresAt: dispatch.expiresAt,
      registered: !!user,
      devOtp: dispatch.devCode, // undefined unless OTP_DEV_ECHO=true && NODE_ENV=development
    });
  }

  /**
   * Verify OTP + PIN and authenticate user session
   */
  public static async verifyLogin(req: Request, res: Response): Promise<void> {
    const { phoneNumber, otp, pin } = req.body;
    const cleanPhone = (phoneNumber || '').replace(/[^0-9]/g, '');

    if (!cleanPhone || !otp) {
      res.status(400).json({ error: 'Phone number and OTP are required' });
      return;
    }

    const otpResult = await OtpService.verify(cleanPhone, otp, 'LOGIN');
    if (!otpResult.ok) {
      res.status(401).json({ error: otpResult.reason || 'Código OTP inválido' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber: cleanPhone },
      include: {
        emergencyContacts: true,
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found. Please register via WhatsApp first.' });
      return;
    }

    // PIN is mandatory once the user has set one (they always do, at onboarding step 7)
    if (user.pinHash) {
      if (!pin) {
        res.status(400).json({ error: 'Se requiere tu PIN de seguridad' });
        return;
      }
      const isPinValid = await ZeroKnowledgeSecurity.verifyPin(pin, user.pinHash);
      if (!isPinValid) {
        res.status(401).json({ error: 'PIN de seguridad incorrecto' });
        return;
      }
    }

    const token = generateToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      status: user.status,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        ciNumber: user.ciNumber,
        bloodType: user.bloodType,
        emergencyConditions: user.emergencyConditions,
        severeAllergies: user.severeAllergies,
        contraindicatedMeds: user.contraindicatedMeds,
        address: user.address,
        email: user.email,
        status: user.status,
        emergencyToken: user.emergencyToken,
        encryptionSalt: user.encryptionSalt,
      },
    });
  }

  /**
   * Get current authenticated user profile
   */
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        emergencyContacts: true,
        subscriptions: { orderBy: { createdAt: 'desc' } },
        organization: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  }
}
