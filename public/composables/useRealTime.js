// composables/useRealTime.js
import eventBus from './eventBus.js';
import { socketManager } from '../utils/socketManager.js';
import { useGlobal } from './useGlobal.js';

// Singleton instance to ensure useRealTime is only created once
let realTimeInstance = null;

const userUuid = Vue.ref(sessionStorage.getItem('userUuid') || uuidv4());
const displayName = Vue.ref(sessionStorage.getItem('displayName') || '');
const channelName = Vue.ref(sessionStorage.getItem('channelName') || '');
const isConnected = Vue.ref(false);
const connectionStatus = Vue.ref('disconnected');
const activeUsers = Vue.ref([]);
const connectionError = Vue.ref(null);
const lastMessageTimestamp = Vue.ref(0);
const userColor = Vue.ref(sessionStorage.getItem('userColor') || '#808080');
const isRoomLocked = Vue.ref(false);

const TIMESTAMP_TOLERANCE = 5000;

const sessionInfo = Vue.computed(() => ({
  userUuid: userUuid.value,
  displayName: displayName.value,
  channelName: channelName.value,
  isConnected: isConnected.value,
  error: connectionError.value,
}));

// Register entity listeners once, globally
const { entityTypes } = useGlobal();
const entityHandlers = {};
console.log('Registering global listeners for useRealTime');
entityTypes.forEach((entityType) => {
  entityHandlers[`add-${entityType}`] = (eventObj) => {
    eventBus.$emit(`history-add-${entityType}`, eventObj);
  };
  eventBus.$on(`add-${entityType}`, entityHandlers[`add-${entityType}`]);

  entityHandlers[`update-${entityType}`] = (eventObj) => {
    eventBus.$emit(`history-update-${entityType}`, eventObj);
  };
  eventBus.$on(`update-${entityType}`, entityHandlers[`update-${entityType}`]);

  entityHandlers[`remove-${entityType}`] = (eventObj) => {
    eventBus.$emit(`history-remove-${entityType}`, eventObj);
  };
  eventBus.$on(`remove-${entityType}`, entityHandlers[`remove-${entityType}`]);
});
entityHandlers['llm-draft'] = (eventObj) => {
  console.log(`Client received llm-draft event:`, eventObj);
  if (eventObj.data && eventObj.data.entityType) {
    eventBus.$emit('history-llm-draft', eventObj);
  } else {
    console.warn('Received llm-draft event without entityType:', eventObj);
  }
};
eventBus.$on('llm-draft', entityHandlers['llm-draft']);

entityHandlers['llm-end'] = (eventObj) => {
  console.log(`Client received llm-end event:`, eventObj);
  if (eventObj.data && eventObj.data.entityType) {
    eventBus.$emit('history-llm-end', eventObj);
  } else {
    console.warn('Received llm-end event without entityType:', eventObj);
  }
};
eventBus.$on('llm-end', entityHandlers['llm-end']);

