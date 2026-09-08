#!/usr/bin/env bash
# LocalStack bootstrap: creates SNS topic, SQS queues, DLQs and wires subscriptions.
# Runs automatically when LocalStack starts (placed in /etc/localstack/init/ready.d/).

set -euo pipefail

ENDPOINT="http://localhost:4566"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ACCOUNT_ID="000000000000"

echo "==> Creating SNS topic: order-events"
SNS_ARN=$(awslocal sns create-topic --name order-events --query TopicArn --output text)
echo "    ARN: $SNS_ARN"

echo "==> Creating DLQs"
awslocal sqs create-queue --queue-name inventory-dlq \
  --attributes '{"MessageRetentionPeriod":"1209600"}' > /dev/null
awslocal sqs create-queue --queue-name notification-dlq \
  --attributes '{"MessageRetentionPeriod":"1209600"}' > /dev/null

INV_DLQ_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:inventory-dlq"
NOTIF_DLQ_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:notification-dlq"

echo "==> Creating main queues with redrive policy (maxReceiveCount=3)"
awslocal sqs create-queue --queue-name inventory-queue \
  --attributes "{
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"${INV_DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\",
    \"VisibilityTimeout\": \"30\",
    \"MessageRetentionPeriod\": \"86400\"
  }" > /dev/null

awslocal sqs create-queue --queue-name notification-queue \
  --attributes "{
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"${NOTIF_DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\",
    \"VisibilityTimeout\": \"30\",
    \"MessageRetentionPeriod\": \"86400\"
  }" > /dev/null

INV_QUEUE_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:inventory-queue"
NOTIF_QUEUE_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:notification-queue"

echo "==> Subscribing queues to SNS topic"
awslocal sns subscribe \
  --topic-arn "$SNS_ARN" \
  --protocol sqs \
  --notification-endpoint "$INV_QUEUE_ARN" \
  --attributes '{"RawMessageDelivery":"true"}' > /dev/null

awslocal sns subscribe \
  --topic-arn "$SNS_ARN" \
  --protocol sqs \
  --notification-endpoint "$NOTIF_QUEUE_ARN" \
  --attributes '{"RawMessageDelivery":"true"}' > /dev/null

echo "==> Setting SQS access policy (allow SNS to send)"
for QUEUE in inventory-queue notification-queue; do
  QUEUE_ARN="arn:aws:sqs:${REGION}:${ACCOUNT_ID}:${QUEUE}"
  QUEUE_URL="${ENDPOINT}/000000000000/${QUEUE}"
  awslocal sqs set-queue-attributes \
    --queue-url "$QUEUE_URL" \
    --attributes "{
      \"Policy\": \"{\\\"Version\\\":\\\"2012-10-17\\\",\\\"Statement\\\":[{\\\"Effect\\\":\\\"Allow\\\",\\\"Principal\\\":{\\\"Service\\\":\\\"sns.amazonaws.com\\\"},\\\"Action\\\":\\\"sqs:SendMessage\\\",\\\"Resource\\\":\\\"${QUEUE_ARN}\\\",\\\"Condition\\\":{\\\"ArnEquals\\\":{\\\"aws:SourceArn\\\":\\\"${SNS_ARN}\\\"}}}]}\"
    }" > /dev/null
done

echo "==> LocalStack resources ready"
echo "    SNS: $SNS_ARN"
echo "    SQS: inventory-queue, notification-queue"
echo "    DLQ: inventory-dlq, notification-dlq"
