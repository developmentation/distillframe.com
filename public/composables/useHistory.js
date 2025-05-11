// composables/useHistory.js
import eventBus from './eventBus.js';
import { useGlobal } from './useGlobal.js';
import { useRealTime } from './useRealTime.js';

// Singleton instance
let historyInstance = null;

export function useHistory() {
  if (historyInstance) {
    console.log('Returning existing useHistory instance');
    return historyInstance;
  }

  console.log('Creating new useHistory instance');

  const { entities, entityTypes } = useGlobal();
  const { emit, userUuid, channelName } = useRealTime();
  const processedEvents = new Set();

  function gatherLocalHistory() {
    const history = {};
    entityTypes.forEach((entityType) => {
      history[entityType] = entities.value[entityType] || [];
    });
    return history;
  }

  function syncChannelData(data) {
    console.log('syncChannelData called with data:', data);
    if (!data || typeof data !== 'object') {
      console.warn('Invalid or undefined history data received, skipping sync:', data);
      return;
    }
    const historyData = data.data || data;

    entityTypes.forEach((entityType) => {
      if (historyData[entityType] && Array.isArray(historyData[entityType])) {
        entities.value[entityType] = mergeArrays(
          entities.value[entityType] || [],
          historyData[entityType]
        );
        entities.value = { ...entities.value };
      }
    });

    Object.keys(historyData).forEach((key) => {
      if (!entityTypes.includes(key)) {
        console.warn(`Received data for unknown entity type: ${key}`);
      }
    });
  }

  function mergeArrays(existing, incoming) {
    const resultMap = new Map();

    existing.forEach((item) => {
      if (item.id) resultMap.set(item.id, item);
    });

    (incoming || []).forEach((item) => {
      if (!item.id) return;

      const existingItem = resultMap.get(item.id);
      if (existingItem) {
        const existingTime = existingItem.timestamp ? new Date(existingItem.timestamp).getTime() : 0;
        const incomingTime = item.timestamp ? new Date(item.timestamp).getTime() : 0;
        if (incomingTime >= existingTime) {
          resultMap.set(item.id, item);
        }
      } else {
        resultMap.set(item.id, item);
      }
    });

    return Array.from(resultMap.values());
  }

  function handleAddEntity(entityType, eventObj) {
    console.log(`Handling add-${entityType} event:`, eventObj);
    const { id, userUuid, data, timestamp } = eventObj;
    const eventKey = `add-${entityType}-${id}-${timestamp}`;
    if (!processedEvents.has(eventKey)) {
      processedEvents.add(eventKey);
      if (!(entities.value[entityType] || []).some((item) => item.id === id)) {
        entities.value[entityType] = [...(entities.value[entityType] || []), { id, userUuid, data, timestamp }];
        entities.value = { ...entities.value };
      }
      setTimeout(() => processedEvents.delete(eventKey), 1000);
    } else {
      console.log(`Skipping duplicate add-${entityType} event: ${eventKey}`);
    }
  }

  function handleUpdateEntity(entityType, eventObj) {
    console.log(`Handling update-${entityType} event:`, eventObj);
    const { id, userUuid, data, timestamp } = eventObj;
    const eventKey = `update-${entityType}-${id}-${timestamp}`;
    if (!processedEvents.has(eventKey)) {
      processedEvents.add(eventKey);
      const index = (entities.value[entityType] || []).findIndex((item) => item.id === id);
      if (index !== -1) {
        entities.value[entityType][index] = { id, userUuid, data, timestamp };
        entities.value = { ...entities.value };
      } else {
        console.warn(`Entity ${entityType} with ID ${id} not found for update, adding as new`);
        entities.value[entityType] = [...(entities.value[entityType] || []), { id, userUuid, data, timestamp }];
        entities.value = { ...entities.value };
      }
      setTimeout(() => processedEvents.delete(eventKey), 1000);
    } else {
      console.log(`Skipping duplicate update-${entityType} event: ${eventKey}`);
    }
  }

  function handleRemoveEntity(entityType, eventObj) {
    console.log(`Handling remove-${entityType} event:`, eventObj);
    const { id, timestamp } = eventObj;
    const eventKey = `remove-${entityType}-${id}-${timestamp}`;
    if (!processedEvents.has(eventKey)) {
      processedEvents.add(eventKey);
      entities.value[entityType] = (entities.value[entityType] || []).filter((item) => item.id !== id);
      entities.value = { ...entities.value };
      setTimeout(() => processedEvents.delete(eventKey), 1000);
    } else {
      console.log(`Skipping duplicate remove-${entityType} event: ${eventKey}`);
    }
  }

  function handleLLMDraft(eventObj) {
    console.log(`useHistory handleLLMDraft called with eventObj:`, eventObj);
    const { id, data, timestamp, userUuid } = eventObj;
    const entityType = data.entityType;
    if (!entityType || !entityTypes.includes(entityType)) {
      console.warn(`Received LLM draft for unknown or missing entity type: ${entityType}`);
      return;
    }
    const eventKey = `llm-draft-${id}-${timestamp}-${data.content}`;
    if (!processedEvents.has(eventKey)) {
      processedEvents.add(eventKey);
      const index = (entities.value[entityType] || []).findIndex((item) => item.id === id);
      if (index !== -1) {
        const currentText = entities.value[entityType][index].data.text || '';
        const newContent = data.content || '';
        console.log(`Updating draft for ${entityType} ID ${id}: currentText="${currentText}", newContent="${newContent}"`);
        entities.value[entityType][index].data.text = currentText + newContent;
        entities.value = { ...entities.value };
      } else {
        console.warn(`Entity ${entityType} with ID ${id} not found for LLM draft`);
      }
      setTimeout(() => processedEvents.delete(eventKey), 1000);
    } else {
      console.log(`Skipping duplicate llm-draft event: ${eventKey}`);
    }
  }

  function handleLLMEnd(eventObj) {
    console.log('useHistory handleLLMEnd called with eventObj:', eventObj);
    const { id, data, timestamp, userUuid, eventId } = eventObj;
    const entityType = data.entityType;
    if (!entityType || !entityTypes.includes(entityType)) {
      console.warn(`Received LLM end for unknown or missing entity type: ${entityType}`);
      return;
    }
    const eventKey = `llm-end-${eventId}`;
    if (!processedEvents.has(eventKey)) {
      processedEvents.add(eventKey);
      const index = (entities.value[entityType] || []).findIndex((item) => item.id === id);
      if (index !== -1) {
        entities.value[entityType][index].data.isStreaming = false;
        entities.value = { ...entities.value };
        const updatedData = entities.value[entityType][index].data;
        console.log(`Triggering update-${entityType} for ID ${id} after llm-end`, updatedData);
        updateEntity(entityType, id, updatedData);
      }
      setTimeout(() => processedEvents.delete(eventKey), 1000);
    } else {
      console.log(`Skipping duplicate llm-end event: ${eventKey}`);
    }
  }

  function addEntity(entityType, data) {
    if (!entityTypes.includes(entityType)) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    const id = uuidv4();
    const timestamp = Date.now();
    const payload = {
      id,
      channel: channelName.value,
      userUuid: userUuid.value,
      data,
      timestamp,
    };
    entities.value[entityType] = [...(entities.value[entityType] || []), payload];
    entities.value = { ...entities.value };
    emit(`add-${entityType}`, payload);
    return id;
  }

  function updateEntity(entityType, id, data) {
    if (!entityTypes.includes(entityType)) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    const index = (entities.value[entityType] || []).findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Entity ${entityType} with ID ${id} not found`);
    }
    const timestamp = Date.now();
    const payload = {
      id,
      channel: channelName.value,
      userUuid: userUuid.value,
      data,
      timestamp,
    };
    entities.value[entityType][index] = payload;
    entities.value = { ...entities.value };
    emit(`update-${entityType}`, payload);
  }

  function removeEntity(entityType, id) {
    if (!entityTypes.includes(entityType)) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    const index = (entities.value[entityType] || []).findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Entity ${entityType} with ID ${id} not found`);
    }
    const timestamp = Date.now();
    const payload = {
      id,
      channel: channelName.value,
      userUuid: userUuid.value,
      timestamp,
    };
    entities.value[entityType] = (entities.value[entityType] || []).filter((item) => item.id !== id);
    entities.value = { ...entities.value };
    emit(`remove-${entityType}`, payload);
  }

  // Register listeners for each entity type
  const handlers = {};
  entityTypes.forEach((entityType) => {
    handlers[`add-${entityType}`] = (eventObj) => handleAddEntity(entityType, eventObj);
    eventBus.$on(`history-add-${entityType}`, handlers[`add-${entityType}`]);

    handlers[`update-${entityType}`] = (eventObj) => handleUpdateEntity(entityType, eventObj);
    eventBus.$on(`history-update-${entityType}`, handlers[`update-${entityType}`]);

    handlers[`remove-${entityType}`] = (eventObj) => handleRemoveEntity(entityType, eventObj);
    eventBus.$on(`history-remove-${entityType}`, handlers[`remove-${entityType}`]);
  });

  handlers['llm-draft'] = (eventObj) => {
    console.log(`EventBus emitted history-llm-draft:`, eventObj);
    handleLLMDraft(eventObj);
  };
  eventBus.$on('history-llm-draft', handlers['llm-draft']);

  handlers['llm-end'] = (eventObj) => {
    console.log(`EventBus emitted history-llm-end:`, eventObj);
    handleLLMEnd(eventObj);
  };
  eventBus.$on('history-llm-end', handlers['llm-end']);

  handlers['sync-history-data'] = syncChannelData;
  eventBus.$on('sync-history-data', handlers['sync-history-data']);

  function cleanup() {
    console.log('Cleaning up useHistory listeners');
    Object.keys(handlers).forEach((event) => {
      eventBus.$off(event, handlers[event]);
    });
    processedEvents.clear();
  }

  historyInstance = {
    gatherLocalHistory,
    syncChannelData,
    addEntity,
    updateEntity,
    removeEntity,
    cleanup,
  };

  return historyInstance;
}