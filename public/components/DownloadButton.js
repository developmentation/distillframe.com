import { useSessionDownloader } from '../composables/useSessionDownloader.js';

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
  template: `
    <div class="flex flex-col gap-4">
      <label class="flex items-center gap-2" :class="darkMode ? 'text-gray-300' : 'text-gray-700'">
        <input
          type="checkbox"
          v-model="localIncludeImages"
          @change="toggleIncludeImages"
          class="h-4 w-4"
        />
        Include Images
      </label>
      <button
        @click="triggerDownload"
        class="w-full py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
        :disabled="!frames.length"
      >
        Download Session
      </button>
    </div>
  `,
  setup(props, { emit }) {
    const { downloadSession } = useSessionDownloader();
    const localIncludeImages = Vue.ref(props.includeImages);

    function toggleIncludeImages() {
      emit('toggle-include-images', localIncludeImages.value);
    }

    async function triggerDownload() {
      await downloadSession(props.frames, props.businessAnalysis, localIncludeImages.value);
    }

    Vue.watch(() => props.includeImages, (newValue) => {
      localIncludeImages.value = newValue;
    });

    return {
      localIncludeImages,
      toggleIncludeImages,
      triggerDownload,
    };
  },
};