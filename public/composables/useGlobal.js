// composables/useGlobal.js

// Define entities as a globally scoped reactive object
const entities = Vue.ref({
  channel: [],
  library: [],
  agents: [],
  chatSessions: [], // Kept for compatibility, but unused
  chats: [], // Kept for compatibility, but unused

  video: [], // { id, userUuid, data: { name, fileSize, mimeType }, timestamp }
  image: [], // { id, userUuid, data: { videoUuid, timestamp, sequence, imageData, analysis: [] }, timestamp }
  businessAnalysis: [], // { id, userUuid, data: { videoUuid, markdown }, timestamp }
});
  // Derive entityTypes from the keys of entities
  const entityTypes = Object.keys(entities.value);
  
  export function useGlobal() {
    return {
      entities,
      entityTypes,
    };
  }