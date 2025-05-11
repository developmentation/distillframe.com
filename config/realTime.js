const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { handlePrompt } = require("./handleAiInteractions");
const { isDbConnected } = require("./db.js"); // Import connection status checker

const channels = new Map();

// Define Logs Schema for error tracking
const logSchema = new mongoose.Schema({
  timestamp: { type: Number, required: true, index: true },
  level: { type: String, required: true },
  message: { type: String, required: true },
  stackTrace: { type: String },
  userUuid: { type: String },
  channelName: { type: String },
  socketId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

const Log = mongoose.model("Log", logSchema, "logs");

// Dynamic Entity Schema
const entitySchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  channel: { type: String, required: true, index: true },
  userUuid: { type: String, required: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  timestamp: { type: Number, required: true },
  serverTimestamp: { type: Number, required: true, index: true },
}, { timestamps: true });

// Cache for dynamic models
const entityModels = new Map();

function getEntityModel(entityType) {
  if (!entityModels.has(entityType)) {
    entityModels.set(
      entityType,
      mongoose.model(`${entityType}Set`, entitySchema, `${entityType}Set`)
    );
  }
  return entityModels.get(entityType);
}

/**
 * Generates a muted dark color for user identification.
 */
function generateMutedDarkColor() {
  const r = Math.floor(Math.random() * 129);
  const g = Math.floor(Math.random() * 129);
  const b = Math.floor(Math.random() * 129);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function validateJoinData(data) {
  return data && data.userUuid && data.displayName && data.channelName && isValidChannelName(data.channelName);
}

function validateLeaveData(data) {
  return data && data.userUuid && data.channelName && isValidChannelName(data.channelName);
}

function validateMessage(data) {
  const isHeartbeat = data && data.type && (data.type === "ping" || data.type === "pong");
  if (isHeartbeat) return true;
  return data && data.userUuid && data.channelName && data.type && isValidChannelName(data.channelName);
}

function isValidChannelName(channelName) {
  if (!channelName || typeof channelName !== "string") return false;
  return /^[a-z0-9 _-]+$/i.test(channelName);
}

function validateLLMData(data) {
  return (
    data &&
    typeof data.model === "object" &&
    data.model.provider &&
    data.model.name &&
    data.model.model &&
    typeof data.temperature === "number" &&
    data.temperature >= 0 &&
    data.temperature <= 1 &&
    typeof data.systemPrompt === "string" &&
    typeof data.userPrompt === "string" &&
    Array.isArray(data.messageHistory) &&
    typeof data.useJson === "boolean" &&
    typeof data.entityType === "string"
  );
}

async function loadStateFromServer(channelName, entityType) {
  if (!isDbConnected()) return [];
  try {
    const model = getEntityModel(entityType);
    const state = await model
      .find({ channel: channelName })
      .sort({ serverTimestamp: 1 })
      .lean();
    return state.map((doc) => ({
      id: doc.id,
      userUuid: doc.userUuid,
      data: doc.data,
      timestamp: doc.timestamp,
      serverTimestamp: doc.serverTimestamp,
    }));
  } catch (error) {
    await logError(
      "error",
      `Error loading ${entityType} for ${channelName}`,
      error.stack
    );
    return [];
  }
}

function broadcastToChannel(channelName, type, payload, excludeUuid = null) {
  try {
    if (channels.has(channelName)) {
      const channel = channels.get(channelName);
      const serverTimestamp = Date.now();
      let message;

      if (type === "user-list") {
        const usersArray = Object.entries(channel.users).map(([userUuid, user]) => ({
          userUuid,
          displayName: user.displayName,
          color: user.color,
          joinedAt: user.joinedAt,
        }));
        message = { type, users: usersArray, timestamp: serverTimestamp };
      } else if (type === "user-joined") {
        message = {
          type,
          userUuid: payload.userUuid,
          displayName: payload.data.displayName,
          color: payload.data.color,
          joinedAt: serverTimestamp,
          timestamp: serverTimestamp,
        };
      } else if (type === "user-left") {
        message = { type, userUuid: payload.userUuid, timestamp: serverTimestamp };
      } else {
        message = {
          type,
          id: payload.id,
          userUuid: payload.userUuid,
          data: payload.data,
          timestamp: payload.timestamp || serverTimestamp,
          serverTimestamp,
          eventId: payload.eventId || `${payload.id}-${serverTimestamp}-${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      console.log(`Server broadcasting to channel ${channelName}: ${type}`, message);
      for (const userUuid in channel.sockets) {
        if (userUuid !== excludeUuid && channel.sockets[userUuid]) {
          channel.sockets[userUuid].emit("message", message);
        }
      }
    }
  } catch (err) {
    logError("error", `Broadcast error for ${channelName}`, err.stack);
  }
}

function cleanupUser(channelName, userUuid, socket) {
  try {
    if (channels.has(channelName)) {
      const channel = channels.get(channelName);
      if (channel.users[userUuid]) {
        delete channel.users[userUuid];
        if (channel.sockets[userUuid]) {
          delete channel.sockets[userUuid];
          socket.leave(channelName);
        }

        if (Object.keys(channel.users).length === 0) {
          channels.delete(channelName);
        } else {
          broadcastToChannel(channelName, "user-left", { userUuid });
          broadcastToChannel(channelName, "user-list", { id: null, userUuid, data: null });
        }
      }
    }
  } catch (err) {
    logError(
      "error",
      `Cleanup error for ${channelName} and ${userUuid}`,
      err.stack,
      userUuid,
      channelName,
      socket.id
    );
  }
}

function validateEntity(payload, entityType, operation) {
  if (!payload.id) {
    return { valid: false, message: `Invalid ${entityType} data for ${operation}: missing id` };
  }
  return { valid: true, message: "" };
}

async function upsertChannel(channelName, userUuid, displayName) {
  if (!isDbConnected()) {
    return {
      id: channelName,
      channel: channelName,
      userUuid,
      data: { locked: false, users: [{ userUuid, displayName, joinedAt: Date.now() }] },
      timestamp: Date.now(),
      serverTimestamp: Date.now(),
    };
  }

  try {
    const timestamp = Date.now();
    const userEntry = { userUuid, displayName, joinedAt: timestamp };

    const model = getEntityModel("channel");
    const existingChannel = await model.findOne({ id: channelName });

    if (existingChannel) {
      const users = existingChannel.data.users || [];
      const userExists = users.some((user) => user.userUuid === userUuid);

      if (!userExists) {
        users.push(userEntry);
      } else {
        const userIndex = users.findIndex((user) => user.userUuid === userUuid);
        users[userIndex] = userEntry;
      }

      await model.updateOne(
        { id: channelName },
        {
          $set: {
            "data.users": users,
            userUuid,
            timestamp,
            serverTimestamp: timestamp,
          },
        }
      );

      return {
        id: channelName,
        channel: channelName,
        userUuid,
        data: { locked: existingChannel.data.locked, users },
        timestamp,
        serverTimestamp: timestamp,
      };
    } else {
      const channelData = {
        id: channelName,
        channel: channelName,
        userUuid,
        data: {
          locked: false,
          users: [userEntry],
        },
        timestamp,
        serverTimestamp: timestamp,
      };

      await model.create(channelData);
      return channelData;
    }
  } catch (err) {
    await logError(
      "error",
      `Failed to upsert channel ${channelName}`,
      err.stack,
      userUuid,
      channelName
    );
    throw err;
  }
}

async function handleEntityOperation(channelName, userUuid, type, payload, socket) {
  try {
    const [operation, entityType] = type.split("-");
    if (!["add", "update", "remove"].includes(operation)) {
      socket.emit("message", { type: "error", message: `Invalid operation: ${operation}`, timestamp: Date.now() });
      return;
    }

    const validation = validateEntity(payload, entityType, operation);
    if (!validation.valid) {
      socket.emit("message", { type: "error", message: validation.message, timestamp: Date.now() });
      return;
    }

    if (!channels.has(channelName)) {
      socket.emit("message", { type: "error", message: "Invalid channel", timestamp: Date.now() });
      return;
    }

    const timestamp = payload.timestamp || Date.now();
    const normalizedPayload = { ...payload, userUuid, timestamp, channelName };

    if (isDbConnected()) {
      const model = getEntityModel(entityType);
      if (operation === "add") {
        await model.create({
          id: payload.id,
          channel: channelName,
          userUuid,
          data: payload.data,
          timestamp,
          serverTimestamp: Date.now(),
        });
      } else if (operation === "update") {
        await model.updateOne(
          { id: payload.id, channel: channelName },
          { $set: { data: payload.data, timestamp, serverTimestamp: Date.now() } }
        );
      } else if (operation === "remove") {
        await model.deleteOne({ id: payload.id, channel: channelName });
      }
    }

    broadcastToChannel(channelName, type, normalizedPayload, userUuid);
  } catch (err) {
    await logError(
      "error",
      `Entity operation failed for ${channelName} and type ${type}`,
      err.stack,
      userUuid,
      channelName,
      socket.id,
      { payload }
    );
    socket.emit("message", { type: "error", message: "Server error occurred", timestamp: Date.now() });
  }
}

async function handleLLMOperation(channelName, userUuid, type, payload, socket) {
  try {
    if (type === "llm-trigger") {
      console.log(`Server received llm-trigger for channel ${channelName}, user ${userUuid}:`, payload);
      if (!validateLLMData(payload.data)) {
        socket.emit("message", { type: "error", message: "Invalid LLM data", timestamp: Date.now() });
        return;
      }

      const promptConfig = {
        model: payload.data.model,
        uuid: payload.id,
        session: channelName,
        temperature: payload.data.temperature,
        systemPrompt: payload.data.systemPrompt,
        userPrompt: payload.data.userPrompt,
        messageHistory: payload.data.messageHistory,
        useJson: payload.data.useJson,
      };

      const entityType = payload.data.entityType;

      // Track processed chunks to avoid duplicates
      const processedChunks = new Set();
      let aggregatedMessage = "";

      await handlePrompt(promptConfig, async (uuid, session, eventType, message) => {
        try {
          const eventId = `${uuid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          if (eventType === "message") {
            if (!processedChunks.has(message)) {
              processedChunks.add(message);
              aggregatedMessage += message;
              console.log(`Server received LLM message for uuid ${uuid}:`, message);
              console.log(`Aggregated message so far:`, aggregatedMessage);
              broadcastToChannel(channelName, "llm-draft", {
                id: uuid,
                userUuid,
                data: { content: message, entityType },
                timestamp: Date.now(),
                eventId,
              });
            } else {
              console.log(`Server skipped duplicate LLM message for uuid ${uuid}:`, message);
            }
          } else if (eventType === "EOM") {
            console.log(`Server received LLM EOM for uuid ${uuid}, final message:`, aggregatedMessage);
            broadcastToChannel(channelName, "llm-end", {
              id: uuid,
              userUuid,
              data: { end: true, entityType },
              timestamp: Date.now(),
              eventId,
            });
          } else if (eventType === "ERROR") {
            console.log(`Server received LLM error for uuid ${uuid}:`, message);
            socket.emit("message", { type: "error", message, timestamp: Date.now() });
          }
        } catch (err) {
          await logError(
            "error",
            `Error in handlePrompt for ${channelName}`,
            err.stack,
            userUuid,
            channelName,
            socket.id
          );
        }
      });
    } else {
      socket.emit("message", { type: "error", message: `Invalid LLM operation: ${type}`, timestamp: Date.now() });
    }
  } catch (err) {
    await logError(
      "error",
      `LLM operation failed for ${channelName} and type ${type}`,
      err.stack,
      userUuid,
      channelName,
      socket.id,
      { payload }
    );
    socket.emit("message", { type: "error", message: "Server error occurred", timestamp: Date.now() });
  }
}

async function loadAllEntities(channelName) {
  if (!isDbConnected()) return {};
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const entityTypes = collections
      .filter((col) => col.name.endsWith("Set"))
      .map((col) => col.name.replace("Set", ""));

    const state = {};
    for (const entityType of entityTypes) {
      state[entityType] = await loadStateFromServer(channelName, entityType);
    }
    return state;
  } catch (err) {
    await logError(
      "error",
      `Failed to load all entities for ${channelName}`,
      err.stack
    );
    return {};
  }
}

function createRealTimeServers(server, corsOptions) {
  const io = new Server(server, {
    cors: corsOptions || { origin: "*" },
    pingInterval: 5000,
    pingTimeout: 10000,
    maxHttpBufferSize: 1e9,
  });

  io.on("connection", (socket) => {
    socket.on("error", (error) => {
      logError(
        "error",
        `Socket error for ${socket.id}: ${error.message}`,
        error.stack,
        null,
        null,
        socket.id
      );
      if (error.message === "Max buffer size exceeded") {
        socket.emit("message", {
          type: "error",
          message: "Message too large",
          timestamp: Date.now(),
        });
      }
    });

    socket.on("join-channel", async (data) => {
      try {
        if (!validateJoinData(data)) {
          socket.emit("message", {
            type: "error",
            message: "Invalid channel name or data",
            timestamp: Date.now(),
          });
          return;
        }

        const { userUuid, displayName, channelName } = data;
        socket.join(channelName);
        socket.userUuid = userUuid;

        let channelDoc = isDbConnected()
          ? await getEntityModel("channel").findOne({ id: channelName }).lean()
          : null;
        if (!channelDoc) {
          channelDoc = await upsertChannel(channelName, userUuid, displayName);
        }

        const freshState = await loadAllEntities(channelName);

        if (!channels.has(channelName)) {
          channels.set(channelName, {
            users: {},
            sockets: {},
            state: freshState,
            locked: channelDoc.data.locked || false,
          });
        } else {
          const channel = channels.get(channelName);
          channel.state = freshState;
          channel.locked = channelDoc.data.locked || false;
        }

        const channel = channels.get(channelName);

        if (channelDoc.data.users) {
          channelDoc.data.users.forEach((user) => {
            if (!channel.users[user.userUuid]) {
              channel.users[user.userUuid] = {
                displayName: user.displayName,
                color: user.color || generateMutedDarkColor(),
                joinedAt: user.joinedAt,
              };
            }
          });
        }

        const userColor = channel.users[userUuid]?.color || generateMutedDarkColor();
        channel.users[userUuid] = {
          displayName,
          color: userColor,
          joinedAt: Date.now(),
        };
        channel.sockets[userUuid] = socket;

        await upsertChannel(channelName, userUuid, displayName);

        if (channel.locked) {
          socket.emit("message", {
            type: "error",
            message: "Channel is Locked",
            timestamp: Date.now(),
          });
          return;
        }

        const initStateMessage = {
          type: "init-state",
          id: null,
          userUuid,
          data: freshState,
          timestamp: Date.now(),
          serverTimestamp: Date.now(),
        };
        socket.emit("message", initStateMessage);

        broadcastToChannel(channelName, "user-list", { id: null, userUuid, data: null });
        broadcastToChannel(channelName, "user-joined", {
          id: null,
          userUuid,
          data: { displayName, color: userColor },
        });
      } catch (err) {
        await logError(
          "error",
          `Join channel error for ${data.channelName}`,
          err.stack,
          data.userUuid,
          data.channelName,
          socket.id
        );
        socket.emit("message", {
          type: "error",
          message: "Failed to join channel",
          timestamp: Date.now(),
        });
      }
    });

    socket.on("leave-channel", (data) => {
      try {
        if (!validateLeaveData(data)) return;
        cleanupUser(data.channelName, data.userUuid, socket);
      } catch (err) {
        logError(
          "error",
          `Leave channel error for ${data.channelName}`,
          err.stack,
          data.userUuid,
          data.channelName,
          socket.id
        );
      }
    });

    socket.on("disconnect", () => {
      try {
        for (const [channelName, channel] of channels) {
          if (channel.sockets[socket.userUuid]) {
            cleanupUser(channelName, socket.userUuid, socket);
            break;
          }
        }
      } catch (err) {
        logError(
          "error",
          `Disconnect error for socket ${socket.id}`,
          err.stack,
          socket.userUuid,
          null,
          socket.id
        );
      }
    });

    socket.on("message", async (data) => {
      try {
        await handleMessage(data, socket);
      } catch (err) {
        await logError(
          "error",
          `Message handling error for socket ${socket.id}`,
          err.stack,
          data?.userUuid,
          data?.channelName,
          socket.id,
          { data }
        );
        socket.emit("message", {
          type: "error",
          message: "Server error processing message",
          timestamp: Date.now(),
        });
      }
    });
  });

  return io;
}

async function handleMessage(dataObj, socket) {
  try {
    if (!validateMessage(dataObj)) {
      socket.emit("message", {
        type: "error",
        message: "Invalid channel name or message format",
        timestamp: Date.now(),
      });
      return;
    }

    const { id, userUuid, data, channelName, type } = dataObj;

    if (!channels.has(channelName) || !channels.get(channelName).sockets[userUuid]) {
      if (type !== "ping" && type !== "pong") {
        socket.emit("message", {
          type: "error",
          message: "Invalid channel or user",
          timestamp: Date.now(),
        });
        return;
      }
    }

    const channel = channels.get(channelName);

    switch (type) {
      case "ping":
        socket.emit("message", {
          type: "pong",
          id: null,
          userUuid,
          data: null,
          timestamp: Date.now(),
          serverTimestamp: Date.now(),
        });
        break;
      case "pong":
        break;
      case "leave-channel":
        break;
      case "room-lock-toggle":
        channel.locked = data.locked;
        broadcastToChannel(channelName, type, {
          id: null,
          userUuid,
          data: { locked: data.locked },
          timestamp: dataObj.timestamp,
        });
        channel.state = await loadAllEntities(channelName);
        break;
      default:
        if (type.startsWith("add-") || type.startsWith("update-") || type.startsWith("remove-")) {
          await handleEntityOperation(channelName, userUuid, type, { id, userUuid, data }, socket);
        } else if (type.startsWith("llm-")) {
          await handleLLMOperation(channelName, userUuid, type, { id, userUuid, data }, socket);
        } else {
          socket.emit("message", {
            type: "error",
            message: `Unknown message type: ${type}`,
            timestamp: Date.now(),
          });
        }
    }
  } catch (err) {
    await logError(
      "error",
      `Unhandled message error for socket ${socket.id}`,
      err.stack,
      dataObj?.userUuid,
      dataObj?.channelName,
      socket.id,
      { dataObj }
    );
    socket.emit("message", {
      type: "error",
      message: "Server error processing message",
      timestamp: Date.now(),
    });
  }
}

async function logError(
  level,
  message,
  stackTrace,
  userUuid = null,
  channelName = null,
  socketId = null,
  details = {}
) {
  try {
    const logEntry = new Log({
      timestamp: Date.now(),
      level,
      message,
      stackTrace,
      userUuid,
      channelName,
      socketId,
      details,
    });
    if (isDbConnected()) {
      await logEntry.save();
    }
    console.error(
      `[${level.toUpperCase()}] ${message} - Stack: ${stackTrace || "N/A"}`
    );
  } catch (logErr) {
    console.error("Failed to log error:", logErr);
  }
}

module.exports = { createRealTimeServers };