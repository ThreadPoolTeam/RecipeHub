import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging, Messaging } from "firebase-admin/messaging";

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
export const auth = getAuth();

/** Lớp mỏng quanh FCM để test thay bằng bản giả (FCM không có emulator). */
export interface MessagingPort {
  sendToTopic(topic: string, message: Omit<import("firebase-admin/messaging").TopicMessage, "topic">): Promise<string>;
  sendToTokens(
    tokens: string[],
    message: Omit<import("firebase-admin/messaging").MulticastMessage, "tokens">,
  ): Promise<import("firebase-admin/messaging").BatchResponse>;
  unsubscribe(tokens: string[], topic: string): Promise<void>;
}

function realMessaging(m: Messaging): MessagingPort {
  return {
    sendToTopic: (topic, message) => m.send({ ...message, topic }),
    sendToTokens: (tokens, message) => m.sendEachForMulticast({ ...message, tokens }),
    unsubscribe: async (tokens, topic) => {
      if (tokens.length > 0) await m.unsubscribeFromTopic(tokens, topic);
    },
  };
}

let messagingPort: MessagingPort | null = null;

export function messaging(): MessagingPort {
  if (!messagingPort) messagingPort = realMessaging(getMessaging());
  return messagingPort;
}

/** Chỉ dùng trong test. */
export function setMessagingForTest(port: MessagingPort | null): void {
  messagingPort = port;
}
