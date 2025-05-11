// components/Chats.js
import { useGlobal } from "../composables/useGlobal.js";
import { useHistory } from "../composables/useHistory.js";
import { useRealTime } from "../composables/useRealTime.js";
import { useModels } from "../composables/useModels.js";

export default {
  name: "Chats",
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden md:flex-row">
      <!-- Chat Sessions Sidebar -->
      <div class="w-full md:w-1/4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <!-- Header with Pencil and Model Dropdown -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4 bg-gray-50 dark:bg-gray-900">
          <button
            @click="addChatSession"
            class="p-2 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm"
          >
            <i class="pi pi-pencil"></i>
          </button>
          <select
            v-model="selectedAgentId"
            class="flex-1 p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
          >
            <option v-for="agent in entities.agents" :key="agent.id" :value="agent.id">
              {{ agent.data.name }}
            </option>
          </select>
        </div>

        <!-- Sessions List (Accordion on Mobile, Full List on Desktop) -->
        <div class="flex-1 bg-gray-50 dark:bg-gray-900">
          <!-- Mobile: Accordion -->
          <div v-if="isMobile" class="flex flex-col h-full">
            <!-- Accordion Header -->
            <div
              class="p-4 flex items-center justify-between cursor-pointer bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
              @click="toggleAccordion"
            >
              <span class="text-gray-900 dark:text-white font-medium truncate">
                {{ currentSessionName || 'Chat Sessions' }}
              </span>
              <i :class="accordionIcon" class="text-gray-500 dark:text-gray-400 text-lg"></i>
            </div>
            <!-- Accordion Content -->
            <div
              v-if="isAccordionOpen"
              class="overflow-y-auto"
              style="max-height: 12rem;"
            >
              <div
                v-for="session in entities.chatSessions"
                :key="session.id"
                class="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
                :class="{ 'bg-blue-50 dark:bg-blue-900': activeSessionId === session.id }"
                @click="selectSession(session.id)"
              >
                <div class="flex-1 truncate">
                  <span v-if="isEditingSession !== session.id" class="text-gray-900 dark:text-white font-medium">
                    {{ session.data.name }}
                  </span>
                  <input
                    v-else
                    v-model="session.data.name"
                    type="text"
                    class="bg-transparent text-gray-900 dark:text-white flex-1 outline-none font-medium w-full"
                    @blur="updateChatSession(session)"
                    @keypress.enter="updateChatSession(session)"
                    :id="'session-input-' + session.id"
                  />
                </div>
                <div class="flex gap-2">
                  <button @click.stop="editSessionName(session)" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button @click.stop="deleteSession(session.id)" class="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-600">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </div>
              <div v-if="!entities.chatSessions.length" class="p-4 text-gray-500 dark:text-gray-400 text-center">
                No chat sessions yet. Create one to start chatting.
              </div>
            </div>
          </div>

          <!-- Desktop: Full List -->
          <div v-else class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div
              v-for="session in entities.chatSessions"
              :key="session.id"
              class="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
              :class="{ 'bg-blue-50 dark:bg-blue-900': activeSessionId === session.id }"
              @click="selectSession(session.id)"
            >
              <div class="flex-1 truncate">
                <span v-if="isEditingSession !== session.id" class="text-gray-900 dark:text-white font-medium">
                  {{ session.data.name }}
                </span>
                <input
                  v-else
                  v-model="session.data.name"
                  type="text"
                  class="bg-transparent text-gray-900 dark:text-white flex-1 outline-none font-medium w-full"
                  @blur="updateChatSession(session)"
                  @keypress.enter="updateChatSession(session)"
                  :id="'session-input-' + session.id"
                />
              </div>
              <div class="flex gap-2">
                <button @click.stop="editSessionName(session)" class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400">
                  <i class="pi pi-pencil"></i>
                </button>
                <button @click.stop="deleteSession(session.id)" class="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-600">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </div>
            <div v-if="!entities.chatSessions.length" class="p-4 text-gray-500 dark:text-gray-400 text-center">
              No chat sessions yet. Create one to start chatting.
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 flex flex-col relative">
        <!-- Messages -->
        <div
          ref="chatContainer"
          class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-6 pt-6 pb-4"
          :style="chatContainerStyle"
        >
          <div
            v-for="chat in activeChats"
            :key="chat.id"
            class="mb-6 p-4 rounded-lg shadow-sm"
            :class="[
              chat.data.isResponse ? 'bg-gray-100 dark:bg-gray-800 mr-auto' : 'bg-gray-100 dark:bg-gray-700 ml-auto',
              isMobile ? 'max-w-full' : 'max-w-[80%]'
            ]"
          >
            <!-- Header (Name, Timestamp, Buttons) -->
            <div class="flex items-center mb-2" :class="chat.data.isResponse ? 'justify-between' : 'justify-between flex-row-reverse'">
              <div class="flex items-center gap-2">
                <img
                  v-if="chat.data.isResponse && getAgent(chat.data.agentId)?.data?.imageUrl"
                  :src="getAgent(chat.data.agentId).data.imageUrl"
                  class="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600"
                  alt="Agent Avatar"
                />
                <span class="font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">
                  {{ chat.data.isResponse ? getAgent(chat.data.agentId)?.data?.name || 'Agent' : 'You' }}
                </span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatTime(chat.timestamp) }}
                </span>
                <button
                  @click.stop="copyMessage(chat.data.text)"
                  class="text-gray-400 hover:text-gray-200 rounded-full p-1"
                  :class="darkMode ? 'bg-gray-700' : 'bg-gray-200'"
                  title="Copy message"
                >
                  <i class="pi pi-copy text-sm"></i>
                </button>
                <button
                  @click.stop="redoMessage(chat.data.text)"
                  class="text-gray-400 hover:text-gray-200 rounded-full p-1"
                  :class="darkMode ? 'bg-gray-700' : 'bg-gray-200'"
                  title="Redo message"
                >
                  <i class="pi pi-refresh text-sm"></i>
                </button>
                <button
                  @click.stop="deleteMessage(chat.id)"
                  class="text-red-400 hover:text-red-300 rounded-full p-1"
                  :class="darkMode ? 'bg-gray-700' : 'bg-gray-200'"
                  title="Delete message"
                >
                  <i class="pi pi-times text-sm"></i>
                </button>
              </div>
            </div>
            <!-- Message Content -->
            <div class="markdown-body text-left" :class="darkMode ? 'text-gray-200' : 'text-gray-800'" v-html="renderMarkdown(chat.data.text)"></div>
          </div>
          <div v-if="!activeChats.length" class="text-gray-500 dark:text-gray-400 text-center py-12">
            No messages in this session. Select an agent and start chatting!
          </div>
        </div>

        <!-- Message Input (Fixed at Bottom) -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 w-full sticky bottom-0 z-10">
          <div class="flex gap-3">
            <textarea
              v-model="draft"
              rows="2"
              class="flex-1 p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all resize-none whitespace-pre-wrap"
              placeholder="Type a message..."
              @keypress.enter="handleEnterKey"
            ></textarea>
            <button
              @click="sendMessage"
              class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
              :disabled="!draft.trim() || !selectedAgentId || !activeSessionId || isSending"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup(props) {
    console.log("Chats.js setup called");
    const { entities } = useGlobal();
    const { addEntity, updateEntity, removeEntity } = useHistory();
    const { triggerLLM, userUuid } = useRealTime();
    const { models } = useModels();
    const activeSessionId = Vue.ref(null);
    const selectedAgentId = Vue.ref(null);
    const draft = Vue.ref("");
    const isSending = Vue.ref(false);
    const isEditingSession = Vue.ref(null);
    const chatContainer = Vue.ref(null);
    const isAutoScrollEnabled = Vue.ref(true);
    const isMobile = Vue.ref(false);
    const isAccordionOpen = Vue.ref(false);

    // Compute the current session name
    const currentSessionName = Vue.computed(() => {
      if (!activeSessionId.value) return null;
      const session = entities.value.chatSessions.find(s => s.id === activeSessionId.value);
      return session ? session.data.name : null;
    });

    // Compute chat container style based on mobile detection
    const chatContainerStyle = Vue.computed(() => ({
      maxHeight: isMobile.value ? 'calc(100vh - 22rem)' : 'calc(100vh - 13rem)',
    }));

    // Compute accordion icon based on open state
    const accordionIcon = Vue.computed(() =>
      isAccordionOpen.value ? 'pi pi-chevron-circle-up' : 'pi pi-chevron-circle-down'
    );

    // Detect mobile devices
    function detectMobile() {
      const mobileWidthThreshold = 768; // Tailwind's 'md' breakpoint
      isMobile.value = window.innerWidth <= mobileWidthThreshold;
    }

    // Toggle accordion
    function toggleAccordion() {
      isAccordionOpen.value = !isAccordionOpen.value;
    }

    // Initial detection and watch for resize
    Vue.onMounted(() => {
      detectMobile();
      window.addEventListener('resize', detectMobile);
      if (entities.value.agents.length > 0 && !selectedAgentId.value) {
        selectedAgentId.value = entities.value.agents[0].id;
      }
      if (chatContainer.value) {
        chatContainer.value.addEventListener('scroll', handleScroll);
      }
      window.addEventListener('resize', handleResize);
    });

    Vue.onUnmounted(() => {
      console.log("Chats.js unmounted");
      window.removeEventListener('resize', detectMobile);
      if (chatContainer.value) {
        chatContainer.value.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleResize);
    });

    const activeChats = Vue.computed(() => {
      if (!activeSessionId.value) return [];
      return entities.value.chats
        .filter((chat) => chat.data.chatSession === activeSessionId.value)
        .sort((a, b) => a.timestamp - b.timestamp);
    });

    // Dynamically switch Highlight.js theme based on darkMode
    Vue.watch(
      () => props.darkMode,
      (newDarkMode) => {
        const hljsLink = document.querySelector('link[rel="stylesheet"][href*="highlightjs"]');
        if (hljsLink) {
          hljsLink.href = newDarkMode
            ? 'https://unpkg.com/@highlightjs/cdn-assets@11.9.0/styles/dark.min.css'
            : 'https://unpkg.com/@highlightjs/cdn-assets@11.9.0/styles/default.min.css';
        }
      },
      { immediate: true }
    );

    // Watch for changes in the agents list and auto-select the first agent
    Vue.watch(
      () => entities.value.agents,
      (agents) => {
        if (agents.length > 0 && !selectedAgentId.value) {
          selectedAgentId.value = agents[0].id;
        }
      },
      { immediate: true }
    );

    // Method to copy message to clipboard
    function copyMessage(text) {
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => console.log('Message copied to clipboard:', text))
          .catch(err => {
            console.error('Clipboard API error:', err);
            fallbackCopy(text);
          });
      } else {
        fallbackCopy(text);
      }
    }

    function fallbackCopy(text) {
      const tempInput = document.createElement('input');
      document.body.appendChild(tempInput);
      tempInput.value = text;
      tempInput.select();
      try {
        document.execCommand('copy');
        console.log('Fallback: Message copied to clipboard:', text);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      } finally {
        document.body.removeChild(tempInput);
      }
    }

    // Method to redo a message (put it back in the draft)
    function redoMessage(text) {
      if (!text) return;
      draft.value = text;
    }

    // Method to delete a message
    function deleteMessage(id) {
      removeEntity("chats", id);
    }

    // Markdown rendering with Highlight.js and code block copy button
    function renderMarkdown(content) {
      if (!content) return '';
      try {
        let textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
        if (textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(textContent);
            textContent = '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
          } catch (e) {
            textContent = '```json\n' + textContent + '\n```';
          }
        }
        const md = markdownit({
          html: true,
          breaks: true,
          linkify: true,
          typographer: true,
          highlight: function (str, lang) {
            const code = lang && hljs.getLanguage(lang)
              ? hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
              : md.utils.escapeHtml(str);
            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
            return `<pre class="hljs relative"><code id="${codeId}">${code}</code><button class="copy-code-btn absolute top-2 right-2 text-gray-400 hover:text-gray-200 p-1" onclick="navigator.clipboard.writeText(document.getElementById('${codeId}').innerText).then(() => console.log('Code copied'))"><i class="pi pi-copy text-sm"></i></button></pre>`;
          }
        });
        return md.render(textContent);
      } catch (error) {
        console.error('Error in renderMarkdown:', error);
        return `<pre class="hljs"><code>${content}</code></pre>`;
      }
    }

    // Auto-scroll logic
    function handleScroll() {
      if (!chatContainer.value) return;
      const container = chatContainer.value;
      const threshold = 50; // Pixels from bottom to consider "docked"
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
      isAutoScrollEnabled.value = isAtBottom;
    }

    function handleResize() {
      if (chatContainer.value && isAutoScrollEnabled.value) {
        Vue.nextTick(() => {
          chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        });
      }
    }

    Vue.watch(activeChats, () => {
      if (chatContainer.value && isAutoScrollEnabled.value) {
        Vue.nextTick(() => {
          chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        });
      }
    }, { deep: true });

    Vue.watch(activeSessionId, (newId) => {
      if (newId && chatContainer.value && isAutoScrollEnabled.value) {
        Vue.nextTick(() => {
          chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        });
      }
    });

    function addChatSession() {
      console.log("addChatSession called");
      const id = addEntity("chatSessions", {
        name: `Session ${entities.value.chatSessions.length + 1}`,
      });
      activeSessionId.value = id;
      if (isMobile.value) {
        isAccordionOpen.value = false; // Collapse accordion on new session
      }
    }

    function selectSession(id) {
      console.log("selectSession called with id:", id);
      activeSessionId.value = id;
      isEditingSession.value = null;
      if (isMobile.value) {
        isAccordionOpen.value = false; // Collapse accordion on selection
      }
    }

    function editSessionName(session) {
      console.log("editSessionName called for session:", session.id);
      isEditingSession.value = session.id;
      Vue.nextTick(() => {
        const input = document.querySelector(`#session-input-${session.id}`);
        if (input) input.focus();
      });
    }

    function updateChatSession(session) {
      console.log("updateChatSession called for session:", session.id);
      updateEntity("chatSessions", session.id, { name: session.data.name });
      isEditingSession.value = null;
    }

    function deleteSession(id) {
      console.log("deleteSession called with id:", id);
      removeEntity("chatSessions", id);
      if (activeSessionId.value === id) {
        activeSessionId.value = entities.value.chatSessions[0]?.id || null;
      }
    }

    function handleEnterKey(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
      // Shift+Enter adds a new line naturally
    }

    function sendMessage() {
      if (!draft.value.trim() || !selectedAgentId.value || isSending.value)
        return;
      console.log(
        "sendMessage triggered with draft:",
        draft.value,
        "selectedAgentId:",
        selectedAgentId.value
      );
    
      isSending.value = true;
      const sessionId = activeSessionId.value;
      if (!sessionId) {
        console.log("No sessionId, aborting sendMessage");
        isSending.value = false;
        return;
      }
    
      // Add user message
      console.log("Adding user message for sessionId:", sessionId);
      const userChatId = addEntity("chats", {
        chatSession: sessionId,
        text: draft.value,
        isResponse: false,
      });
    
      // Add response placeholder
      console.log("Adding response placeholder for sessionId:", sessionId);
      const responseChatId = addEntity("chats", {
        chatSession: sessionId,
        text: "",
        isResponse: true,
        agentId: selectedAgentId.value,
        isStreaming: true,
      });
    
      // Build message history starting with system and user prompts
      const agent = entities.value.agents.find(
        (a) => a.id === selectedAgentId.value
      );
      const messageHistory = [];
    
      // Concatenate all system prompts into a single system message
      if (agent && agent.data.systemPrompts && agent.data.systemPrompts.length > 0) {
        const systemContent = agent.data.systemPrompts
          .map(prompt => prompt.content)
          .filter(content => content) // Filter out any null/undefined content
          .join("\n\n"); // Join with double newlines for separation
        if (systemContent) {
          messageHistory.push({
            role: "user",
            content: systemContent,
          });
        }
      }
    
      // Append all user prompts sequentially
      if (agent && agent.data.userPrompts && agent.data.userPrompts.length > 0) {
        agent.data.userPrompts.forEach(prompt => {
          if (prompt.content) {
            messageHistory.push({
              role: "user",
              content: prompt.content,
            });
          }
        });
      }
    
      // Append previous chats in the session
      messageHistory.push(...activeChats.value.map(chat => ({
        role: chat.data.isResponse ? "assistant" : "user",
        content: chat.data.text || "",
      })));
    
      // Add the current user message to the history
      messageHistory.push({
        role: "user",
        content: draft.value,
      });
    
      // Trigger LLM with agent's model and message history
      if (agent) {
        console.log("Triggering LLM for responseChatId:", responseChatId);
        const selectedModel = models.value.find(
          (m) => m.model === agent.data.model
        ) || {
          provider: "openai",
          name: "gpt-4o",
          model: "gpt-4o",
        };
    
        // Use the concatenated system prompt for the LLM call (as before)
        const systemPrompt = agent.data.systemPrompts && agent.data.systemPrompts.length > 0
          ? agent.data.systemPrompts.map(prompt => prompt.content).filter(content => content).join("\n\n")
          : "You are a helpful assistant.";
    
        try {
          triggerLLM(
            "chats",
            responseChatId,
            {
              provider: selectedModel.provider,
              name: selectedModel.name.en,
              model: selectedModel.model,
            },
            0.7,
            systemPrompt,
            draft.value,
            messageHistory, // Pass the updated message history
            false
          );
        } catch (error) {
          console.error("Error triggering LLM:", error);
          updateEntity("chats", responseChatId, {
            text: "Error: Unable to get response",
            isStreaming: false,
          });
        }
      } else {
        console.log(
          "No agent found for selectedAgentId:",
          selectedAgentId.value
        );
        updateEntity("chats", responseChatId, {
          text: "Error: No agent selected",
          isStreaming: false,
        });
      }
    
      draft.value = "";
      isSending.value = false;
    }

    function getAgent(agentId) {
      return entities.value.agents.find((a) => a.id === agentId);
    }

    function formatTime(timestamp) {
      if (!timestamp) return "";
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    Vue.watch(
      () => entities.value.chatSessions,
      (sessions) => {
        console.log("Chat sessions changed:", sessions);
        if (sessions.length && !activeSessionId.value) {
          activeSessionId.value = sessions[0].id;
        }
      },
      { immediate: true }
    );

    return {
      entities,
      activeSessionId,
      selectedAgentId,
      draft,
      isSending,
      isEditingSession,
      activeChats,
      addChatSession,
      selectSession,
      editSessionName,
      updateChatSession,
      deleteSession,
      sendMessage,
      getAgent,
      formatTime,
      copyMessage,
      redoMessage,
      deleteMessage,
      renderMarkdown,
      chatContainer,
      handleScroll,
      handleEnterKey,
      handleResize,
      chatContainerStyle,
      isMobile,
      isAccordionOpen,
      toggleAccordion,
      accordionIcon,
      currentSessionName,
    };
  },
};