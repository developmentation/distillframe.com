import { useTranscriptions } from '../composables/useTranscriptions.js';

export default {
  name: 'MediaList',
  props: {
    media: {
      type: Array,
      required: true,
      default: () => [],
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
            accept="video/*,image/*,audio/*"
            multiple
            @change="uploadMedia"
            class="hidden"
            ref="fileInput"
            :key="uploadKey"
          />
        </label>
      </div>
      <div v-if="!media || media.length === 0" class="text-center py-4" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
        No media found. Upload a video, image, or audio to start.
      </div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="item in media"
          :key="item.id"
          class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center"
        >
          <div>
            <h4 class="text-lg font-medium" :class="darkMode ? 'text-gray-200' : 'text-gray-800'">
              {{ item?.data?.name || 'Unnamed Media' }}
            </h4>
            <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
              {{ formatFileSize(item?.data?.fileSize) }} | {{ item?.data?.mimeType || 'Unknown' }}
            </p>
            <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
              Channel: {{ item?.channel || 'Unknown' }}
            </p>
            <p class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
              Type: {{ displayMediaType(item?.data?.type) }}
            </p>
            <p v-if="item?.data?.transcription" class="text-sm" :class="darkMode ? 'text-gray-400' : 'text-gray-600'">
              Transcription: {{ item.data.transcription.segments?.length || 0 }} segments
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
                :accept="item?.data?.type === 'video' ? 'video/*' : item?.data?.type === 'audio' ? 'audio/*' : 'image/*'"
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
  setup(props, { emit }) {
    const { transcribeFile, updateTranscription } = useTranscriptions();

    const reattachKey = Vue.ref(0);
    const uploadKey = Vue.ref(0);

    function formatFileSize(fileSize) {
      if (typeof fileSize !== 'number' || isNaN(fileSize)) {
        return 'Unknown';
      }
      return `${(fileSize / 1024 / 1024).toFixed(2)} MB`;
    }

    function displayMediaType(type) {
      if (!type) return 'Unknown';
      return type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : type === 'image' ? 'Image' : 'Unknown';
    }

    function selectMedia(item) {
      emit('select-media', item);
    }

    async function reattachMedia(item, event) {
      const file = event.target.files[0];
      if (!file) return;
      emit('reattach-media', item, file);
      reattachKey.value++;
      if (item?.data?.type === 'video' || item?.data?.type === 'audio') {
        const { success, data, error } = await transcribeFile(file);
        if (success) {
          item.data.transcription = data;
          updateTranscription(item.id, item.data.name, data);
          emit('update-media', item);
        } else {
          console.error('Transcription failed:', error);
        }
      }
    }

    function editMedia(item) {
      emit('edit-media', item);
    }

    function removeMedia(item) {
      emit('remove-media', item);
    }

    async function uploadMedia(event) {
      const files = Array.from(event.target.files);
      if (files.length === 0) return;
      emit('upload-media', files);
      uploadKey.value++;

      for (const file of files) {
        if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
          const { success, data, error } = await transcribeFile(file);
          if (success) {
            const mediaItem = props.media?.find(m => m?.data?.name === file.name);
            if (mediaItem) {
              mediaItem.data.transcription = data;
              updateTranscription(mediaItem.id, file.name, data);
              emit('update-media', mediaItem);
            }
          } else {
            console.error('Transcription failed for', file.name, ':', error);
          }
        }
      }
    }

    Vue.watch(
      () => props.media,
      (newMedia) => {
        if (newMedia) {
          console.log('MediaList media prop updated:', newMedia);
        }
      },
      { deep: true }
    );

    Vue.onMounted(() => {
      if (props.media) {
        console.log('MediaList received media on render:', props.media);
      }
    });

    return {
      reattachKey,
      uploadKey,
      formatFileSize,
      displayMediaType,
      selectMedia,
      reattachMedia,
      editMedia,
      removeMedia,
      uploadMedia,
    };
  },
};