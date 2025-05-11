export default {
    name: 'BusinessAnalysisViewer',
    props: {
      analysis: {
        type: Object,
        default: null,
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
    },
    template: `
      <div class="flex flex-col h-full">
        <h3 class="text-xl font-semibold mb-4" :class="darkMode ? 'text-white' : 'text-gray-900'">Business Analysis Viewer</h3>
        <div class="flex-1 overflow-y-auto">
          <div v-if="analysis">
            <pre class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm whitespace-pre-wrap break-words" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">
              {{ analysis.data.markdown }}
            </pre>
          </div>
          <div v-else class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
            Select a business analysis to view its details.
          </div>
        </div>
      </div>
    `,
  };