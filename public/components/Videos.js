import VideoPlayer from './VideoPlayer.js';
import FrameGallery from './FrameGallery.js';
import JsonViewer from './JsonViewer.js';
import AgentSelector from './AgentSelector.js';
import DownloadButton from './DownloadButton.js';
import VideoList from './VideoList.js';
import BusinessAnalysisList from './BusinessAnalysisList.js';
import BusinessAnalysisViewer from './BusinessAnalysisViewer.js';
import { useGlobal } from '../composables/useGlobal.js';
import { useHistory } from '../composables/useHistory.js';
import { useRealTime } from '../composables/useRealTime.js';
import { useGeminiApi } from '../composables/useGeminiApi.js';
import { useBusinessAnalyst } from '../composables/useBusinessAnalyst.js';
import eventBus from '../composables/eventBus.js';

export default {
  name: 'Videos',
  components: { VideoPlayer, FrameGallery, JsonViewer, AgentSelector, DownloadButton, VideoList, BusinessAnalysisList, BusinessAnalysisViewer },
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 p-4 gap-4">
      <!-- First Row: Videos in Channel (Full Width) -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <video-list
          :videos="entities.video"
          @select-video="selectVideo"
          @reattach-video="reattachVideo"
          @remove-video="removeVideo"
          @upload-video="handleVideoUpload"
          :darkMode="darkMode"
        />
      </div>

      <!-- Second Row: Video Display and Agent Selector (50%/50% in desktop, responsive) -->
      <div class="flex flex-col md:flex-row gap-4">
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div v-if="!videoUrl" class="flex flex-col gap-4">
            <p class="text-center text-gray-500 dark:text-gray-400">Select or upload a video to start analyzing.</p>
          </div>
          <video-player
            v-else
            :videoFile="videoUrl"
            :timestamps="frameTimestamps"
            @extract-frame="handleExtractFrame"
            :darkMode="darkMode"
          />
        </div>
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <agent-selector
            :allAgents="entities.agents"
            :selectedAgents="selectedAgents"
            @toggle-agent="toggleAgent"
            :darkMode="darkMode"
          />
        </div>
      </div>

      <!-- Third Row: Captured Frames and Analysis Output (50%/50% in desktop, responsive) -->
      <div class="flex flex-col md:flex-row gap-4">
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <frame-gallery
            :frames="frames"
            @select-frame="selectFrame"
            @redo-frame="redoFrame"
            @delete-frame="deleteFrame"
            :darkMode="darkMode"
          />
        </div>
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <json-viewer
            :frame="selectedFrame"
            :businessAnalysis="null"
            :darkMode="darkMode"
          />
        </div>
      </div>

      <!-- Fourth Row: Generate Business Analysis (Full Width) -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label class="text-gray-700 dark:text-gray-300">Select Agent for Business Analysis:</label>
          <select
            v-model="selectedBusinessAgent"
            class="w-full p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
          >
            <option v-if="selectedAgents.length === 0" disabled>No agents selected</option>
            <option v-for="agentId in selectedAgents" :key="agentId" :value="agentId">
              {{ getAgentName(agentId) }}
            </option>
          </select>
          <button
            @click="generateBusinessAnalysis"
            class="w-full py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            :disabled="entities.image.length === 0 || !selectedBusinessAgent"
          >
            Generate Business Analysis
          </button>
        </div>
        <download-button
          :frames="frames"
          :businessAnalysis="selectedBusinessAnalysis?.data?.markdown"
          :includeImages="includeImages"
          @toggle-include-images="toggleIncludeImages"
          :darkMode="darkMode"
        />
      </div>

      <!-- Fifth Row: Business Analysis List and Business Analysis Viewer (50%/50% in desktop, responsive) -->
      <div class="flex flex-col md:flex-row gap-4">
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <business-analysis-list
            :analyses="entities.businessAnalysis"
            @select-analysis="selectBusinessAnalysis"
            :darkMode="darkMode"
          />
        </div>
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <business-analysis-viewer
            :analysis="selectedBusinessAnalysis"
            :darkMode="darkMode"
          />
        </div>
      </div>
    </div>
  `,
  setup(props) {
    const { entities } = useGlobal();
    const { addEntity, updateEntity, removeEntity } = useHistory();
    const { channelName } = useRealTime();
    const { analyzeFrame, generateText } = useGeminiApi();
    const { generateAnalysis } = useBusinessAnalyst();

    const video = Vue.ref(null);
    const videoUrl = Vue.ref(null);
    const analyzingFrames = Vue.ref(new Set());
    const frames = Vue.computed(() => {
      if (!video.value) return [];
      const videoFrames = entities.value.image.filter(img => img.data.videoUuid === video.value.id);
      return videoFrames.map(frame => ({
        ...frame,
        isAnalyzing: analyzingFrames.value.has(frame.id),
      }));
    });
    const frameTimestamps = Vue.computed(() => frames.value.map(f => f.data.timestamp));
    const selectedFrame = Vue.ref(null);
    const businessAnalysis = Vue.ref(null);
    const selectedBusinessAnalysis = Vue.ref(null);
    const includeImages = Vue.ref(false);
    const isHistorySynced = Vue.ref(false);
    const selectedBusinessAgent = Vue.ref(null);
    const selectedAgents = Vue.ref([]);

    Vue.onMounted(() => {
      eventBus.$on('sync-history-data', () => {
        isHistorySynced.value = true;
        loadChannelData();
        const channelEntity = entities.value.channel.find(c => c.id === channelName.value);
        if (channelEntity?.data?.selectedBusinessAgent) {
          const agent = entities.value.agents.find(a => a.id === channelEntity.data.selectedBusinessAgent);
          if (agent) {
            selectedBusinessAgent.value = agent.id;
          }
        }
        selectedAgents.value = entities.value.agents.map(agent => agent.id);
      });
    });

    Vue.onUnmounted(() => {
      eventBus.$off('sync-history-data');
    });

    Vue.watch(selectedBusinessAgent, (newAgentId) => {
      if (newAgentId) {
        updateChannelBusinessAgent(newAgentId);
      }
    });

    function updateChannelBusinessAgent(agentId) {
      const channelEntity = entities.value.channel.find(c => c.id === channelName.value);
      if (channelEntity) {
        updateEntity('channel', channelName.value, {
          ...channelEntity.data,
          selectedBusinessAgent: agentId,
        });
      } else {
        addEntity('channel', {
          id: channelName.value,
          locked: false,
          users: [],
          selectedBusinessAgent: agentId,
        });
      }
    }

    function loadChannelData() {
      const channel = channelName.value;
      if (!channel) return;

      const channelFrames = entities.value.image.filter(img => img.channel === channel);
      if (channelFrames.length > 0) {
        const videoId = channelFrames[0].data.videoUuid;
        const videoEntity = entities.value.video.find(v => v.id === videoId && v.channel === channel);
        if (videoEntity) {
          video.value = videoEntity;
        }

        const channelAnalysis = entities.value.businessAnalysis.find(ba => ba.data.videoUuid === videoId && ba.channel === channel);
        if (channelAnalysis) {
          selectBusinessAnalysis(channelAnalysis.id);
        }
      }
    }

    async function handleVideoUpload(file) {
      if (!file) return;

      const videoId = uuidv4();
      const videoData = {
        id: videoId,
        name: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
      const addedVideoId = addEntity('video', videoData);

      const videoEntity = entities.value.video.find(v => v.id === addedVideoId);
      video.value = videoEntity;
      videoUrl.value = URL.createObjectURL(file);

      selectedFrame.value = null;
      businessAnalysis.value = null;
      selectedBusinessAnalysis.value = null;
      analyzingFrames.value.clear();
    }

    function removeVideo(videoEntity) {
      removeEntity('video', videoEntity.id);
      if (video.value?.id === videoEntity.id) {
        video.value = null;
        videoUrl.value = null;
        selectedFrame.value = null;
        businessAnalysis.value = null;
        selectedBusinessAnalysis.value = null;
        analyzingFrames.value.clear();
      }
    }

    function reattachVideo(videoEntity, file) {
      if (videoEntity.id === video.value?.id) {
        videoUrl.value = URL.createObjectURL(file);
      }
    }

    function selectVideo(videoEntity) {
      video.value = videoEntity;
      videoUrl.value = null;
      selectedFrame.value = null;
      businessAnalysis.value = null;

      const channelAnalysis = entities.value.businessAnalysis.find(ba => ba.data.videoUuid === videoEntity.id && ba.channel === channelName.value);
      if (channelAnalysis) {
        selectBusinessAnalysis(channelAnalysis.id);
      } else {
        selectedBusinessAnalysis.value = null;
      }
    }

    function selectBusinessAnalysis(analysisId) {
      const analysis = entities.value.businessAnalysis.find(ba => ba.id === analysisId);
      selectedBusinessAnalysis.value = analysis;
    }

    function toggleAgent(agentId) {
      if (selectedAgents.value.includes(agentId)) {
        selectedAgents.value = selectedAgents.value.filter(id => id !== agentId);
        if (selectedBusinessAgent.value === agentId) {
          selectedBusinessAgent.value = selectedAgents.value.length > 0 ? selectedAgents.value[0] : null;
          updateChannelBusinessAgent(selectedBusinessAgent.value);
        }
      } else {
        selectedAgents.value = [...selectedAgents.value, agentId];
      }
    }

    function getAgentName(agentId) {
      const agent = entities.value.agents.find(a => a.id === agentId);
      return agent ? agent.data.name : 'Unknown Agent';
    }

    async function handleExtractFrame({ timestamp, imageData }) {
      if (!video.value) return;

      const sequence = frames.value.length + 1;
      const imageId = addEntity('image', {
        videoUuid: video.value.id,
        timestamp,
        sequence,
        imageData,
        analysis: [],
      });

      analyzingFrames.value.add(imageId);
      await processFrame(imageId, imageData, timestamp, sequence);
    }

    async function redoFrame(frameId) {
      const frame = frames.value.find(f => f.id === frameId);
      if (!frame) return;

      analyzingFrames.value.add(frameId);
      await processFrame(frameId, frame.data.imageData, frame.data.timestamp, frame.data.sequence);
    }

    async function processFrame(imageId, imageData, timestamp, sequence) {
      const agentPrompts = entities.value.agents
        .filter(agent => selectedAgents.value.includes(agent.id))
        .map(agent => ({
          agentId: agent.id,
          prompt: agent.data.prompt || [
            ...(agent.data.systemPrompts || []),
            ...(agent.data.userPrompts || []),
          ]
            .map(p => p.content)
            .filter(c => c)
            .join('\n\n'),
          model: agent.data.model || 'gemini-1.5-flash',
        }));

      try {
        const results = await analyzeFrame(imageData, agentPrompts);
        updateEntity('image', imageId, {
          videoUuid: video.value.id,
          timestamp,
          sequence,
          imageData,
          analysis: results,
        });
      } catch (error) {
        const failedAnalysis = agentPrompts.map(agent => ({
          agentId: agent.agentId,
          response: { error: error.message || 'Batch analysis failed' },
        }));
        updateEntity('image', imageId, {
          videoUuid: video.value.id,
          timestamp,
          sequence,
          imageData,
          analysis: failedAnalysis,
        });
      } finally {
        analyzingFrames.value.delete(imageId);
      }
    }

    function deleteFrame(frameId) {
      removeEntity('image', frameId);
      if (selectedFrame.value?.id === frameId) {
        selectedFrame.value = null;
      }
    }

    function selectFrame(frameId) {
      selectedFrame.value = frames.value.find(f => f.id === frameId) || null;
      businessAnalysis.value = null;
      selectedBusinessAnalysis.value = null;
    }

    async function generateBusinessAnalysis() {
      if (!entities.value.image.length || !selectedBusinessAgent.value) return;

      const agent = entities.value.agents.find(a => a.id === selectedBusinessAgent.value);
      if (!agent) return;

      const imagesByVideo = {};
      entities.value.image.forEach(image => {
        const videoUuid = image.data.videoUuid;
        if (!imagesByVideo[videoUuid]) {
          imagesByVideo[videoUuid] = [];
        }
        imagesByVideo[videoUuid].push({
          timestamp: image.data.timestamp,
          sequence: image.data.sequence,
          analysis: image.data.analysis,
        });
      });

      const analysisData = Object.keys(imagesByVideo).map(videoUuid => ({
        videoUuid,
        video: entities.value.video.find(v => v.id === videoUuid)?.data || { name: 'Unknown Video' },
        frames: imagesByVideo[videoUuid],
      }));

      const prompt = `${agent.data.prompt}\n\nAnalysis Data by Video:\n${JSON.stringify(analysisData, null, 2)}`;

      try {
        const markdown = await generateText(prompt);
        businessAnalysis.value = markdown;
        const newAnalysisId = addEntity('businessAnalysis', {
          videoUuid: video.value ? video.value.id : Object.keys(imagesByVideo)[0],
          markdown,
        });
        selectBusinessAnalysis(newAnalysisId);
      } catch (error) {
        businessAnalysis.value = `Error: Unable to generate business analysis - ${error.message}`;
        selectBusinessAnalysis(null);
      }
    }

    function toggleIncludeImages(value) {
      includeImages.value = value;
    }

    return {
      video,
      videoUrl,
      entities,
      frames,
      frameTimestamps,
      selectedFrame,
      businessAnalysis,
      selectedBusinessAnalysis,
      includeImages,
      selectedBusinessAgent,
      selectedAgents,
      handleVideoUpload,
      reattachVideo,
      selectVideo,
      removeVideo,
      handleExtractFrame,
      redoFrame,
      deleteFrame,
      selectFrame,
      selectBusinessAnalysis,
      toggleAgent,
      getAgentName,
      generateBusinessAnalysis,
      toggleIncludeImages,
    };
  },
};