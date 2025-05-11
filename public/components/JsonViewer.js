export default {
    name: 'JsonViewer',
    props: {
      frame: {
        type: Object,
        default: null,
      },
      businessAnalysis: {
        type: String,
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
        <div class="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <div v-if="frame && frame.data.analysis.length">
            <pre class="text-sm" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">{{ formatJson(frame.data.analysis) }}</pre>
          </div>
          <div v-else-if="businessAnalysis" class="prose dark:prose-invert" v-html="renderMarkdown(businessAnalysis)"></div>
          <div v-else class="text-center py-8" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
            Select a frame or generate business analysis to view output.
          </div>
        </div>
      </div>
    `,
    setup() {
      function formatJson(data) {
        return JSON.stringify(data, null, 2);
      }
  
      function renderMarkdown(content) {
        if (!content) return '';
        try {
          const md = window.markdownit({ html: true, breaks: true, linkify: true });
          return md.render(content);
        } catch (error) {
          console.error('Error rendering Markdown:', error);
          return content;
        }
      }
  
      return {
        formatJson,
        renderMarkdown,
      };
    },
  };