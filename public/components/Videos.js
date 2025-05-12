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
      <!-- First Row: Videos in Channel and Project Prompt (50%/50% in desktop, responsive) -->
      <div class="flex flex-col md:flex-row gap-4">
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <video-list
            :videos="entities.video"
            @select-video="selectVideo"
            @reattach-video="reattachVideo"
            @remove-video="removeVideo"
            @edit-video="openEditVideoModal"
            @upload-video="handleVideoUpload"
            :darkMode="darkMode"
          />
        </div>
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <label class="text-gray-700 dark:text-gray-300 block mb-2">Project Prompt</label>
          <textarea
            v-model="projectPrompt"
            class="w-full h-32 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
            placeholder="Describe the intent of this initiative (e.g., extract meaningful insights from videos for business analysis)..."
          ></textarea>
        </div>
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

      <!-- Fourth Row: Download Button (Full Width) -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col gap-4">
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
            :selectedAgents="selectedAgents"
            :entities="entities"
            :projectPrompt="projectPrompt"
            @select-analysis="selectBusinessAnalysis"
            @generate-business-analysis="generateBusinessAnalysis"
            @delete-analysis="deleteBusinessAnalysis"
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

      <!-- Edit Video Modal -->
      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Video</h2>
          <div class="flex flex-col gap-4">
            <div>
              <label class="text-gray-700 dark:text-gray-300 block mb-1">Video Name</label>
              <input
                v-model="editVideoData.name"
                class="w-full p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter video name"
              />
            </div>
            <div>
              <label class="text-gray-700 dark:text-gray-300 block mb-1">Video Description</label>
              <textarea
                v-model="editVideoData.description"
                class="w-full h-24 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter video description"
              ></textarea>
            </div>
            <div class="flex justify-end gap-2">
              <button
                @click="closeEditVideoModal"
                class="py-2 px-4 bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 hover:bg-gray-400 text-gray-900 dark:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                @click="saveVideoEdits"
                class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
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
    const selectedAgents = Vue.ref([]);
    const projectPrompt = Vue.ref('');
    const showEditModal = Vue.ref(false);
    const editVideoData = Vue.ref({ id: null, name: '', description: '' });

    Vue.onMounted(() => {
      eventBus.$on('sync-history-data', () => {
        isHistorySynced.value = true;
        loadChannelData();
        const channelEntity = entities.value.channel.find(c => c.id === channelName.value);
        selectedAgents.value = entities.value.agents.map(agent => agent.id);
      });
    });

    Vue.onUnmounted(() => {
      eventBus.$off('sync-history-data');
    });

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
      console.log('handleVideoUpload called with file:', file);
      if (!file) return;

      const videoId = uuidv4();
      const videoData = {
        id: videoId,
        name: file.name,
        description: '',
        fileSize: file.size,
        mimeType: file.type,
        channel: channelName.value,
      };
      console.log('Adding video to entities with videoData:', videoData);
      const addedVideoId = addEntity('video', videoData);
      console.log('Added video ID:', addedVideoId);
      console.log('Updated entities.video:', entities.value.video);

      const videoEntity = entities.value.video.find(v => v.id === addedVideoId);
      console.log('Found videoEntity:', videoEntity);
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

    function openEditVideoModal(videoEntity) {
      editVideoData.value = {
        id: videoEntity.id,
        name: videoEntity.data.name,
        description: videoEntity.data.description || '',
      };
      showEditModal.value = true;
    }

    function closeEditVideoModal() {
      showEditModal.value = false;
      editVideoData.value = { id: null, name: '', description: '' };
    }

    function saveVideoEdits() {
      if (editVideoData.value.id) {
        const videoEntity = entities.value.video.find(v => v.id === editVideoData.value.id);
        if (videoEntity) {
          updateEntity('video', videoEntity.id, {
            ...videoEntity.data,
            name: editVideoData.value.name,
            description: editVideoData.value.description,
          });
        }
      }
      closeEditVideoModal();
    }

    function selectBusinessAnalysis(analysisId) {
      const analysis = entities.value.businessAnalysis.find(ba => ba.id === analysisId);
      selectedBusinessAnalysis.value = analysis;
    }

    function deleteBusinessAnalysis(analysisId) {
      removeEntity('businessAnalysis', analysisId);
      if (selectedBusinessAnalysis.value?.id === analysisId) {
        selectedBusinessAnalysis.value = null;
      }
    }

    function toggleAgent(agentId) {
      if (selectedAgents.value.includes(agentId)) {
        selectedAgents.value = selectedAgents.value.filter(id => id !== agentId);
      } else {
        selectedAgents.value = [...selectedAgents.value, agentId];
      }
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
        .map(agent => {
          const systemPrompt = [
            ...(agent.data.systemPrompts || []),
            ...(agent.data.userPrompts || []),
          ]
            .map(p => p.content)
            .filter(c => c)
            .join('\n\n');

          const messageHistory = [
            { role: 'user', content: projectPrompt.value || 'No project prompt provided.' },
            {
              role: 'user',
              content: `Video Name: ${video.value.data.name}\nVideo Description: ${video.value.data.description || 'No description provided.'}`,
            },
            {
              role: 'user',
              content: agent.data.userPrompts?.map(p => p.content).filter(c => c).join('\n\n') || 'No user prompts provided.',
            },
          ];

          return {
            agentId: agent.id,
            systemPrompt,
            messageHistory,
            model: agent.data.model || 'gemini-1.5-flash',
          };
        });

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

    async function generateBusinessAnalysis(selectedBusinessAgent) {
      if (!entities.value.image.length || !selectedBusinessAgent) return;

      const agent = entities.value.agents.find(a => a.id === selectedBusinessAgent);
      if (!agent) return;

      const systemPrompt = [
        ...(agent.data.systemPrompts || []),
      ]
        .map(p => p.content)
        .filter(c => c)
        .join('\n\n') || 'No system prompts provided.';

      const messageHistory = [];

      messageHistory.push({
        role: 'user',
        content: projectPrompt.value || 'No project prompt provided.',
      });

      const userPromptContent = agent.data.userPrompts?.map(p => p.content).filter(c => c).join('\n\n') || 'No user prompts provided.';
      messageHistory.push({
        role: 'user',
        content: userPromptContent,
      });

      entities.value.image.forEach(image => {
        image.data.analysis.forEach(analysis => {
          const text = analysis.response?.text || analysis.response?.description || '';
          if (text) {
            messageHistory.push({
              role: 'user',
              content: `Frame Analysis (Video UUID: ${image.data.videoUuid}, Timestamp: ${image.data.timestamp}): ${text}`,
            });
          }
        });
      });

      const promptData = {
        systemPrompt,
        messageHistory,
        model: agent.data.model || 'gemini-1.5-flash',
      };

      console.log('Business Analysis LLM PAYLOAD:', promptData);

      try {
        const markdown = await generateText(promptData);
        businessAnalysis.value = markdown;
        const newAnalysisId = addEntity('businessAnalysis', {
          videoUuid: video.value ? video.value.id : entities.value.image[0]?.data.videoUuid,
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
      selectedAgents,
      projectPrompt,
      showEditModal,
      editVideoData,
      handleVideoUpload,
      reattachVideo,
      selectVideo,
      removeVideo,
      openEditVideoModal,
      closeEditVideoModal,
      saveVideoEdits,
      handleExtractFrame,
      redoFrame,
      deleteFrame,
      selectFrame,
      selectBusinessAnalysis,
      deleteBusinessAnalysis,
      generateBusinessAnalysis,
      toggleAgent,
      toggleIncludeImages,
    };
  },
};