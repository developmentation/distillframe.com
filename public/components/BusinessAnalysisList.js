export default {
  name: 'BusinessAnalysisList',
  props: {
    analyses: {
      type: Array,
      required: true,
    },
    selectedAgents: {
      type: Array,
      required: true,
    },
    entities: {
      type: Object,
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
  },
  setup(props, { emit }) {
    const selectedBusinessAgent = Vue.ref(null);
    const isGenerating = Vue.ref(false);
    const editingAnalysisId = Vue.ref(null);
    const editingName = Vue.ref('');

    Vue.onMounted(() => {
      console.log('BusinessAnalysisList received analyses:', props.analyses);
      if (props.entities.agents.length > 0) {
        selectedBusinessAgent.value = props.entities.agents[0].id;
      }
    });

    Vue.watch(
      () => props.analyses,
      (newAnalyses) => {
        console.log('BusinessAnalysisList analyses updated:', newAnalyses);
      }
    );

    Vue.watch(
      () => props.entities.agents,
      (newAgents) => {
        if (!newAgents.some(agent => agent.id === selectedBusinessAgent.value)) {
          selectedBusinessAgent.value = newAgents.length > 0 ? newAgents[0].id : null;
        }
      },
      { deep: true }
    );

    function selectAnalysis(analysisId) {
      emit('select-analysis', analysisId);
    }

    function formatTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
    }

    async function generateBusinessAnalysis() {
      if (!props.entities.image.length || !selectedBusinessAgent.value) return;

      isGenerating.value = true;
      try {
        emit('generate-business-analysis', selectedBusinessAgent.value);
      } finally {
        isGenerating.value = false;
      }
    }

    function deleteAnalysis(analysisId) {
      emit('delete-analysis', analysisId);
    }

    function downloadAnalysis(analysis) {
      const markdown = analysis.data.markdown || '';
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-analysis-${analysis.id}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function startEditing(analysis) {
      editingAnalysisId.value = analysis.id;
      editingName.value = analysis.data.name || `Analysis ID: ${analysis.id}`;
    }

    function saveName(analysis) {
      if (editingName.value.trim()) {
        props.updateEntity('businessAnalysis', analysis.id, {
          ...analysis.data,
          name: editingName.value.trim(),
        });
      }
      editingAnalysisId.value = null;
      editingName.value = '';
    }

    return {
      selectedBusinessAgent,
      isGenerating,
      editingAnalysisId,
      editingName,
      selectAnalysis,
      formatTime,
      generateBusinessAnalysis,
      deleteAnalysis,
      downloadAnalysis,
      startEditing,
      saveName,
    };
  },
  template: `
    <div class="flex flex-col h-full">
      <h3 class="text-xl font-semibold mb-4" :class="darkMode ? 'text-white' : 'text-gray-900'">Business Analyses</h3>
      <!-- Generate Business Analysis Section -->
      <div class="mb-4 flex flex-col gap-2">
        <div v-if="isGenerating" class="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-center text-sm" :class="darkMode ? 'text-yellow-300' : 'text-yellow-700'">
          Generation in process, please wait
        </div>
        <label class="text-gray-700 dark:text-gray-300">Select Agent for Business Analysis:</label>
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
          @click="generateBusinessAnalysis"
          class="w-full py-2 px-4 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-all flex items-center justify-center gap-2"
          :class="{ 'opacity-50 cursor-not-allowed': isGenerating || entities.image.length === 0 || !selectedBusinessAgent }"
          :disabled="isGenerating || entities.image.length === 0 || !selectedBusinessAgent"
        >
          <span v-if="isGenerating" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
          <span>Generate Business Analysis</span>
        </button>
      </div>
      <!-- Business Analysis List -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="analyses.length === 0" class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
          No business analyses generated yet.
        </div>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="analysis in analyses"
            :key="analysis.id"
            class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center cursor-pointer"
          >
            <div class="flex-1">
              <div v-if="editingAnalysisId === analysis.id" class="flex items-center gap-2">
                <input
                  v-model="editingName"
                  @blur="saveName(analysis)"
                  @keyup.enter="saveName(analysis)"
                  class="p-1 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:outline-none"
                  :class="darkMode ? 'text-gray-200' : 'text-gray-800'"
                />
              </div>
              <div v-else @click="selectAnalysis(analysis.id)" class="flex-1">
                <p class="text-sm font-medium" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">
                  {{ analysis.data.name || 'Analysis ID: ' + analysis.id }}
                </p>
                <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
                  Video UUID: {{ analysis.data.videoUuid }} | Generated at {{ formatTime(analysis.timestamp) }}
                </p>
              </div>
            </div>
            <div class="flex gap-2">
              <!-- Edit Icon -->
              <button
                v-if="editingAnalysisId !== analysis.id"
                @click.stop="startEditing(analysis)"
                class="text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <!-- Download Icon -->
              <button @click.stop="downloadAnalysis(analysis)" class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
              </button>
              <!-- Delete Icon -->
              <button @click.stop="deleteAnalysis(analysis.id)" class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};