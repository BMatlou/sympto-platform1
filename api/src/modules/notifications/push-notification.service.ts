import { Injectable } from '@nestjs/common';
import { createPrivateKey, createPublicKey, createSign, diffieHellman, generateKeyPairSync, randomBytes, createCipheriv, createHmac, KeyObject } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

type PushSubscriptionJson = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type PushDeliveryResult = {
  sent: number;
  invalidTokens: number;
};

const WEB_PUSH_PLATFORM = 'WEB_PUSH';

function base64Url(value: Buffer): string {
  return value.toString('base64url');
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

function hmacSha256(key: Buffer, data: Buffer): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  const blocks: Buffer<ArrayBufferLike>[] = [];
  let previous: Buffer<ArrayBufferLike> = Buffer.alloc(0);

  for (let counter = 1; Buffer.concat(blocks).length < length; counter += 1) {
    previous = hmacSha256(
      prk,
      Buffer.concat([
        previous,
        info,
        Buffer.from([counter]),
      ]),
    );
    blocks.push(previous);
  }

  return Buffer.concat(blocks).subarray(0, length);
}

function rawPublicKeyFromKey(key: KeyObject): Buffer {
  const jwk = key.export({ format: 'jwk' }) as JsonWebKey & {
    x: string;
    y: string;
  };

  return Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(jwk.x, 'base64url'),
    Buffer.from(jwk.y, 'base64url'),
  ]);
}

function clientPublicKeyFromRaw(raw: Buffer): KeyObject {
  const spkiPrefix = Buffer.from(
    '3059301306072a8648ce3d020106082a8648ce3d030107034200',
    'hex',
  );

  return createPublicKey({
    key: Buffer.concat([spkiPrefix, raw]),
    format: 'der',
    type: 'spki',
  });
}

function derLength(buffer: Buffer, offset: number): { length: number; next: number } {
  const first = buffer[offset];

  if (first < 0x80) {
    return { length: first, next: offset + 1 };
  }

  const count = first & 0x7f;
  let length = 0;
  for (let index = 0; index < count; index += 1) {
    length = (length << 8) | buffer[offset + 1 + index];
  }

  return {
    length,
    next: offset + 1 + count,
  };
}

function derSignatureToJose(signature: Buffer): Buffer {
  let offset = 0;
  if (signature[offset++] !== 0x30) {
    throw new Error('Invalid VAPID signature.');
  }

  const sequence = derLength(signature, offset);
  offset = sequence.next;

  if (signature[offset++] !== 0x02) {
    throw new Error('Invalid VAPID signature R value.');
  }

  const rInfo = derLength(signature, offset);
  offset = rInfo.next;
  const r = signature.subarray(offset, offset + rInfo.length);
  offset += rInfo.length;

  if (signature[offset++] !== 0x02) {
    throw new Error('Invalid VAPID signature S value.');
  }

  const sInfo = derLength(signature, offset);
  offset = sInfo.next;
  const s = signature.subarray(offset, offset + sInfo.length);

  const normalise = (value: Buffer) => {
    let current = value;
    while (current.length > 32 && current[0] === 0) {
      current = current.subarray(1);
    }
    if (current.length > 32) {
      throw new Error('Invalid VAPID signature component length.');
    }
    return Buffer.concat([Buffer.alloc(32 - current.length), current]);
  };

  return Buffer.concat([normalise(r), normalise(s)]);
}

@Injectable()
export class PushNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  getPublicKey(): string {
    const privateKey = this.getPrivateKey();
    return base64Url(rawPublicKeyFromKey(createPublicKey(privateKey)));
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const token = await this.prisma.deviceToken.findFirst({
      where: {
        userId,
        platform: WEB_PUSH_PLATFORM,
        active: true,
      },
      select: { id: true },
    });

