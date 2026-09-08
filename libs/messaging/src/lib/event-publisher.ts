import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getMessagingConfig } from './config';

export class EventPublisher {
  private readonly client: SNSClient;
  private readonly topicArn: string;

  constructor(topicArn: string) {
    const cfg = getMessagingConfig();
    this.client = new SNSClient({
      endpoint: cfg.endpointUrl,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    this.topicArn = topicArn;
  }

  async publish<T>(eventType: string, payload: T): Promise<void> {
    const message = JSON.stringify({ eventType, payload, timestamp: new Date().toISOString() });
    await this.client.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: message,
        MessageAttributes: {
          eventType: { DataType: 'String', StringValue: eventType },
        },
      }),
    );
  }
}
