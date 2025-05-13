// composables/useGlobal.js

// Define entities as a globally scoped reactive object
const entities = Vue.ref({
  channel: [],
  library: [],
  agents: [],
  chatSessions: [], // Kept for compatibility, but unused
  chats: [], // Kept for compatibility, but unused
  media: [], // { id, userUuid, channel, data: { name, fileSize, mimeType, type }, timestamp }
  image: [], // { id, userUuid, channel, data: { mediaUuid, timestamp, sequence, imageData, analysis: [] }, timestamp }
  businessAnalysis: [], // { id, userUuid, channel, data: { mediaUuid, markdown }, timestamp }
});

// Derive entityTypes from the keys of entities
const entityTypes = Object.keys(entities.value);

export function useGlobal() {
  return {
    entities,
    entityTypes,
  };
}