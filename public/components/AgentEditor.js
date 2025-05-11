import { useModels } from '../composables/useModels.js';

export default {
  name: 'AgentEditor',
  props: {
    agents: {
      type: Array,
      required: true,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="flex flex-col h-full">
      <h3 class="text-xl font-semibold mb-4" :class="darkMode ? 'text-white' : 'text-gray-900'">Agent Editor</h3>
      <div class="flex-1 overflow-y-auto">
        <div v-if="agents.length === 0" class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
          No agents found.
        </div>
        <div v-else v-for="agent in agents" :key="agent.id" class="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-center">
            <h4 class="text-lg font-medium" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">{{ agent.data.name }}</h4>
            <div class="flex gap-2">
              <button @click="editAgent(agent)" class="py-1 px-3 bg-blue-500 dark:bg-blue-400 dark:hover:bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
                Edit
              </button>
              <button @click="removeAgent(agent.id)" class="py-1 px-3 bg-red-500 dark:bg-red-400 dark:hover:bg-red-600 hover:bg-red-600 text-white rounded-lg transition-all">
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Edit Modal -->
      <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg w-full max-w-xl max-h-[80vh] overflow-y-auto shadow-xl">
          <h2 class="text-xl font-semibold text-blue-500 dark:text-blue-400 mb-6">{{ editingAgent ? 'Edit Agent' : 'Add Agent' }}</h2>
          <div class="space-y-4">
            <div>
              <input
                v-model="agentName"
                @input="validateName"
                type="text"
                class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                placeholder="Agent name"
                :class="{ 'border-red-500': nameError }"
              />
              <span v-if="nameError" class="text-red-500 text-sm mt-1 block">{{ nameError }}</span>
            </div>
            <textarea
              v-model="agentPrompt"
              class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all h-32"
              placeholder="Enter prompt for image analysis"
            ></textarea>
            <select
              v-model="agentModel"
              class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
            >
              <option v-for="model in models" :key="model.model" :value="model.model">
                {{ model.name.en }} ({{ model.provider }})
              </option>
            </select>
          </div>
          <div class="mt-6 flex gap-3 justify-end">
            <button @click="closeModal" class="py-2 px-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-all">Cancel</button>
            <button @click="saveAgent" class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">Save</button>
          </div>
        </div>
      </div>
    </div>
  `,
  watch: {
    agents(newAgents) {
      console.log('AgentEditor agents prop updated:', newAgents);
    },
  },
  setup(props, { emit }) {
    const { models } = useModels();

    const agentName = Vue.ref('');
    const agentPrompt = Vue.ref('');
    const agentModel = Vue.ref('gemini-1.5-flash');
    const nameError = Vue.ref('');
    const isModalOpen = Vue.ref(false);
    const editingAgent = Vue.ref(null);

    // Debug log to confirm agents received
    console.log('AgentEditor received agents on render:', props.agents);

    function validateName() {
      if (!/^[a-zA-Z0-9_]+$/.test(agentName.value)) {
        nameError.value = 'Name must contain only letters, numbers, or underscores, no spaces.';
      } else {
        nameError.value = '';
      }
    }

    function editAgent(agent) {
      agentName.value = agent.data.name;
      agentPrompt.value = agent.data.prompt || '';
      agentModel.value = agent.data.model || 'gemini-1.5-flash';
      editingAgent.value = agent;
      isModalOpen.value = true;
    }

    function removeAgent(agentId) {
      emit('remove-agent', agentId);
    }

    function closeModal() {
      isModalOpen.value = false;
      editingAgent.value = null;
      nameError.value = '';
    }

    function saveAgent() {
      if (nameError.value || !agentName.value.trim()) return;

      const updatedAgents = [...props.agents];
      const agentData = {
        id: editingAgent.value?.id || uuidv4(),
        name: agentName.value,
        prompt: agentPrompt.value,
        model: agentModel.value,
      };

      if (editingAgent.value) {
        const index = updatedAgents.findIndex(a => a.id === editingAgent.value.id);
        updatedAgents[index] = { ...updatedAgents[index], data: agentData };
      } else {
        updatedAgents.push({ id: agentData.id, data: agentData });
      }

      emit('update-agents', updatedAgents);
      closeModal();
    }

    return {
      agentName,
      agentPrompt,
      agentModel,
      nameError,
      isModalOpen,
      editingAgent,
      models,
      validateName,
      editAgent,
      removeAgent,
      closeModal,
      saveAgent,
    };
  },
};