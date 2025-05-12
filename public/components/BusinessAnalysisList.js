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
              <div @click="selectAnalysis(analysis.id)" class="flex-1">
                <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
                  Analysis ID: {{ analysis.id }} | Video UUID: {{ analysis.data.videoUuid }} | Generated at {{ formatTime(analysis.timestamp) }}
                </p>
              </div>
              <div class="flex gap-2">
                <!-- Download Icon -->
                <button @click="downloadAnalysis(analysis)" class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                </button>
                <!-- Delete Icon -->
                <button @click="deleteAnalysis(analysis.id)" class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
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
    data() {
      return {
        selectedBusinessAgent: null,
        isGenerating: false,
      };
    },
    mounted() {
      console.log('BusinessAnalysisList received analyses:', this.analyses);
      if (this.entities.agents.length > 0) {
        this.selectedBusinessAgent = this.entities.agents[0].id;
      }
    },
    watch: {
      analyses(newAnalyses) {
        console.log('BusinessAnalysisList analyses updated:', newAnalyses);
      },
      'entities.agents': {
        handler(newAgents) {
          if (!newAgents.some(agent => agent.id === this.selectedBusinessAgent)) {
            this.selectedBusinessAgent = newAgents.length > 0 ? newAgents[0].id : null;
          }
        },
        deep: true,
      },
    },
    methods: {
      selectAnalysis(analysisId) {
        this.$emit('select-analysis', analysisId);
      },
      formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
      },
      async generateBusinessAnalysis() {
        if (!this.entities.image.length || !this.selectedBusinessAgent) return;

        this.isGenerating = true;
        try {
          await this.$emit('generate-business-analysis', this.selectedBusinessAgent);
        } finally {
          this.isGenerating = false;
        }
      },
      deleteAnalysis(analysisId) {
        this.$emit('delete-analysis', analysisId);
      },
      downloadAnalysis(analysis) {
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
      },
    },
};