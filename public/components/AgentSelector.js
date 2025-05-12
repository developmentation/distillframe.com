export default {
  name: 'AgentSelector',
  props: {
    allAgents: {
      type: Array,
      required: true,
    },
    selectedAgents: {
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
      <h3 class="text-xl font-semibold mb-4" :class="darkMode ? 'text-white' : 'text-gray-900'">Agent Selector</h3>
      <div class="flex-1 overflow-y-auto">
        <div v-if="allAgents.length === 0" class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
          No agents available.
        </div>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="agent in allAgents"
            :key="agent.id"
            class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center"
          >
            <div>
              <h4 class="text-lg font-medium" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">
                {{ agent.data.name }}
              </h4>
              <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
                {{ agent.data.description || 'No description' }}
              </p>
            </div>
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                :checked="isAgentSelected(agent.id)"
                @change="toggleAgent(agent.id)"
                class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  `,
  methods: {
    isAgentSelected(agentId) {
      return this.selectedAgents.includes(agentId);
    },
    toggleAgent(agentId) {
      this.$emit('toggle-agent', agentId);
    },
  },
  mounted() {
    console.log('AgentSelector allAgents:', this.allAgents);
    console.log('AgentSelector selectedAgents:', this.selectedAgents);
  },
};