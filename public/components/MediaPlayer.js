import { useMediaProcessor } from '../composables/useMediaProcessor.js';

export default {
  name: 'MediaPlayer',
  props: {
    mediaFile: {
      type: String,
      required: true,
    },
    media: {
      type: Object,
      required: true,
    },
    timestamps: {
      type: Array,
      default: () => [],
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="flex flex-col gap-4">
      <video
        v-if="isVideo"
        ref="mediaElement"
        :src="mediaFile"
        class="w-full rounded-lg shadow-md"
        @timeupdate="updateTime"
        @loadedmetadata="updateDuration"
        @error="handleMediaError"
      ></video>
      <img
        v-else
        ref="mediaElement"
        :src="mediaFile"
        class="w-full rounded-lg shadow-md object-contain"
        @load="updateImage"
        @error="handleMediaError"
      />
      <div v-if="isVideo" class="flex gap-4 items-center">
        <button
          @click="togglePlay"
          class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
        >
          {{ isPlaying ? 'Pause' : 'Play' }}
        </button>
        <input
          type="range"
          v-model="currentTime"
          :max="duration"
          step="0.1"
          class="flex-1"
          @input="seekVideo"
        />
        <span class="text-gray-700 dark:text-gray-300">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      </div>
      <div v-if="isVideo" class="relative">
        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div
            v-for="ts in timestamps"
            :key="ts"
            class="absolute h-2 w-1 bg-red-500"
            :style="{ left: (ts / duration * 100) + '%' }"
          ></div>
        </div>
      </div>
      <button
        @click="captureFrame"
        class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
      >
        Extract Frame
      </button>
    </div>
  `,
  setup(props, { emit }) {
    const { extractFrame } = useMediaProcessor();
    const mediaElement = Vue.ref(null);
    const isPlaying = Vue.ref(false);
    const currentTime = Vue.ref(0);
    const duration = Vue.ref(0);

    const isVideo = Vue.computed(() => props.media?.data?.type === 'video');

    function togglePlay() {
      if (!isVideo.value) return;
      if (isPlaying.value) {
        mediaElement.value.pause();
      } else {
        mediaElement.value.play();
      }
      isPlaying.value = !isPlaying.value;
    }

    function updateTime() {
      if (!isVideo.value) return;
      currentTime.value = mediaElement.value.currentTime;
      // console.log('Time updated:', currentTime.value);
    }

    function updateDuration() {
      if (!isVideo.value) return;
      duration.value = mediaElement.value.duration;
      console.log('Duration loaded:', duration.value);
    }

    function updateImage() {
      if (isVideo.value) return;
      duration.value = 0;
      currentTime.value = 0;
      console.log('Image loaded');
    }

    function seekVideo() {
      if (!isVideo.value) return;
      // console.log('Seeking to:', currentTime.value);
      mediaElement.value.currentTime = currentTime.value;
    }

    function handleMediaError(e) {
      console.error('Media element error:', e);
    }

    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    async function captureFrame() {
      const imageData = await extractFrame(mediaElement.value, currentTime.value, props.media.data.type);
      emit('extract-frame', { timestamp: currentTime.value, imageData });
    }

    Vue.onMounted(() => {
      if (isVideo.value) {
        mediaElement.value.addEventListener('play', () => { isPlaying.value = true; });
        mediaElement.value.addEventListener('pause', () => { isPlaying.value = false; });
      }
    });

    return {
      mediaElement,
      isPlaying,
      currentTime,
      duration,
      isVideo,
      togglePlay,
      updateTime,
      updateDuration,
      updateImage,
      seekVideo,
      handleMediaError,
      formatTime,
      captureFrame,
    };
  },
};