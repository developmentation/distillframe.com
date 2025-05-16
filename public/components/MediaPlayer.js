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
      <audio
        v-else-if="isAudio"
        ref="mediaElement"
        :src="mediaFile"
        class="w-full rounded-lg"
        controls
        @timeupdate="updateTime"
        @loadedmetadata="updateDuration"
        @error="handleMediaError"
      ></audio>
      <img
        v-else-if="isImage"
        ref="mediaElement"
        :src="mediaFile"
        class="w-full rounded-lg shadow-md object-contain"
        @load="updateImage"
        @error="handleMediaError"
      />
      <div v-else class="text-center text-gray-500 dark:text-gray-400">
        Unsupported media type
      </div>
      <div v-if="isVideo || isAudio" class="flex gap-4 items-center">
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
          @input="seekMedia"
        />
        <span class="text-gray-700 dark:text-gray-300">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      </div>
      <div v-if="isVideo || isAudio" class="relative">
        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div
            v-for="ts in timestamps"
            :key="ts"
            class="absolute h-2 w-1 bg-red-500"
            :style="{ left: (ts / duration * 100) + '%' }"
          ></div>
        </div>
      </div>
      <div v-if="isVideo || isAudio" class="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <p class="text-sm" :class="darkMode ? 'text-gray-300' : 'text-gray-600'">
          <span v-if="currentTranscript">Transcription: {{ currentTranscript.speaker }}: {{ currentTranscript.text }}</span>
          <span v-else>No transcription available at this timestamp.</span>
        </p>
      </div>
      <div v-if="isVideo || isImage" class="flex flex-col gap-2">
        <button
          @click="captureFrame"
          class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
        >
          Extract Frame
        </button>
        <label class="flex items-center gap-2 text-sm" :class="darkMode ? 'text-gray-300' : 'text-gray-600'">
          <input
            type="checkbox"
            v-model="includeTranscription"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          Include Transcription in Analysis
        </label>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const { extractFrame } = useMediaProcessor();
    const mediaElement = Vue.ref(null);
    const isPlaying = Vue.ref(false);
    const currentTime = Vue.ref(0);
    const duration = Vue.ref(0);
    const includeTranscription = Vue.ref(false);

    const isVideo = Vue.computed(() => props.media?.data?.type === 'video');
    const isAudio = Vue.computed(() => props.media?.data?.type === 'audio');
    const isImage = Vue.computed(() => props.media?.data?.type === 'image');

    const currentTranscript = Vue.computed(() => {
      if (!props.media?.data?.transcription?.segments) return null;
      const segments = props.media.data.transcription.segments;
      return segments.find(
        segment => currentTime.value >= segment.start && currentTime.value <= segment.end
      ) || null;
    });

    function togglePlay() {
      if (!isVideo.value && !isAudio.value) return;
      if (isPlaying.value) {
        mediaElement.value.pause();
      } else {
        mediaElement.value.play();
      }
      isPlaying.value = !isPlaying.value;
    }

    function updateTime() {
      if (!isVideo.value && !isAudio.value) return;
      currentTime.value = mediaElement.value.currentTime;
    }

    function updateDuration() {
      if (!isVideo.value && !isAudio.value) return;
      duration.value = mediaElement.value.duration;
      console.log('Duration loaded:', duration.value);
    }

    function updateImage() {
      if (!isImage.value) return;
      duration.value = 0;
      currentTime.value = 0;
      console.log('Image loaded');
    }

    function seekMedia() {
      if (!isVideo.value && !isAudio.value) return;
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
      if (!isVideo.value && !isImage.value) return;
      const imageData = await extractFrame(mediaElement.value, currentTime.value, props.media.data.type);
      emit('extract-frame', {
        timestamp: currentTime.value,
        imageData,
        includeTranscription: includeTranscription.value,
        transcription: currentTranscript.value,
      });
    }

    Vue.onMounted(() => {
      if (isVideo.value || isAudio.value) {
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
      isAudio,
      isImage,
      currentTranscript,
      includeTranscription,
      togglePlay,
      updateTime,
      updateDuration,
      updateImage,
      seekMedia,
      handleMediaError,
      formatTime,
      captureFrame,
    };
  },
};