import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { getMessagingConfig } from './config';
import { MessageEnvelope, MessageHandler } from './message-handler';

export interface SqsConsumerOptions {
  queueUrl: string;
  /** How many messages to receive per poll (1–10, default 10) */
  maxMessages?: number;
  /** Long-poll wait time in seconds (default 20) */
  waitTimeSeconds?: number;
  /** Visibility timeout in seconds (default 30) */
  visibilityTimeout?: number;
  /** Delay between polls when queue is empty (ms, default 1000) */
  idleDelayMs?: number;
}

/** Exponential backoff: waits 2^attempt × 100 ms, capped at 30 s. */
function backoffMs(attempt: number): number {
  return Math.min(100 * Math.pow(2, attempt), 30_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class SqsConsumer {
  private readonly client: SQSClient;
  private readonly opts: Required<SqsConsumerOptions>;
  private running = false;

  constructor(private readonly options: SqsConsumerOptions) {
    const cfg = getMessagingConfig();
    this.client = new SQSClient({
      endpoint: cfg.endpointUrl,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    this.opts = {
      queueUrl: options.queueUrl,
      maxMessages: options.maxMessages ?? 10,
      waitTimeSeconds: options.waitTimeSeconds ?? 20,
      visibilityTimeout: options.visibilityTimeout ?? 30,
      idleDelayMs: options.idleDelayMs ?? 1_000,
    };
  }

  start<T>(handler: MessageHandler<T>): void {
    if (this.running) return;
    this.running = true;
    void this.poll(handler as MessageHandler<unknown>);
  }

  stop(): void {
    this.running = false;
  }

  private async poll(handler: MessageHandler<unknown>): Promise<void> {
    while (this.running) {
      try {
        const response = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: this.opts.queueUrl,
            MaxNumberOfMessages: this.opts.maxMessages,
            WaitTimeSeconds: this.opts.waitTimeSeconds,
            VisibilityTimeout: this.opts.visibilityTimeout,
          }),
        );

        const messages = response.Messages ?? [];
        if (messages.length === 0) {
          await sleep(this.opts.idleDelayMs);
          continue;
        }

        await Promise.allSettled(messages.map(msg => this.processOne(msg, handler)));
      } catch (err) {
        console.error('[SqsConsumer] Poll error:', err);
        await sleep(backoffMs(1));
      }
    }
  }

  private async processOne(
    msg: Message,
    handler: MessageHandler<unknown>,
    attempt = 0,
  ): Promise<void> {
    const messageId = msg.MessageId ?? 'unknown';
    const receiptHandle = msg.ReceiptHandle!;

    let envelope: MessageEnvelope<unknown>;
    try {
      envelope = JSON.parse(msg.Body ?? '{}') as MessageEnvelope<unknown>;
    } catch {
      console.error(`[SqsConsumer] Failed to parse message ${messageId}`);
      // delete unparseable messages so they don't cycle forever
      await this.delete(receiptHandle);
      return;
    }

    try {
      await handler.handle(envelope, messageId);
      await this.delete(receiptHandle);
    } catch (err) {
      const maxAttempt = 2; // 3 tries total (0, 1, 2)
      if (attempt < maxAttempt) {
        console.warn(`[SqsConsumer] Retry ${attempt + 1} for msg ${messageId}:`, err);
        await sleep(backoffMs(attempt));
        return this.processOne(msg, handler, attempt + 1);
      }
      // Exhausted local retries — leave on queue for SQS redrive to DLQ
      console.error(`[SqsConsumer] Giving up on msg ${messageId} after ${attempt + 1} attempts`, err);
    }
  }

  private async delete(receiptHandle: string): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.opts.queueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  }
}
