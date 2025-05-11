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
    computed: {
      localIncludeImages: {
        get() {
          return this.includeImages;
        },
        set(value) {
          this.$emit('toggle-include-images', value);
        },
      },
    },
    methods: {
      toggleIncludeImages() {
        this.$emit('toggle-include-images', this.localIncludeImages);
      },
      download() {
        const data = {
          frames: this.frames.map(frame => {
            const frameData = { ...frame.data };
            if (!this.includeImages) {
              delete frameData.imageData;
            }
            return {
              id: frame.id,
              data: frameData,
              timestamp: frame.timestamp,
            };
          }),
        };
        if (this.businessAnalysis) {
          data.businessAnalysis = this.businessAnalysis;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analysis.json';
        a.click();
        URL.revokeObjectURL(url);
      },
    },
  };