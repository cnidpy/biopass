import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  WASocket,
  proto,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { config } from '../config';
import { BotStateMachine } from './bot-state-machine';

export class BaileysClient {
  private sock: WASocket | null = null;
  private qrCodeDataUrl: string | null = null;
  private qrRaw: string | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts = 0;
  private lastError: string | null = null;
  private gaveUp = false;

  public async start(): Promise<void> {
    if (this.isConnecting || this.isConnected) return;
    this.isConnecting = true;
    this.gaveUp = false;

    try {
      const authDir = config.baileys.authDir;
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      // Baileys' internal logger. Default 'silent' — it floods "failed to decrypt message"
      // for history-sync artifacts that don't affect inbound handling. Our own
      // connection.update logging below is independent. Set WHATSAPP_LOG_LEVEL=warn to debug.
      const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || 'silent' });

      // Announce the CURRENT WhatsApp Web protocol version — WhatsApp servers
      // terminate connections that claim an outdated version ("Connection Terminated by Server").
      let version: [number, number, number] | undefined;
      try {
        const res = await fetchLatestBaileysVersion();
        version = res.version;
        console.log(`📲 [WHATSAPP BOT] Using WA Web version ${version.join('.')}${res.isLatest ? ' (latest)' : ''}`);
      } catch (e: any) {
        console.warn('⚠️ [WHATSAPP BOT] Could not fetch latest WA version, using bundled default:', e?.message);
      }

