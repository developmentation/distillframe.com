import BusinessAnalysisList from './BusinessAnalysisList.js';
import BusinessAnalysisViewer from './BusinessAnalysisViewer.js';

export default {
  name: 'SimpleAnalysis',
  components: { BusinessAnalysisList, BusinessAnalysisViewer },
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
    selectedBusinessAnalysis: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    const selectedAnalysis = Vue.computed(() => {
      return props.analyses.find(a => a.id === props.selectedBusinessAnalysis?.id) || null;
    });

    return {
      selectedAnalysis,
      props,
    };
  },
  template: `
    <div class="flex flex-col md:flex-row gap-4">
      <div class="md:w-1/2">
        <business-analysis-list
          :analyses="analyses"
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
  `,
};