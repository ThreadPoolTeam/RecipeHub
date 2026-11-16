#!/bin/bash
set -e

BOOTSTRAP_SERVER="${KAFKA_BOOTSTRAP_SERVER:-kafka:9092}"
KAFKA_TOPICS_BIN="/opt/kafka/bin/kafka-topics.sh"

echo "Creating topic: recipehub.audit.activities.v1..."
"$KAFKA_TOPICS_BIN" --bootstrap-server "$BOOTSTRAP_SERVER" \
  --create --if-not-exists \
  --topic recipehub.audit.activities.v1 \
  --partitions 3 \
  --replication-factor 1 \
  --config retention.ms=604800000

echo "Creating topic: recipehub.audit.activities.v1.dlq..."
"$KAFKA_TOPICS_BIN" --bootstrap-server "$BOOTSTRAP_SERVER" \
  --create --if-not-exists \
  --topic recipehub.audit.activities.v1.dlq \
  --partitions 1 \
  --replication-factor 1 \
  --config retention.ms=1209600000

echo "Describing created topics..."
"$KAFKA_TOPICS_BIN" --bootstrap-server "$BOOTSTRAP_SERVER" \
  --describe --topic recipehub.audit.activities.v1

"$KAFKA_TOPICS_BIN" --bootstrap-server "$BOOTSTRAP_SERVER" \
  --describe --topic recipehub.audit.activities.v1.dlq

echo "Kafka topics initialization completed."
