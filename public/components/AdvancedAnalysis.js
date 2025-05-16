import BusinessAnalysisList from './BusinessAnalysisList.js';
import BusinessAnalysisViewer from './BusinessAnalysisViewer.js';

export default {
  name: 'AdvancedAnalysis',
  components: { BusinessAnalysisList, BusinessAnalysisViewer },
  props: {
  entities: {
    type: Object,
    required: true,
  },
  selectedAgents: {
    type: Array,
    required: true,
  },
  projectPrompt: {
    type: String,
    required: true,
  },
  darkMode: {
    type: Boolean,
    default: false,
  },
  updateEntity: {
    type: Function,
    required: true,
  },
  selectedBusinessAnalysis: {
    type: Object,
    default: null,
  }
},
  setup(props, { emit }) {
    const customPrompt = Vue.ref('');
    const selectedBusinessAgent = Vue.ref(null);
    const isGenerating = Vue.ref(false);
    const selectedArtifacts = Vue.ref({
      projectPrompt: false,
      transcriptions: [],
      frameAnalyses: {},
      businessAnalyses: [],
    });

    const selectedAnalysis = Vue.computed(() => {
    return props.entities.businessAnalysis.find(a => a.id === props.selectedBusinessAnalysis?.id) || null;
    });

    Vue.watch(
      () => props.entities.agents,
      (newAgents) => {
        if (!newAgents.some(agent => agent.id === selectedBusinessAgent.value)) {
          selectedBusinessAgent.value = newAgents.length > 0 ? newAgents[0].id : null;
        }
      },
      { deep: true }
    );

    Vue.watch(
      () => props.entities.image,
      (newImages) => {
        const frameAnalyses = {};
        newImages.forEach(image => {
          frameAnalyses[image.id] = selectedArtifacts.value.frameAnalyses[image.id] || [];
        });
        selectedArtifacts.value.frameAnalyses = frameAnalyses;
      },
      { deep: true }
    );

    Vue.onMounted(() => {
      if (props.entities.agents.length > 0) {
        selectedBusinessAgent.value = props.entities.agents[0].id;
      }
      props.entities.image.forEach(image => {
        if (!selectedArtifacts.value.frameAnalyses[image.id]) {
          selectedArtifacts.value.frameAnalyses[image.id] = [];
        }
      });
    });

    function formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
    }

    function toggleFrameRow(frameId) {
      const currentAgents = selectedArtifacts.value.frameAnalyses[frameId] || [];
      const allAgents = props.entities.agents.map(agent => agent.id);
      const allSelected = allAgents.every(agentId => currentAgents.includes(agentId));
      if (allSelected) {
        selectedArtifacts.value.frameAnalyses[frameId] = [];
      } else {
        selectedArtifacts.value.frameAnalyses[frameId] = [...allAgents];
      }
      selectedArtifacts.value.frameAnalyses = { ...selectedArtifacts.value.frameAnalyses };
    }

    function toggleAgentColumn(agentId) {
      const allFrames = props.entities.image.map(frame => frame.id);
      const allSelected = allFrames.every(frameId => 
        (selectedArtifacts.value.frameAnalyses[frameId] || []).includes(agentId)
      );
      allFrames.forEach(frameId => {
        if (allSelected) {
          selectedArtifacts.value.frameAnalyses[frameId] = 
            (selectedArtifacts.value.frameAnalyses[frameId] || []).filter(id => id !== agentId);
        } else if (!(selectedArtifacts.value.frameAnalyses[frameId] || []).includes(agentId)) {
          selectedArtifacts.value.frameAnalyses[frameId] = [
            ...(selectedArtifacts.value.frameAnalyses[frameId] || []),
            agentId,
          ];
        }
      });
      selectedArtifacts.value.frameAnalyses = { ...selectedArtifacts.value.frameAnalyses };
    }

    async function runAdvancedAnalysis() {
      if (!selectedBusinessAgent.value) return;

      isGenerating.value = true;
      try {
        emit('generate-business-analysis', selectedBusinessAgent.value, customPrompt.value, selectedArtifacts.value);
      } finally {
        isGenerating.value = false;
      }
    }

    return {
        props,
      customPrompt,
      selectedBusinessAgent,
      isGenerating,
      selectedArtifacts,
      selectedAnalysis,
      formatTime,
      toggleFrameRow,
      toggleAgentColumn,
      runAdvancedAnalysis,
    };
  },
  template: `
    <div class="flex flex-col gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h3 class="text-xl font-semibold mb-4" :class="darkMode ? 'text-white' : 'text-gray-900'">Advanced Analysis</h3>
        <!-- Custom Prompt -->
        <div class="mb-4">
          <label class="text-gray-700 dark:text-gray-300 block mb-2">Custom Prompt</label>
          <textarea
            v-model="customPrompt"
            class="w-full h-32 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
            placeholder="Enter your custom prompt for the business analysis..."
          ></textarea>
        </div>
        <!-- Project Prompt Selection -->
        <div class="mb-4">
          <label class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              v-model="selectedArtifacts.projectPrompt"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            Include Project Prompt
          </label>
        </div>
        <!-- Transcriptions Selection -->
        <div class="mb-4">
          <h4 class="text-lg font-medium mb-2" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">Transcriptions</h4>
          <div v-if="!entities.media.length" class="text-gray-500 dark:text-gray-400">No transcriptions available.</div>
          <div v-else class="flex flex-col gap-2">
            <label
              v-for="media in entities.media"
              :key="media.id"
              class="flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <input
                type="checkbox"
                :value="media.id"
                v-model="selectedArtifacts.transcriptions"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              {{ media.data.name }} ({{ media.data.type }})
            </label>
          </div>
        </div>
        <!-- Frame Analyses Selection -->
        <div class="mb-4">
          <h4 class="text-lg font-medium mb-2" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">Frame Analyses</h4>
          <div v-if="!entities.image.length" class="text-gray-500 dark:text-gray-400">No frames available.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm text-left text-gray-700 dark:text-gray-300">
              <thead class="text-xs uppercase bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th class="px-4 py-2">Frame</th>
                  <th
                    v-for="agent in entities.agents"
                    :key="agent.id"
                    class="px-4 py-2 cursor-pointer"
                    :class="darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-700 hover:text-blue-600'"
                    @click="toggleAgentColumn(agent.id)"
                    title="Select all"
                  >
                    {{ agent.data.name }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="frame in entities.image" :key="frame.id" class="border-b dark:border-gray-700">
                  <td
                    class="px-4 py-2 cursor-pointer"
                    :class="darkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-700 hover:text-blue-600'"
                    @click="toggleFrameRow(frame.id)"
                    title="Select all"
                  >
                    Frame at {{ frame.data.timestamp.toFixed(2) }}s
                  </td>
                  <td v-for="agent in entities.agents" :key="agent.id" class="px-4 py-2">
                    <input
                      type="checkbox"
                      :value="agent.id"
                      v-model="selectedArtifacts.frameAnalyses[frame.id]"
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Business Analyses Selection -->
        <div class="mb-4">
          <h4 class="text-lg font-medium mb-2" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">Previous Business Analyses</h4>
          <div v-if="!entities.businessAnalysis.length" class="text-gray-500 dark:text-gray-400">No business analyses available.</div>
          <div v-else class="flex flex-col gap-2">
            <label
              v-for="analysis in entities.businessAnalysis"
              :key="analysis.id"
              class="flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <input
                type="checkbox"
                :value="analysis.id"
                v-model="selectedArtifacts.businessAnalyses"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
                             {{ analysis.data?.name || 'Analysis ID: ' + analysis.id }}
 
            </label>
          </div>
        </div>
        <!-- Agent Selection and Run Button -->
        <div class="flex flex-col gap-2">
          <label class="text-gray-700 dark:text-gray-300">Select Agent for Advanced Analysis:</label>
          <select
            v-model="selectedBusinessAgent"
            class="w-full p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
            :disabled="isGenerating"
          >
            <option v-if="entities.agents.length === 0" disabled>No agents available</option>
            <option v-for="agent in entities.agents" :key="agent.id" :value="agent.id">
              {{ agent.data.name }}
            </option>
          </select>
          <button
            @click="runAdvancedAnalysis"
            class="w-full py-2 px-4 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-all flex items-center justify-center gap-2"
            :class="{ 'opacity-50 cursor-not-allowed': isGenerating || !selectedBusinessAgent }"
            :disabled="isGenerating || !selectedBusinessAgent"
          >
            <span v-if="isGenerating" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
            <span>Run Advanced Analysis</span>
          </button>
        </div>
      </div>
      <!-- Analysis List and Viewer -->
      <div class="flex flex-col md:flex-row gap-4">
        <div class="md:w-1/2">
          <business-analysis-list
            :analyses="entities.businessAnalysis"
            :selected-agents="selectedAgents"
            :entities="entities"
            :project-prompt="projectPrompt"
            :updateEntity="props.updateEntity"
            @select-analysis="$emit('select-analysis', $event)"
            @generate-business-analysis="$emit('generate-business-analysis', $event)"
            @delete-analysis="$emit('delete-analysis', $event)"
            :dark-mode="darkMode"
          />
        </div>
        <div class="md:w-1/2">
          <business-analysis-viewer
            :analysis="selectedAnalysis"
            :dark-mode="darkMode"
          />
        </div>
      </div>
    </div>
  `,
};