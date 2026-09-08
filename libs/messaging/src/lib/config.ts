export interface MessagingConfig {
  /** LocalStack / real AWS endpoint URL */
  endpointUrl: string;
  region: string;
  /** Fake credentials accepted by LocalStack */
  accessKeyId: string;
  secretAccessKey: string;
}

export function getMessagingConfig(): MessagingConfig {
  return {
    endpointUrl: process.env['AWS_ENDPOINT_URL'] ?? 'http://localhost:4566',
    region: process.env['AWS_DEFAULT_REGION'] ?? 'us-east-1',
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? 'test',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? 'test',
  };
}
