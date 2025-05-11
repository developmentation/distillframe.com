import { useGlobal } from '../composables/useGlobal.js';
import { useHistory } from '../composables/useHistory.js';
import { useModels } from '../composables/useModels.js';

export default {
  name: 'Agents',
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-8 flex justify-between items-center">
        <h2 class="text-2xl font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">Manage AI Agents</h2>
        <button @click="openEditModal()" class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all">
          Add New Agent
        </button>
      </div>

      <!-- Agents Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="agent in entities.agents"
          :key="agent.id"
          class="relative h-48 rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105"
          :style="{ backgroundImage: \`url(\${agent.data.imageUrl ? agent.data.imageUrl : '/assets/aiagent\${agent.data.placeholderImage || 1}.jpg'})\`, backgroundSize: 'cover', backgroundPosition: 'center' }"
        >
          <div class="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent"></div>
          <div class="relative z-10 flex flex-col h-full p-4 justify-between">
            <div>
              <h3 class="text-xl font-semibold text-white">{{ agent.data.name }}</h3>
              <p class="text-gray-300 text-sm mt-1 line-clamp-2">{{ agent.data.description }}</p>
            </div>
            <div class="flex justify-end gap-2">
              <button @click.stop="openEditModal(agent)" class="py-1 px-3 bg-blue-500 dark:bg-blue-400 dark:hover:bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
                Edit
              </button>
              <button @click.stop="removeAgent(agent.id)" class="py-1 px-3 bg-red-500 dark:bg-red-400 dark:hover:bg-red-600 hover:bg-red-600 text-white rounded-lg transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
        <div v-if="!entities.agents.length" class="col-span-full text-center py-12" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
          No agents created yet. Click "Add New Agent" to get started.
        </div>
      </div>

      <!-- Edit Modal -->
      <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
          <h2 class="text-xl font-semibold text-blue-500 dark:text-blue-400 mb-6">{{ editingAgent ? 'Edit Agent' : 'Add Agent' }}</h2>
          
          <!-- Responsive Grid: Two columns on desktop, single column on mobile -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Left Column: Agent Info -->
            <div class="space-y-6">
              <div>
                <input
                  v-model="agentName"
                  @input="validateName"
                  type="text"
                  class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                  placeholder="Agent name (letters, numbers, underscores only, no spaces)"
                  :class="{ 'border-red-500': nameError }"
                />
                <span v-if="nameError" class="text-red-500 text-sm mt-1 block">{{ nameError }}</span>
              </div>
              <textarea
                v-model="agentDescription"
                class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all h-32"
                placeholder="Description (e.g., Analyzes images for structured data)"
              ></textarea>
              <input
                v-model="agentImageUrl"
                type="text"
                class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                placeholder="Image URL for avatar (optional)"
              />
              <div>
                <label class="text-gray-700 dark:text-gray-300 mb-2 block font-medium">Select Model</label>
                <select
                  v-model="agentModel"
                  class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                >
                  <option v-for="model in models" :key="model.model" :value="model.model">
                    {{ model.name.en }} ({{ model.provider }})
                  </option>
                </select>
              </div>
            </div>

            <!-- Right Column: System and User Prompts -->
            <div class="space-y-6">
              <!-- System Prompts -->
              <div>
                <h3 class="text-gray-700 dark:text-gray-300 mb-3 font-medium">System Prompts</h3>
                <table class="w-full text-left border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead>
                    <tr class="bg-gray-100 dark:bg-gray-700">
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Type</th>
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Content</th>
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(prompt, index) in systemPrompts" :key="prompt.id" class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td class="py-3 px-4">
                        <select v-model="prompt.type" class="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-1 w-full border border-gray-200 dark:border-gray-600">
                          <option value="text">Text</option>
                        </select>
                      </td>
                      <td class="py-3 px-4">
                        <button @click="openPromptModal('system', index, prompt.content)" class="py-1 px-3 bg-blue-500 dark:bg-blue-400 dark:hover:bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
                          Edit
                        </button>
                      </td>
                      <td class="py-3 px-4">
                        <button @click="removePrompt('system', index)" class="text-red-500 hover:text-red-600">
                          <i class="pi pi-times"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <button @click="addPrompt('system')" class="mt-3 py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">
                  Add System Prompt
                </button>
              </div>

              <!-- User Prompts -->
              <div>
                <h3 class="text-gray-700 dark:text-gray-300 mb-3 font-medium">User Prompts</h3>
                <table class="w-full text-left border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead>
                    <tr class="bg-gray-100 dark:bg-gray-700">
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Type</th>
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Content</th>
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(prompt, index) in userPrompts" :key="prompt.id" class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td class="py-3 px-4">
                        <select v-model="prompt.type" class="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-1 w-full border border-gray-200 dark:border-gray-600">
                          <option value="text">Text</option>
                        </select>
                      </td>
                      <td class="py-3 px-4">
                        <button @click="openPromptModal('user', index, prompt.content)" class="py-1 px-3 bg-blue-500 dark:bg-blue-400 dark:hover:bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
                          Edit
                        </button>
                      </td>
                      <td class="py-3 px-4">
                        <button @click="removePrompt('user', index)" class="text-red-500 hover:text-red-600">
                          <i class="pi pi-times"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <button @click="addPrompt('user')" class="mt-3 py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">
                  Add User Prompt
                </button>
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="mt-6 flex gap-3 justify-end">
            <button @click="closeModal" class="py-2 px-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-all">Cancel</button>
            <button @click="saveAgent" class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">Save</button>
          </div>
        </div>
      </div>

      <!-- Prompt Editing Modal -->
      <div v-if="isPromptModalOpen" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg w-full max-w-xl max-h-[80vh] overflow-y-auto shadow-xl">
          <h2 class="text-xl font-semibold text-blue-500 dark:text-blue-400 mb-6">Edit Prompt</h2>
          <textarea
            v-model="promptContent"
            class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all h-64"
            placeholder="Enter prompt for image analysis (e.g., Analyze this image and return JSON with a description field)"
          ></textarea>
          <div class="mt-6 flex gap-3 justify-end">
            <button @click="closePromptModal" class="py-2 px-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-all">Cancel</button>
            <button @click="savePrompt" class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">Save</button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const { entities } = useGlobal();
    const { addEntity, updateEntity, removeEntity } = useHistory();
    const { models } = useModels();

    const agentName = Vue.ref('');
    const agentDescription = Vue.ref('');
    const agentImageUrl = Vue.ref('');
    const agentModel = Vue.ref('gemini-1.5-flash'); // Default to Gemini 1.5 Flash
    const systemPrompts = Vue.ref([]);
    const userPrompts = Vue.ref([]);
    const nameError = Vue.ref('');
    const editErrors = Vue.ref({});
    const isModalOpen = Vue.ref(false);
    const isPromptModalOpen = Vue.ref(false);
    const editingAgent = Vue.ref(null);
    const agentId = Vue.ref('');
    const promptType = Vue.ref('');
    const promptIndex = Vue.ref(null);
    const promptContent = Vue.ref('');

    function addAgentWithPlaceholder() {
      if (nameError.value || !agentName.value.trim()) return;
      addEntity('agents', {
        name: agentName.value,
        description: agentDescription.value,
        imageUrl: agentImageUrl.value,
        model: agentModel.value,
        systemPrompts: systemPrompts.value,
        userPrompts: userPrompts.value,
        placeholderImage: Math.floor(Math.random() * 10) + 1,
      });
      closeModal();
    }

    function validateName() {
      if (!/^[a-zA-Z0-9_]+$/.test(agentName.value)) {
        nameError.value = 'Name must contain only letters, numbers, or underscores, no spaces.';
      } else {
        nameError.value = '';
      }
    }

    function validateEditName(agent) {
      if (!/^[a-zA-Z0-9_]+$/.test(agent.data.name)) {
        editErrors.value[agent.id] = 'Invalid name';
      } else {
        delete editErrors.value[agent.id];
      }
    }

    function openEditModal(agent = null) {
      if (agent) {
        editingAgent.value = agent;
        agentId.value = agent.id;
        agentName.value = agent.data.name;
        agentDescription.value = agent.data.description;
        agentImageUrl.value = agent.data.imageUrl || '';
        agentModel.value = agent.data.model || 'gemini-1.5-flash';
        systemPrompts.value = agent.data.systemPrompts ? [...agent.data.systemPrompts] : [];
        userPrompts.value = agent.data.userPrompts ? [...agent.data.userPrompts] : [];
      } else {
        editingAgent.value = null;
        agentId.value = uuidv4();
        agentName.value = '';
        agentDescription.value = '';
        agentImageUrl.value = '';
        agentModel.value = 'gemini-1.5-flash';
        systemPrompts.value = [];
        userPrompts.value = [];
      }
      isModalOpen.value = true;
      validateName();
    }

    function closeModal() {
      isModalOpen.value = false;
      editingAgent.value = null;
    }

    function addPrompt(type) {
      const prompts = type === 'system' ? systemPrompts : userPrompts;
      prompts.value.push({ id: uuidv4(), type: 'text', content: '' });
    }

    function removePrompt(type, index) {
      const prompts = type === 'system' ? systemPrompts : userPrompts;
      prompts.value.splice(index, 1);
    }

    function openPromptModal(type, index, content) {
      promptType.value = type;
      promptIndex.value = index;
      promptContent.value = content || '';
      isPromptModalOpen.value = true;
    }

    function closePromptModal() {
      isPromptModalOpen.value = false;
      promptType.value = '';
      promptIndex.value = null;
      promptContent.value = '';
    }

    function savePrompt() {
      if (promptType.value && promptIndex.value !== null) {
        const prompts = promptType.value === 'system' ? systemPrompts : userPrompts;
        prompts.value[promptIndex.value] = { ...prompts.value[promptIndex.value], content: promptContent.value };
      }
      closePromptModal();
    }

    function updateAgent(agent) {
      if (editErrors.value[agent.id]) return;
      updateEntity('agents', agent.id, {
        name: agent.data.name,
        description: agent.data.description,
        imageUrl: agent.data.imageUrl,
        model: agent.data.model,
        systemPrompts: agent.data.systemPrompts,
        userPrompts: agent.data.userPrompts,
        placeholderImage: agent.data.placeholderImage,
      });
    }

    function saveAgent() {
      if (nameError.value) return;
      if (editingAgent.value) {
        updateEntity('agents', agentId.value, {
          name: agentName.value,
          description: agentDescription.value,
          imageUrl: agentImageUrl.value,
          model: agentModel.value,
          systemPrompts: systemPrompts.value,
          userPrompts: userPrompts.value,
          placeholderImage: editingAgent.value.data.placeholderImage,
        });
      } else {
        addAgentWithPlaceholder();
      }
      closeModal();
    }

    function removeAgent(id) {
      removeEntity('agents', id);
    }

    // Ensure Gemini models are available
    Vue.onMounted(() => {
      if (!models.value.some(m => m.model === 'gemini-1.5-flash')) {
        models.value.push({
          name: { en: 'Gemini 1.5 Flash', fr: 'Gemini 1.5 Flash' },
          model: 'gemini-1.5-flash',
          provider: 'google',
        });
      }
      if (!models.value.some(m => m.model === 'gemini-2.5-pro-preview-05-06')) {
        models.value.push({
          name: { en: 'Gemini 2.5 Pro Preview', fr: 'Gemini 2.5 Pro Preview' },
          model: 'gemini-2.5-pro-preview-05-06',
          provider: 'google',
        });
      }
    });

    return {
      entities,
      agentName,
      agentDescription,
      agentImageUrl,
      agentModel,
      systemPrompts,
      userPrompts,
      nameError,
      editErrors,
      isModalOpen,
      isPromptModalOpen,
      editingAgent,
      agentId,
      promptType,
      promptIndex,
      promptContent,
      models,
      validateName,
      validateEditName,
      openEditModal,
      closeModal,
      addPrompt,
      removePrompt,
      openPromptModal,
      closePromptModal,
      savePrompt,
      updateAgent,
      saveAgent,
      removeAgent,
    };
  },
};