import { Request, Response } from 'express';
import { whatsappBot } from '../whatsapp/baileys.client';
import { BotStateMachine } from '../whatsapp/bot-state-machine';
import { CronService } from '../services/cron.service';

export class BotController {
  public static async getBotStatus(req: Request, res: Response): Promise<void> {
    const status = whatsappBot.getStatus();
    res.json({
      success: true,
      service: 'Baileys WhatsApp Web Engine',
      ...status,
    });
  }

  /** Force a new pairing attempt after the client gave up reconnecting. */
  public static async reconnect(req: Request, res: Response): Promise<void> {
    await whatsappBot.reconnect();
    res.json({ success: true, ...whatsappBot.getStatus() });
  }

  /**
   * Interactive simulator endpoint: Test WhatsApp bot conversation directly via REST or UI!
   */
  public static async simulateMessage(req: Request, res: Response): Promise<void> {
    const { from, body } = req.body;
    if (!from || !body) {
      res.status(400).json({ error: 'from (phone) and body (message text) are required' });
      return;
    }

    try {
      const response = await BotStateMachine.handleMessage({
        from,
        body,
      });

      res.json({
        success: true,
        sentBy: from,
        reply: response.replyText,
        mediaAttachment: response.mediaAttachment ? {
          filename: response.mediaAttachment.filename,
          mimetype: response.mediaAttachment.mimetype,
        } : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error in bot state machine', details: err.message });
    }
  }

  /**
   * Trigger manual execution of subscription CRON job for testing
   */
  public static async triggerCronCheck(req: Request, res: Response): Promise<void> {
    try {
      const result = await CronService.runSubscriptionCheck();
      res.json({
        success: true,
        message: 'Subscription lifecycle CRON job executed successfully',
        result,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error running CRON job', details: err.message });
    }
  }
}
