import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { REGION } from "../config";
import { countDeleted, countNewIncident, countStatusChange } from "./stats";

// Trigger Firestore được giao "ít nhất một lần": dùng event.id để không đếm trùng khi giao lại.

export const onIncidentCreated = onDocumentCreated({ document: "incidents/{id}", region: REGION }, async (event) => {
  const data = event.data?.data();
  if (!data) return;
  const day = await countNewIncident(data, event.id);
  console.log(`incident ${event.params.id} kind=${data.kind} day=${day ?? "duplicate-event"}`);
});

export const onIncidentUpdated = onDocumentUpdated({ document: "incidents/{id}", region: REGION }, async (event) => {
  await countStatusChange(event.data?.before.get("status"), event.data?.after.get("status"), event.id);
});

export const onIncidentDeleted = onDocumentDeleted({ document: "incidents/{id}", region: REGION }, async (event) => {
  const data = event.data?.data();
  if (data) await countDeleted(data, event.id);
});