export function useRealTime() {
  if (realTimeInstance) {
    console.log('Returning existing useRealTime instance');
    return realTimeInstance;
  }

  console.log('Creating new useRealTime instance');

  function handleMessage(data) {
    if (typeof data !== 'object' || !data.type) {
      console.error('Invalid message format:', data);
      return;
    }

    let processedData;
    if (data.type === 'user-joined') {
      processedData = {
        type: data.type,
        userUuid: data.userUuid,
        displayName: data.displayName,
        color: data.color,
        joinedAt: data.joinedAt || data.timestamp || Date.now(),
        timestamp: data.timestamp || Date.now(),
      };
      if (processedData.userUuid === userUuid.value) {
        userColor.value = processedData.color;
        sessionStorage.setItem('userColor', userColor.value);
      }
    } else if (data.type === 'user-list') {
      processedData = {
        type: data.type,
        users: Array.isArray(data.users) ? data.users : [],
        timestamp: data.timestamp || Date.now(),
      };
    } else if (data.type === 'user-left') {
      processedData = {
        type: data.type,
        userUuid: data.userUuid,
        timestamp: data.timestamp || Date.now(),
      };
    } else if (data.type === 'room-lock-toggle') {
      processedData = {
        type: data.type,
        channelName: data.channelName,
        locked: data.data ? data.data.locked : false,
        timestamp: data.timestamp || Date.now(),
      };
    } else if (data.type === 'remove-channel') {
      processedData = {
        type: data.type,
        id: data.id || null,
        userUuid: data.userUuid,
        channelName: data.data?.channelName || data.channelName,
        timestamp: data.timestamp || Date.now(),
      };
    } else {
      processedData = {
        type: data.type,
        id: data.id,
        userUuid: data.userUuid,
        data: data.data,
        timestamp: data.timestamp || Date.now(),
        serverTimestamp: data.serverTimestamp,
      };
    }

    const timeDiff = processedData.timestamp - lastMessageTimestamp.value;
    if (processedData.timestamp < lastMessageTimestamp.value - TIMESTAMP_TOLERANCE) {
      console.warn('Ignoring outdated message:', processedData, `Time difference: ${timeDiff}ms`);
      return;
    }
    lastMessageTimestamp.value = Math.max(lastMessageTimestamp.value, processedData.timestamp);

    switch (processedData.type) {
      case 'init-state':
        eventBus.$emit('sync-history-data', processedData);
        break;
      case 'user-list':
        activeUsers.value = processedData.users;
        eventBus.$emit('user-list', processedData);
        break;
      case 'user-joined':
        if (!activeUsers.value.some((user) => user.userUuid === processedData.userUuid)) {
          activeUsers.value.push(processedData);
        }
        eventBus.$emit('user-joined', processedData);
        break;
      case 'user-left':
        const userIndex = activeUsers.value.findIndex((user) => user.userUuid === processedData.userUuid);
        if (userIndex !== -1) {
          activeUsers.value.splice(userIndex, 1);
        }
        eventBus.$emit('user-left', processedData);
        break;
      case 'room-lock-toggle':
        isRoomLocked.value = processedData.locked;
        eventBus.$emit('room-lock-toggle', processedData);
        break;
      case 'remove-channel':
        if (processedData.channelName === channelName.value || (processedData.id && processedData.id === channelName.value)) {
          const removedBy = activeUsers.value.find(user => user.userUuid === processedData.userUuid)?.displayName || 'Unknown User';
          eventBus.$emit('session-removed', { removedBy });
          disconnect();
        }
        break;
      default:
        eventBus.$emit(processedData.type, processedData);
    }
  }

  function handleStatusChange(status, error) {
    connectionStatus.value = status;
    isConnected.value = status === 'connected';
    connectionError.value = error;
    if (error) console.error('Connection status changed:', error);
  }

  function connect(channel, name) {
    if (isConnected.value) {
      console.log('Already connected, skipping join');
      return;
    }
    userUuid.value = sessionStorage.getItem('userUuid') || uuidv4();
    sessionStorage.setItem('userUuid', userUuid.value);
    displayName.value = name;
    channelName.value = channel;
    sessionStorage.setItem('displayName', name);
    sessionStorage.setItem('channelName', channel);

    Vue.nextTick(() => {
      socketManager.initializeSocket(
        channelName.value,
        userUuid.value,
        displayName.value,
        handleMessage,
        handleStatusChange
      );
    });
  }

  function disconnect() {
    socketManager.disconnect(channelName.value, userUuid.value);
    activeUsers.value = [];
  }

  function emit(event, data) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Client emitting event: ${event}`, data);
        socketManager.emit(event, data, channelName.value, userUuid.value);
        resolve();
      } catch (error) {
        console.error('Emit failed:', error);
        reject(error);
      }
    });
  }

  function reconnect() {
    if (!isConnected.value) {
      console.log('Attempting to reconnect...');
      socketManager.reconnect(
        channelName.value,
        userUuid.value,
        displayName.value,
        handleMessage,
        handleStatusChange
      );
      socketManager.emit(
        'join-channel',
        {
          userUuid: userUuid.value,
          displayName: displayName.value,
          channelName: channelName.value,
        },
        channelName.value,
        userUuid.value
      );
    }
  }

  function loadSession() {
    if (userUuid.value && displayName.value && channelName.value) {
      if (isConnected.value) {
        console.log('Already connected, skipping loadSession join');
        return;
      }
      socketManager.initializeSocket(
        channelName.value,
        userUuid.value,
        displayName.value,
        handleMessage,
        handleStatusChange
      );
      socketManager.emit(
        'join-channel',
        {
          userUuid: userUuid.value,
          displayName: displayName.value,
          channelName: channelName.value,
        },
        channelName.value,
        userUuid.value
      );
    }
  }

  function triggerLLM(entityType, entityId, model, temperature, systemPrompt, userPrompt, messageHistory, useJson) {
    const payload = {
      id: entityId,
      userUuid: userUuid.value,
      data: {
        model,
        temperature,
        systemPrompt,
        userPrompt,
        messageHistory,
        useJson,
        entityType,
      },
      timestamp: Date.now(),
    };
    console.log(`Client triggering LLM for entityType: ${entityType}, entityId: ${entityId}`, payload);
    emit('llm-trigger', payload);
  }

  function on(event, callback) {
    eventBus.$on(event, callback);
    return callback;
  }

  function off(event, callback) {
    eventBus.$off(event, callback);
  }

  function cleanup() {
    entityTypes.forEach((entityType) => {
      off(`add-${entityType}`);
      off(`update-${entityType}`);
      off(`remove-${entityType}`);
    });

    off('llm-draft');
    off('llm-end');

    off('init-state');
    off('user-list');
    off('user-joined');
    off('user-left');
    off('room-lock-toggle');
    off('remove-channel');
  }

  realTimeInstance = {
    userUuid,
    displayName,
    channelName,
    isConnected,
    connectionStatus,
    activeUsers,
    connectionError,
    sessionInfo,
    userColor,
    isRoomLocked,
    connect,
    disconnect,
    emit,
    reconnect,
    loadSession,
    triggerLLM,
    on,
    off,
    cleanup,
  };

  return realTimeInstance;
}