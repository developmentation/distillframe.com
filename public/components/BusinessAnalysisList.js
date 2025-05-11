export default {
    name: 'BusinessAnalysisList',
    props: {
      analyses: {
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
        <h3 class="text-xl font-semibold mb-4" :class="darkMode ? 'text-white' : 'text-gray-900'">Business Analyses</h3>
        <div class="flex-1 overflow-y-auto">
          <div v-if="analyses.length === 0" class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
            No business analyses generated yet.
          </div>
          <div v-else class="flex flex-col gap-2">
            <div
              v-for="analysis in analyses"
              :key="analysis.id"
              class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center cursor-pointer"
              @click="selectAnalysis(analysis.id)"
            >
              <div>
                <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
                  Analysis ID: {{ analysis.id }} | Video UUID: {{ analysis.data.videoUuid }} | Generated at {{ formatTime(analysis.timestamp) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
    mounted() {
      console.log('BusinessAnalysisList received analyses:', this.analyses);
    },
    watch: {
      analyses(newAnalyses) {
        console.log('BusinessAnalysisList analyses updated:', newAnalyses);
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
    },
  };