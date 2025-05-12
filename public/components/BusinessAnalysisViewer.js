
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
            <div 
              v-html="renderMarkdown(analysis.data.markdown)" 
              class="prose dark:prose-invert break-words whitespace-pre-wrap"
              :class="darkMode ? 'text-gray-200' : 'text-gray-800'"
            ></div>
          </div>
          <div v-else class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
            Select a business analysis to view its details.
          </div>
        </div>
      </div>
    `,
    methods: {
      renderMarkdown(content) {
        if (!content) return '';
        try {
          let textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
          if (textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(textContent);
              textContent = '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
            } catch (e) {
              textContent = '```json\n' + textContent + '\n```';
            }
          }
          const md = markdownit({ html: true, breaks: true, linkify: true, typographer: true });
          return md.render(textContent);
        } catch (error) {
          console.error('Error in renderMarkdown:', error);
          return `<pre class="hljs"><code>${content}</code></pre>`;
        }
      },
    },
};