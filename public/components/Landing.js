import { useRealTime } from '../composables/useRealTime.js';
import { useHistory } from '../composables/useHistory.js';
import { useModels } from '../composables/useModels.js';
import { useConfigs } from '../composables/useConfigs.js';
import Agents from './Agents.js';
import Videos from './Videos.js';

export default {
  name: 'Landing',
  components: { Agents, Videos },
  props: {
    channelName: {
      type: String,
      default: null,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="transition-colors duration-300">
      <!-- Tabs -->
      <div class="sticky top-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav class="flex space-x-6">
            <button
              v-for="tab in tabs"
              :key="tab"
              @click="activeTab = tab"
              class="py-4 text-sm font-medium transition-colors border-b-2"
              :class="activeTab === tab ? 'border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400'"
            >
              {{ tab }}
            </button>
          </nav>
        </div>
      </div>

      <!-- Landing Tab Content -->
      <div v-if="activeTab === 'Landing'">
        <!-- Hero Section -->
        <header class="relative py-20 bg-gradient-to-r from-blue-600 to-indigo-500 text-white overflow-hidden">
          <div class="absolute inset-0 bg-black opacity-20 dark:opacity-40"></div>
          <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-4xl sm:text-5xl font-extrabold mb-4 font-sans">DistillFrame.com</h2>
            <p class="text-lg sm:text-xl mb-8 text-gray-100 font-light">
              Analyze video frames with AI-powered insights, extract structured data, and generate business reports in real time.
            </p>
            <button @click="activeTab = 'Agents'" class="m-2 px-6 py-3 bg-white dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700 text-blue-600 hover:bg-gray-100 rounded-lg font-semibold transition-all shadow-md">
              Create an AI Agent
            </button>
            <button @click="activeTab = 'Videos'" class="px-6 py-3 bg-white dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700 text-blue-600 hover:bg-gray-100 rounded-lg font-semibold transition-all shadow-md">
              Start Analyzing Videos
            </button>
          </div>
        </header>

        <!-- Key Features Section (Card-Based) -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 dark:bg-gray-900">
          <h3 class="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">Key Features</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div v-for="feature in features" :key="feature.title" class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <h4 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{{ feature.title }}</h4>
              <p class="text-gray-600 dark:text-gray-300">{{ feature.description }}</p>
            </div>
          </div>
        </section>

        <!-- Detailed Features Sections -->
        <!-- Video Frame Analysis -->
        <section class="min-h-[300px] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 dark:bg-gray-900">
          <div class="flex flex-col md:flex-row items-center gap-8">
            <div class="md:w-1/2">
              <h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Video Frame Analysis</h3>
              <p class="text-gray-600 dark:text-gray-300 mb-4">
                Upload videos, scrub through frames, and extract specific moments for detailed analysis. Use the browser’s Canvas API to capture frames as images without storing bulky video files.
              </p>
              <p class="text-gray-600 dark:text-gray-300">
                Frames are stored as entities with metadata, timestamps, and base64 images, enabling precise analysis and easy session reloading. Perfect for dissecting presentations, demos, or training videos.
              </p>
            </div>
            <div class="md:w-1/2">
              <div class="h-48 sm:h-64 rounded-lg bg-cover bg-center aspect-[4/3] overflow-visible" :style="{ backgroundImage: 'url(' + video1Img + ')' }"></div>
            </div>
          </div>
        </section>

        <!-- AI-Powered Insights -->
        <section class="min-h-[300px] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white dark:bg-gray-800">
          <div class="flex flex-col md:flex-row-reverse items-center gap-8">
            <div class="md:w-1/2">
              <h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">AI-Powered Insights</h3>
              <p class="text-gray-600 dark:text-gray-300 mb-4">
                Configure custom AI agents to analyze frames for descriptions, structured data (e.g., Excel tables, forms), and knowledge graphs. Powered by Google’s Gemini API for accurate results.
              </p>
              <p class="text-gray-600 dark:text-gray-300">
                Each frame is processed by multiple agents, with results stored as JSON for easy access. Edit agent prompts to tailor analysis to your needs, from technical breakdowns to strategic insights.
              </p>
            </div>
            <div class="md:w-1/2">
              <div class="h-48 sm:h-64 rounded-lg bg-cover bg-center aspect-[4/3] overflow-visible" :style="{ backgroundImage: 'url(' + video2Img + ')' }"></div>
            </div>
          </div>
        </section>

        <!-- Business Analysis Reports -->
        <section class="min-h-[300px] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 dark:bg-gray-900">
          <div class="flex flex-col md:flex-row items-center gap-8">
            <div class="md:w-1/2">
              <h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Business Analysis Reports</h3>
              <p class="text-gray-600 dark:text-gray-300 mb-4">
                Aggregate frame insights into comprehensive business analysis reports. The Business Analyst agent processes all frame data to produce Markdown reports with trends and recommendations.
              </p>
              <p class="text-gray-600 dark:text-gray-300">
                Download reports alongside frame JSONs and optional images, ensuring lightweight exports. Ideal for presentations, stakeholder reviews, or strategic planning.
              </p>
            </div>
            <div class="md:w-1/2">
              <div class="h-48 sm:h-64 rounded-lg bg-cover bg-center aspect-[4/3] overflow-visible" :style="{ backgroundImage: 'url(' + video3Img + ')' }"></div>
            </div>
          </div>
        </section>

        <!-- Real-Time Collaboration -->
        <section class="min-h-[300px] max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white dark:bg-gray-800">
          <div class="flex flex-col md:flex-row-reverse items-center gap-8">
            <div class="md:w-1/2">
              <h3 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Real-Time Collaboration</h3>
              <p class="text-gray-600 dark:text-gray-300 mb-4">
                Collaborate with team members in real time using Socket.IO. Share video analysis sessions, agent configurations, and reports seamlessly across users.
              </p>
              <p class="text-gray-600 dark:text-gray-300">
                Entity-based architecture ensures all actions (frame extraction, analysis, downloads) are synced instantly, with MongoDB persistence for reliable session recovery.
              </p>
            </div>
            <div class="md:w-1/2">
              <div class="h-48 sm:h-64 rounded-lg bg-cover bg-center aspect-[4/3] overflow-visible" :style="{ backgroundImage: 'url(' + video4Img + ')' }"></div>
            </div>
          </div>
        </section>

        <!-- Call to Action Section -->
        <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center bg-gray-50 dark:bg-gray-900">
          <h3 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Ready to Analyze?</h3>
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            Create your first AI agent or start analyzing videos now to unlock powerful insights.
          </p>
          <div class="flex justify-center gap-4">
            <button @click="activeTab = 'Agents'" class="px-6 py-3 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-semibold transition-all">
              Create an Agent
            </button>
            <button @click="activeTab = 'Videos'" class="px-6 py-3 bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 text-gray-900 hover:bg-gray-300 rounded-lg font-semibold transition-all">
              Analyze Videos
            </button>
          </div>
        </section>
      </div>

      <!-- Other Tab Content -->
      <main v-else class="max-w-8xl mx-auto px-4 py-2">
        <agents v-show="activeTab === 'Agents'" :darkMode="darkMode" />
        <videos v-show="activeTab === 'Videos'" :darkMode="darkMode" />
      </main>
    </div>
  `,
  setup(props) {
    const { env } = useConfigs();
    const { connect, disconnect, userUuid, displayName, channelName, isConnected, on } = useRealTime();
    const { gatherLocalHistory } = useHistory();
    const { modelRegistry, fetchServerModels } = useModels();
    const router = VueRouter.useRouter();

    const video1Img = Vue.computed(() => `/assets/video1.jpg`);
    const video2Img = Vue.computed(() => `/assets/video2.jpg`);
    const video3Img = Vue.computed(() => `/assets/video3.jpg`);
    const video4Img = Vue.computed(() => `/assets/video4.jpg`);

    const activeTab = Vue.ref('Landing');
    const tabs = ['Landing', 'Agents', 'Videos'];
    const sessionReady = Vue.ref(false);
    const errorMessage = Vue.ref('');

    const features = [
      {
        title: 'Frame Extraction',
        description: 'Extract specific video frames for detailed analysis using the browser’s Canvas API.',
      },
      {
        title: 'AI Analysis',
        description: 'Custom AI agents analyze frames for descriptions, data, and relationships via Gemini API.',
      },
      {
        title: 'Business Reports',
        description: 'Generate Markdown reports with insights and recommendations from frame data.',
      },
      {
        title: 'Real-Time Sync',
        description: 'Collaborate instantly with team members using Socket.IO and MongoDB persistence.',
      },
      {
        title: 'Lightweight Exports',
        description: 'Download JSONs and optional images, excluding bulky video files.',
      },
      {
        title: 'Open Source',
        description: 'Fully customizable MIT-licensed codebase for your specific needs.',
      },
    ];

    function copyLink() {
      const link = `${env.value.API_URL}/${channelName.value}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).catch(err => {
          console.error('Clipboard API error:', err);
          errorMessage.value = 'Failed to copy link.';
        });
      } else {
        const tempInput = document.createElement('input');
        document.body.appendChild(tempInput);
        tempInput.value = link;
        tempInput.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed:', err);
          errorMessage.value = 'Failed to copy link.';
        } finally {
          document.body.removeChild(tempInput);
        }
      }
    }

    function isValidChannelName(name) {
      if (!name || typeof name !== 'string') return false;
      return /^[a-z0-9 _-]+$/.test(name);
    }

    function handleVisibilityChange() {
      if (!document.hidden && !isConnected.value && channelName.value && displayName.value) {
        if (!isValidChannelName(channelName.value)) {
          console.error('Invalid channel name on reconnect.');
          return;
        }
        connect(channelName.value, displayName.value);
      }
    }

    Vue.onMounted(() => {
      fetchServerModels();
      document.addEventListener('visibilitychange', handleVisibilityChange);
      if (props.channelName && isValidChannelName(props.channelName)) {
        channelName.value = props.channelName;
        displayName.value = `User ${Math.floor(Math.random() * 1000)}`;
        connect(props.channelName, displayName.value);
        sessionReady.value = true;
      } else {
        channelName.value = uuidv4();
        displayName.value = `User ${Math.floor(Math.random() * 1000)}`;
        if (isValidChannelName(channelName.value)) {
          router.push(`/${channelName.value}`);
          connect(channelName.value, displayName.value);
          sessionReady.value = true;
        } else {
          console.error('Generated invalid channel name.');
        }
      }
    });

    Vue.onUnmounted(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

    return {
      video1Img,
      video2Img,
      video3Img,
      video4Img,
      activeTab,
      tabs,
      features,
      copyLink,
      sessionReady,
      errorMessage,
    };
  },
};