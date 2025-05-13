export default {
    name: 'MediaList',
    props: {
      media: {
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
          <h3 class="text-xl font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">Media in Channel</h3>
          <label
            class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer"
          >
            Upload Media
            <input
              type="file"
              accept="video/*,image/*"
              multiple
              @change="uploadMedia"
              class="hidden"
              ref="fileInput"
              :key="uploadKey"
            />
          </label>
        </div>
        <div v-if="media.length === 0" class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
          No media found. Upload a video or image to start.
        </div>
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="item in media"
            :key="item.id"
            class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center"
          >
            <div>
              <h4 class="text-lg font-medium" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">
                {{ item.data.name }}
              </h4>
              <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
                {{ formatFileSize(item.data.fileSize) }} | {{ item.data.mimeType || 'Unknown' }}
              </p>
              <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
                Channel: {{ item.channel }}
              </p>
              <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
                Type: {{ item.data.type === 'video' ? 'Video' : 'Image' }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="selectMedia(item)"
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
                  :accept="item.data.type === 'video' ? 'video/*' : 'image/*'"
                  @change="reattachMedia(item, $event)"
                  class="hidden"
                  ref="fileInput"
                  :key="item.id + '-' + reattachKey"
                />
              </label>
              <button
                @click="editMedia(item)"
                class="py-1 px-3 bg-yellow-500 dark:bg-yellow-400 dark:hover:bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all"
              >
                <i class="pi pi-pencil"></i>
              </button>
              <button
                @click="removeMedia(item)"
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
        reattachKey: 0,
        uploadKey: 0,
      };
    },
    methods: {
      formatFileSize(fileSize) {
        if (typeof fileSize !== 'number' || isNaN(fileSize)) {
          return 'Unknown';
        }
        return `${(fileSize / 1024 / 1024).toFixed(2)} MB`;
      },
      selectMedia(item) {
        this.$emit('select-media', item);
      },
      reattachMedia(item, event) {
        const file = event.target.files[0];
        if (!file) return;
        this.$emit('reattach-media', item, file);
        this.reattachKey++;
      },
      editMedia(item) {
        this.$emit('edit-media', item);
      },
      removeMedia(item) {
        this.$emit('remove-media', item);
      },
      uploadMedia(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        this.$emit('upload-media', files);
        this.uploadKey++;
      },
    },
    watch: {
      media(newMedia) {
        console.log('MediaList media prop updated:', newMedia);
      },
    },
    mounted() {
      console.log('MediaList received media on render:', this.media);
    },
};