      this.sock = makeWASocket({
        version,
        auth: state,
        logger,
        browser: Browsers.ubuntu('Chrome'),
        qrTimeout: 60_000,
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 15_000,
        markOnlineOnConnect: false,
        syncFullHistory: false,
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          const firstOfSession = !this.qrRaw;
          this.qrRaw = qr;
          this.qrCodeDataUrl = await QRCode.toDataURL(qr);
          if (firstOfSession) {
            console.log('📲 [WHATSAPP BOT] Pairing QR ready — open /bot-connect in the web app or GET /api/bot/status. (auto-refreshes until scanned)');
          }
        }

        if (connection === 'close') {
          const err = lastDisconnect?.error as any;
          const statusCode = err?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;
          this.lastError = `${err?.message || 'close'} [${statusCode ?? 'unknown'}]`;
          console.warn(
            `⚠️ [WHATSAPP BOT] close · status=${statusCode} · msg="${err?.message}" · data=${JSON.stringify(err?.data || err?.output?.payload || {})}`
          );
          this.isConnected = false;
          this.isConnecting = false;

          if (loggedOut) {
            console.warn('⚠️ [WHATSAPP BOT] Logged out. Clearing session — re-pair from /bot-connect.');
            try { fs.rmSync(authDir, { recursive: true, force: true }); } catch { /* noop */ }
            this.reconnectAttempts = 0;
            this.qrRaw = null;
            setTimeout(() => this.start(), 2_000);
            return;
          }

          // 515 (restartRequired) fires right after a successful QR scan — it's expected,
          // reconnect immediately and don't count it against the retry budget.
          if (statusCode === DisconnectReason.restartRequired) {
            console.log('🔄 [WHATSAPP BOT] Restart required after pairing — reconnecting…');
            setTimeout(() => this.start(), 1_000);
            return;
          }

          // 428 = WhatsApp rate-limited this number for too many linked-device attempts.
          // Hammering it makes the throttle worse — back off hard and stop after a couple tries.
          if (statusCode === 428) {
            this.reconnectAttempts += 1;
            if (this.reconnectAttempts >= 3) {
              this.gaveUp = true;
              console.warn(
                '⚠️ [WHATSAPP BOT] WhatsApp está limitando este número (428). ' +
                  'Esperá 20-30 min, cerrá dispositivos vinculados viejos, y luego POST /api/bot/reconnect.'
              );
              return;
            }
            console.warn(`⚠️ [WHATSAPP BOT] Rate-limited (428). Retry ${this.reconnectAttempts}/3 in 5 min.`);
            setTimeout(() => this.start(), 5 * 60_000);
            return;
          }

          this.reconnectAttempts += 1;
          if (this.reconnectAttempts > config.whatsappMaxReconnect) {
            this.gaveUp = true;
            console.warn(
              `⚠️ [WHATSAPP BOT] Gave up after ${this.reconnectAttempts} reconnect attempts. ` +
                `Call POST /api/bot/reconnect (or restart) to retry.`
            );
            return;
          }
          const delay = Math.min(30_000, 3_000 * this.reconnectAttempts);
          console.warn(`⚠️ [WHATSAPP BOT] Connection closed (${this.lastError}). Retry ${this.reconnectAttempts}/${config.whatsappMaxReconnect} in ${delay / 1000}s.`);
          setTimeout(() => this.start(), delay);
        } else if (connection === 'open') {
          console.log('✅ [WHATSAPP BOT] Connected to WhatsApp via Baileys.');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.lastError = null;
          this.qrCodeDataUrl = null;
          this.qrRaw = null;
        }
      });

      // Handle inbound messages — 1:1 DMs only
      this.sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
          if (!msg.key || msg.key.fromMe) continue;
          const jid = msg.key.remoteJid || '';
          // Ignore groups, channels/newsletters, broadcast lists and status updates
          if (!jid.endsWith('@s.whatsapp.net')) continue;
          await this.processIncomingMessage(msg);
        }
      });
    } catch (err) {
      console.error('❌ [WHATSAPP BOT] Error initializing Baileys socket:', err);
      this.isConnecting = false;
    }
  }

  private async processIncomingMessage(msg: proto.IWebMessageInfo): Promise<void> {
    const remoteJid = msg.key.remoteJid || '';
    // remoteJid here is always "<phone>@s.whatsapp.net" (filtered in messages.upsert)
    const rawPhone = remoteJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

    // Sanity: a real MSISDN is 7-15 digits. Anything else = LID / channel artifact → ignore.
    if (!/^\d{7,15}$/.test(rawPhone)) {
      console.warn(`[WHATSAPP BOT] Ignoring message from non-phone JID: ${remoteJid}`);
      return;
    }

    // Extract text
    const body =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      '';

    let mediaBuffer: Buffer | undefined;
    let mediaMimeType: string | undefined;
    let mediaFilename: string | undefined;

    // Check for image or document media
    if (msg.message?.imageMessage) {
      try {
        mediaBuffer = (await downloadMediaMessage(
          msg,
          'buffer',
          {},
          {
            logger: pino({ level: 'silent' }),
            reuploadRequest: this.sock!.updateMediaMessage,
          }
        )) as Buffer;
        mediaMimeType = msg.message.imageMessage.mimetype || 'image/jpeg';
        mediaFilename = `wa_img_${Date.now()}.jpg`;
      } catch (e) {
        console.warn('Could not download image media buffer from Baileys:', e);
      }
    } else if (msg.message?.documentMessage) {
      try {
        mediaBuffer = (await downloadMediaMessage(
          msg,
          'buffer',
          {},
          {
            logger: pino({ level: 'silent' }),
            reuploadRequest: this.sock!.updateMediaMessage,
          }
        )) as Buffer;
        mediaMimeType = msg.message.documentMessage.mimetype || 'application/pdf';
        mediaFilename = msg.message.documentMessage.fileName || `doc_${Date.now()}.pdf`;
      } catch (e) {
        console.warn('Could not download document media buffer from Baileys:', e);
      }
    }

    try {
      const response = await BotStateMachine.handleMessage({
        from: rawPhone,
        body,
        mediaBuffer,
        mediaMimeType,
        mediaFilename,
      });

      await this.sendMessage(rawPhone, response.replyText);

      if (response.mediaAttachment) {
        await this.sendDocument(
          rawPhone,
          response.mediaAttachment.buffer,
          response.mediaAttachment.filename,
          response.mediaAttachment.mimetype,
          response.mediaAttachment.caption
        );
      }
    } catch (err: any) {
      console.error(`Error processing message from ${rawPhone}:`, err);
    }
  }

  /**
   * Sends a plain text WhatsApp message
   */
  public async sendMessage(toPhone: string, text: string): Promise<boolean> {
    const cleanPhone = (toPhone || '').replace(/[^0-9]/g, '');
    if (!/^\d{7,15}$/.test(cleanPhone)) {
      console.warn(`[WHATSAPP BOT] Refusing to send to invalid number "${toPhone}"`);
      return false;
    }
    const jid = `${cleanPhone}@s.whatsapp.net`;

    console.log(`\n📨 [WHATSAPP OUTBOUND -> ${cleanPhone}]:\n${text}\n----------------------------------`);

    if (this.sock && this.isConnected) {
      try {
        await this.sock.sendMessage(jid, { text });
        return true;
      } catch (err) {
        console.error(`Failed to send real WhatsApp message to ${jid}:`, err);
        return false;
      }
    }

    return true; // Logged and handled
  }

  /**
   * Sends a document (like 3x3cm Sticker PDF or medical study)
   */
  public async sendDocument(
    toPhone: string,
    buffer: Buffer,
    fileName: string,
    mimetype = 'application/pdf',
    caption?: string
  ): Promise<boolean> {
    const cleanPhone = (toPhone || '').replace(/[^0-9]/g, '');
    if (!/^\d{7,15}$/.test(cleanPhone)) {
      console.warn(`[WHATSAPP BOT] Refusing to send document to invalid number "${toPhone}"`);
      return false;
    }
    const jid = `${cleanPhone}@s.whatsapp.net`;

    console.log(`📎 [WHATSAPP ATTACHMENT -> ${cleanPhone}]: Document ${fileName} (${buffer.length} bytes)`);

    if (this.sock && this.isConnected) {
      try {
        await this.sock.sendMessage(jid, {
          document: buffer,
          mimetype,
          fileName,
          caption,
        });
        return true;
      } catch (err) {
        console.error(`Failed to send document to ${jid}:`, err);
        return false;
      }
    }

    return true;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      qrCode: this.qrCodeDataUrl,
      reconnectAttempts: this.reconnectAttempts,
      gaveUp: this.gaveUp,
      lastError: this.lastError,
    };
  }

  /** Force a fresh connection attempt (used after the client has given up). */
  public async reconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    this.gaveUp = false;
    if (this.isConnected || this.isConnecting) return;
    await this.start();
  }
}

export const whatsappBot = new BaileysClient();