    return Boolean(token);
  }

  async registerSubscription(
    userId: string,
    subscription: PushSubscriptionJson,
  ) {
    const endpoint = String(subscription.endpoint ?? '').trim();
    const p256dh = String(subscription.keys?.p256dh ?? '').trim();
    const auth = String(subscription.keys?.auth ?? '').trim();

    if (!endpoint || !p256dh || !auth) {
      throw new Error('Invalid web push subscription.');
    }

    const token = JSON.stringify({
      endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: { p256dh, auth },
    });

    const existing = await this.prisma.deviceToken.findUnique({
      where: { token },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          userId,
          platform: WEB_PUSH_PLATFORM,
          active: true,
          lastUsedAt: new Date(),
          deviceName: 'Web push',
        },
      });
    }

    return this.prisma.deviceToken.create({
      data: {
        userId,
        token,
        platform: WEB_PUSH_PLATFORM,
        active: true,
        lastUsedAt: new Date(),
        deviceName: 'Web push',
      },
    });
  }

  async send(notification: {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    priority: string;
    actionUrl?: string | null;
    actionLabel?: string | null;
  }): Promise<PushDeliveryResult> {
    this.getPrivateKey();
    const subscriptions = await this.prisma.deviceToken.findMany({
      where: {
        userId: notification.userId,
        platform: WEB_PUSH_PLATFORM,
        active: true,
      },
      select: {
        id: true,
        token: true,
      },
    });

    if (!subscriptions.length) {
      const error = new Error(
        'PUSH_NOT_CONFIGURED: no active push subscription is registered for this user.',
      );
      throw error;
    }

    let sent = 0;
    let invalidTokens = 0;
    let lastError = '';

    for (const deviceToken of subscriptions) {
      try {
        const subscription = JSON.parse(deviceToken.token) as PushSubscriptionJson;
        await this.sendToSubscription(subscription, notification);
        sent += 1;

        await this.prisma.deviceToken.update({
          where: { id: deviceToken.id },
          data: { lastUsedAt: new Date(), active: true },
        });
      } catch (error) {
        const status = (error as { status?: number })?.status;
        const message = error instanceof Error ? error.message : 'Push delivery failed.';
        lastError = message;

        if (status === 404 || status === 410) {
          invalidTokens += 1;
          await this.prisma.deviceToken.update({
            where: { id: deviceToken.id },
            data: { active: false },
          });
        }
      }
    }

    if (!sent) {
      throw new Error(
        lastError || 'PUSH_DELIVERY_FAILED: no push endpoint accepted the notification.',
      );
    }

    return { sent, invalidTokens };
  }

  private async sendToSubscription(
    subscription: PushSubscriptionJson,
    notification: {
      id: string;
      type: string;
      title: string;
      body: string;
      priority: string;
      actionUrl?: string | null;
      actionLabel?: string | null;
    },
  ) {
    const endpoint = String(subscription.endpoint ?? '').trim();
    const p256dh = String(subscription.keys?.p256dh ?? '').trim();
    const auth = String(subscription.keys?.auth ?? '').trim();

    if (!endpoint || !p256dh || !auth) {
      const error = new Error('Invalid stored web push subscription.');
      (error as Error & { status?: number }).status = 410;
      throw error;
    }

    const pushCopy = this.getPrivacySafeCopy(notification);

    const payload = JSON.stringify({
      title: pushCopy.title,
      body: pushCopy.body,
      notificationId: notification.id,
      type: notification.type,
      actionUrl: notification.actionUrl ?? '/notifications',
      actionLabel: notification.actionLabel ?? 'Open notification',
    });

    const encrypted = this.encryptPayload(
      payload,
      fromBase64Url(p256dh),
      fromBase64Url(auth),
    );

    const vapidToken = this.createVapidToken(new URL(endpoint).origin);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${vapidToken}, k=${this.getPublicKey()}`,
        TTL: '300',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        Urgency:
          String(notification.priority).toUpperCase() === 'URGENT' ||
          String(notification.priority).toUpperCase() === 'HIGH'
            ? 'high'
            : 'normal',
      },
      body: encrypted as unknown as BodyInit,
    });

    if (!response.ok) {
      const text = (await response.text()).slice(0, 500);
      const error = new Error(
        `Web push endpoint returned ${response.status}: ${text}`,
      );
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
  }

  private encryptPayload(
    plaintext: string,
    userAgentPublicKey: Buffer,
    authSecret: Buffer,
  ): Buffer {
    if (userAgentPublicKey.length !== 65) {
      throw new Error('Invalid subscription p256dh key.');
    }
    if (authSecret.length !== 16) {
      throw new Error('Invalid subscription auth secret.');
    }

    const applicationServer = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });

    const applicationServerPublicKey = rawPublicKeyFromKey(
      applicationServer.publicKey,
    );

    const userAgentKey = clientPublicKeyFromRaw(userAgentPublicKey);

    const sharedSecret = diffieHellman({
      privateKey: applicationServer.privateKey,
      publicKey: userAgentKey,
    });

    const keyInfo = Buffer.concat([
      Buffer.from('WebPush: info', 'ascii'),
      Buffer.from([0]),
      userAgentPublicKey,
      applicationServerPublicKey,
    ]);

    const prkKey = hmacSha256(authSecret, sharedSecret);
    const ikm = hkdfExpand(prkKey, keyInfo, 32);

    const salt = randomBytes(16);
    const prk = hmacSha256(salt, ikm);

    const cek = hkdfExpand(
      prk,
      Buffer.concat([
        Buffer.from('Content-Encoding: aes128gcm', 'ascii'),
        Buffer.from([0]),
      ]),
      16,
    );

    const nonce = hkdfExpand(
      prk,
      Buffer.concat([
        Buffer.from('Content-Encoding: nonce', 'ascii'),
        Buffer.from([0]),
      ]),
      12,
    );

    const paddedPlaintext = Buffer.concat([
      Buffer.from(plaintext, 'utf8'),
      Buffer.from([2]),
    ]);

    const cipher = createCipheriv('aes-128-gcm', cek, nonce);
    const ciphertext = Buffer.concat([
      cipher.update(paddedPlaintext),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    const recordSize = Buffer.alloc(4);
    recordSize.writeUInt32BE(4096, 0);

    return Buffer.concat([
      salt,
      recordSize,
      Buffer.from([applicationServerPublicKey.length]),
      applicationServerPublicKey,
      ciphertext,
    ]);
  }

  private getPrivacySafeCopy(notification: {
    type: string;
    title: string;
  }): { title: string; body: string } {
    switch (String(notification.type).toUpperCase()) {
      case 'REMINDER':
        return {
          title: 'Sympto reminder',
          body: 'You have a health reminder waiting. Open Sympto to view the details.',
        };
      case 'APPOINTMENT':
        return {
          title: 'Sympto appointment update',
          body: 'You have an appointment update waiting. Open Sympto to view the details.',
        };
      case 'LAB_RESULT':
        return {
          title: 'Sympto result available',
          body: 'A new laboratory result is available in Sympto.',
        };
      case 'IMAGING_RESULT':
        return {
          title: 'Sympto imaging update',
          body: 'A new imaging update is available in Sympto.',
        };
      case 'MESSAGE':
        return {
          title: 'Sympto care team message',
          body: 'You have a new message from your care team.',
        };
      case 'TELEMEDICINE':
        return {
          title: 'Sympto telemedicine update',
          body: 'You have a telemedicine update waiting in Sympto.',
        };
      case 'PAYMENT':
        return {
          title: 'Sympto payment update',
          body: 'You have a healthcare payment update waiting in Sympto.',
        };
      case 'CLAIM':
        return {
          title: 'Sympto medical aid update',
          body: 'You have a medical aid update waiting in Sympto.',
        };
      case 'SECURITY':
        return {
          title: 'Sympto security alert',
          body: 'There is an important security update in Sympto.',
        };
      case 'SYSTEM':
        return {
          title: 'Sympto system update',
          body: 'There is an important update from Sympto.',
        };
      default:
        return {
          title: 'Sympto notification',
          body: 'You have a new health notification. Open Sympto to view the details.',
        };
    }
  }

  private createVapidToken(audience: string): string {
    const privateKey = this.getPrivateKey();

    const header = {
      typ: 'JWT',
      alg: 'ES256',
    };

    const payload = {
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: this.getSubject(),
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const input = `${encodedHeader}.${encodedPayload}`;

    const signer = createSign('sha256');
    signer.update(input);
    signer.end();

    const derSignature = signer.sign({
      key: privateKey,
      dsaEncoding: 'der',
    });

    return input + '.' + derSignatureToJose(derSignature).toString('base64url');
  }

  private getSubject(): string {
    const subject = process.env.PUSH_VAPID_SUBJECT?.trim();
    if (!subject) {
      throw new Error(
        'PUSH_VAPID_SUBJECT is not configured.',
      );
    }
    return subject;
  }

  private getPrivateKey(): KeyObject {
    const configured = process.env.PUSH_VAPID_PRIVATE_KEY_BASE64?.trim();

    if (!configured) {
      throw new Error(
        'PUSH_VAPID_PRIVATE_KEY_BASE64 is not configured.',
      );
    }

    // Accept either the generated base64-encoded PKCS#8 PEM value
    // or a PEM value directly, so local .env formatting cannot break key loading.
    const pem = configured.includes('-----BEGIN')
      ? configured.replace(/\\n/g, '\n')
      : Buffer.from(configured, 'base64').toString('utf8');

    if (!pem.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error(
        'PUSH_VAPID_PRIVATE_KEY_BASE64 is invalid. Generate a fresh key with: npm run push:vapid',
      );
    }

    try {
      return createPrivateKey({
        key: pem,
        format: 'pem',
        type: 'pkcs8',
      });
    } catch {
      throw new Error(
        'PUSH_VAPID_PRIVATE_KEY_BASE64 could not be decoded. Generate a fresh VAPID key with: npm run push:vapid',
      );
    }
  }
}
