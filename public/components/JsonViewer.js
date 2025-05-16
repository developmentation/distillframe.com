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
  setup(props) {
    const displayData = Vue.computed(() => {
      if (props.frame) {
        return JSON.stringify(props.frame.data.analysis, null, 2);
      } else if (props.businessAnalysis) {
        try {
          const parsed = JSON.parse(props.businessAnalysis);
          return JSON.stringify(parsed, null, 2);
        } catch (e) {
          return props.businessAnalysis;
        }
      }
      return '';
    });

    function copyToClipboard() {
      navigator.clipboard.writeText(displayData.value)
        .then(() => {
          console.log('JSON copied to clipboard');
        })
        .catch(err => {
          console.error('Failed to copy JSON:', err);
        });
    }

    return {
      displayData,
      copyToClipboard,
    };
  },
  template: `
    <div class="flex flex-col h-full">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">Analysis Output</h3>
        <button
          v-if="displayData"
          @click="copyToClipboard"
          class="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
          title="Copy to Clipboard"
        >
          <i class="pi pi-copy"></i>
        </button>
      </div>
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
};