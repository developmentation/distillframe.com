export default {
    name: 'VideoList',
    props: {
      videos: {
        type: Array,
        required: true,
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
    },
    template: `
      <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">Videos in Channel</h3>
          <label
            class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer"
          >
            Upload Video
            <input
              type="file"
              accept="video/*"
              @change="uploadVideo"
              class="hidden"
              ref="fileInput"
              :key="uploadKey"
            />
          </label>
        </div>
        <div v-if="videos.length === 0" class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
          No videos found. Upload a video to start.
        </div>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="video in videos"
            :key="video.id"
            class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center"
          >
            <div>
              <h4 class="text-lg font-medium" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">
                {{ video.data.name }}
              </h4>
              <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
                {{ (video.data.fileSize / 1024 / 1024).toFixed(2) }} MB | {{ video.data.mimeType }}
              </p>
              <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
                Channel: {{ video.channel }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="selectVideo(video)"
                class="py-1 px-3 bg-blue-500 dark:bg-blue-400 dark:hover:bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
              >
                Select
              </button>
              <label
                class="py-1 px-3 bg-green-500 dark:bg-green-400 dark:hover:bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all cursor-pointer"
              >
                Reattach
                <input
                  type="file"
                  accept="video/*"
                  @change="reattachVideo(video, $event)"
                  class="hidden"
                  ref="fileInput"
                  :key="video.id + '-' + reattachKey"
                />
              </label>
              <button
                @click="editVideo(video)"
                class="py-1 px-3 bg-yellow-500 dark:bg-yellow-400 dark:hover:bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all"
              >
                <i class="pi pi-pencil"></i>
              </button>
              <button
                @click="removeVideo(video)"
                class="py-1 px-3 bg-red-500 dark:bg-red-400 dark:hover:bg-red-600 hover:bg-red-600 text-white rounded-lg transition-all"
              >
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `,
    data() {
      return {
        reattachKey: 0, // Used to force re-render of file input
        uploadKey: 0, // Used to force re-render of upload input
      };
    },
    watch: {
      videos(newVideos) {
        console.log('VideoList videos prop updated:', newVideos);
      },
    },
    methods: {
      selectVideo(video) {
        this.$emit('select-video', video);
      },
      reattachVideo(video, event) {
        const file = event.target.files[0];
        if (!file) return;
        this.$emit('reattach-video', video, file);
        this.reattachKey++;
      },
      editVideo(video) {
        this.$emit('edit-video', video);
      },
      removeVideo(video) {
        this.$emit('remove-video', video);
      },
      uploadVideo(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.$emit('upload-video', file);
        this.uploadKey++;
      },
    },
    mounted() {
      console.log('VideoList received videos on render:', this.videos);
    },
};