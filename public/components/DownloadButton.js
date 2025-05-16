export default {
  name: 'DownloadButton',
  props: {
    frames: {
      type: Array,
      required: true,
    },
    businessAnalysis: {
      type: String,
      default: null,
    },
    includeImages: {
      type: Boolean,
      default: false,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { emit }) {
    const localIncludeImages = Vue.computed({
      get() {
        return props.includeImages;
      },
      set(value) {
        emit('toggle-include-images', value);
      },
    });

    function toggleIncludeImages() {
      emit('toggle-include-images', localIncludeImages.value);
    }

    function download() {
      const data = {
        frames: props.frames.map(frame => {
          const frameData = { ...frame.data };
          if (!props.includeImages) {
            delete frameData.imageData;
          }
          return {
            id: frame.id,
            data: frameData,
            timestamp: frame.timestamp,
          };
        }),
      };
      if (props.businessAnalysis) {
        data.businessAnalysis = props.businessAnalysis;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analysis.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    return {
      localIncludeImages,
      toggleIncludeImages,
      download,
    };
  },
  template: `
    <div class="flex flex-col gap-4">
      <label class="flex items-center gap-2" :class="darkMode ? 'text-gray-300' : 'text-gray-700'">
        <input
          type="checkbox"
          v-model="localIncludeImages"
          @change="toggleIncludeImages"
          class="h-4 w-4"
        />
        Include Images in Download
      </label>
      <button
        @click="download"
        class="w-full py-2 px-4 bg-green-600 dark:bg-green-500 dark:hover:bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
        :disabled="frames.length === 0 && !businessAnalysis"
      >
        Download Analysis
      </button>
    </div>
  `,
};