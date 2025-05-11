import { useVideoProcessor } from '../composables/useVideoProcessor.js';

export default {
  name: 'VideoPlayer',
  props: {
    videoFile: {
      type: String,
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
        ref="videoElement"
        :src="videoFile"
        class="w-full rounded-lg shadow-md"
        @timeupdate="updateTime"
        @loadedmetadata="updateDuration"
      ></video>
      <div class="flex gap-4 items-center">
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
      <div class="relative">
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
    const { extractFrame } = useVideoProcessor();
    const videoElement = Vue.ref(null);
    const isPlaying = Vue.ref(false);
    const currentTime = Vue.ref(0);
    const duration = Vue.ref(0);

    function togglePlay() {
      if (isPlaying.value) {
        videoElement.value.pause();
      } else {
        videoElement.value.play();
      }
      isPlaying.value = !isPlaying.value;
    }

    function updateTime() {
      currentTime.value = videoElement.value.currentTime;
    }

    function updateDuration() {
      duration.value = videoElement.value.duration;
    }

    function seekVideo() {
      videoElement.value.currentTime = currentTime.value;
    }

    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    async function captureFrame() {
      const imageData = await extractFrame(videoElement.value, currentTime.value);
      emit('extract-frame', { timestamp: currentTime.value, imageData });
    }

    Vue.onMounted(() => {
      videoElement.value.addEventListener('play', () => { isPlaying.value = true; });
      videoElement.value.addEventListener('pause', () => { isPlaying.value = false; });
    });

    return {
      videoElement,
      isPlaying,
      currentTime,
      duration,
      togglePlay,
      updateTime,
      updateDuration,
      seekVideo,
      formatTime,
      captureFrame,
    };
  },
};