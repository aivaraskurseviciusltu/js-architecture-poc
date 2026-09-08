/** Parsed envelope written by EventPublisher.publish() */
export interface MessageEnvelope<T = unknown> {
  eventType: string;
  payload: T;
  timestamp: string;
}

/**
 * Implement this interface to handle a specific event type.
 * Return true  → message will be deleted from the queue.
 * Throw        → message is NOT deleted (becomes visible again for retry / DLQ).
 */
export interface MessageHandler<T = unknown> {
  handle(envelope: MessageEnvelope<T>, messageId: string): Promise<void>;
}
