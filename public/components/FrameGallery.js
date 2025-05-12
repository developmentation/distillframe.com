export default {
    name: 'FrameGallery',
    props: {
      frames: {
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
        <h3 class="text-xl font-semibold mb-4" :class="darkMode ? 'text-white' : 'text-gray-900'">Captured Frames</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
          <div
            v-for="frame in frames"
            :key="frame.id"
            class="relative rounded-lg shadow-md overflow-hidden cursor-pointer"
            :class="{
              'border-2 border-red-500': frame.isAnalyzing,
              'border-2 border-green-500': !frame.isAnalyzing
            }"
            @click="selectFrame(frame.id)"
          >
            <img
              :src="frame.data.imageData"
              class="w-full h-32 object-cover"
              alt="Frame"
            />
            <div class="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-60 p-2">
              <p class="text-white text-sm">{{ formatTime(frame.data.timestamp) }}</p>
            </div>
            <div class="absolute top-2 right-2 flex gap-2">
              <button
                @click.stop="redoFrame(frame.id)"
                class="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                title="Redo Analysis"
              >
                <i class="pi pi-replay"></i>
              </button>
              <button
                @click.stop="deleteFrame(frame.id)"
                class="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                title="Delete Frame"
              >
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
          <div v-if="!frames.length" class="col-span-full text-center py-8" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
            No frames captured yet. Extract frames from the video to start analyzing.
          </div>
        </div>
      </div>
    `,
    mounted() {
      console.log('FrameGallery received frames:', this.frames);
    },
    watch: {
      frames(newFrames) {
        console.log('FrameGallery frames updated:', newFrames);
      },
    },
    methods: {
      selectFrame(frameId) {
        this.$emit('select-frame', frameId);
      },
      redoFrame(frameId) {
        this.$emit('redo-frame', frameId);
      },
      deleteFrame(frameId) {
        this.$emit('delete-frame', frameId);
      },
      formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      },
    },
};