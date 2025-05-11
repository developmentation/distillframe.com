export default {
    name: 'JsonViewer',
    props: {
      frame: {
        type: Object,
        default: null,
      },
      businessAnalysis: {
        type: [Object, String, null],
        default: null,
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
    },
    template: `
      <div class="flex flex-col h-full">
        <h3 class="text-xl font-semibold mb-4" :class="darkMode ? 'text-white' : 'text-gray-900'">Analysis Output</h3>
        <div class="flex-1 overflow-y-auto">
          <div v-if="frame || businessAnalysis">
            <pre class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm whitespace-pre-wrap break-words" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">
              {{ displayData }}
            </pre>
          </div>
          <div v-else class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
            Select a frame or generate a business analysis to view results.
          </div>
        </div>
      </div>
    `,
    computed: {
      displayData() {
        if (this.frame) {
          // Extract only the data.analysis field from the frame
          return JSON.stringify(this.frame.data.analysis, null, 2);
        } else if (this.businessAnalysis) {
          try {
            // If businessAnalysis is a string, attempt to parse it as JSON
            const parsed = JSON.parse(this.businessAnalysis);
            return JSON.stringify(parsed, null, 2);
          } catch (e) {
            // If it's not JSON (e.g., Markdown), treat it as a string
            return this.businessAnalysis;
          }
        }
        return '';
      },
    },
  };