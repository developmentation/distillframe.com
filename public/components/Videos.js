import VideoPlayer from './VideoPlayer.js';
import FrameGallery from './FrameGallery.js';
import JsonViewer from './JsonViewer.js';
import AgentEditor from './AgentEditor.js';
import DownloadButton from './DownloadButton.js';
import VideoList from './VideoList.js';
import { useGlobal } from '../composables/useGlobal.js';
import { useHistory } from '../composables/useHistory.js';
import { useRealTime } from '../composables/useRealTime.js';
import { useGeminiApi } from '../composables/useGeminiApi.js';
import { useBusinessAnalyst } from '../composables/useBusinessAnalyst.js';
import eventBus from '../composables/eventBus.js';

export default {
  name: 'Videos',
  components: { VideoPlayer, FrameGallery, JsonViewer, AgentEditor, DownloadButton, VideoList },
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 p-4 gap-4">
      <!-- Video List -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <video-list
          :videos="entities.video"
          @select-video="selectVideo"
          @reattach-video="reattachVideo"
          @remove-video="removeVideo"
          :darkMode="darkMode"
        />
      </div>

      <!-- Main Content -->
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Left: Video Player -->
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div v-if="!videoUrl" class="flex flex-col gap-4">
            <input
              type="file"
              accept="video/*"
              @change="handleVideoUpload"
              class="p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600"
            />
            <input
              type="file"
              accept=".json"
              @change="handleTimestampsUpload"
              class="p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600"
            />
          </div>
          <video-player
            v-else
            :videoFile="videoUrl"
            :timestamps="frameTimestamps"
            @extract-frame="handleExtractFrame"
            :darkMode="darkMode"
          />
        </div>
        <!-- Right: JSON Viewer -->
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <json-viewer
            :frame="selectedFrame"
            :businessAnalysis="businessAnalysis"
            :darkMode="darkMode"
          />
        </div>
      </div>

      <!-- Bottom: Frame Gallery, Agent Editor, Business Analysis -->
      <div class="flex flex-col md:flex-row gap-4 h-1/2">
        <div class="md:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 overflow-y-auto">
          <frame-gallery
            :frames="frames"
            @select-frame="selectFrame"
            :darkMode="darkMode"
          />
        </div>
        <div class="md:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 overflow-y-auto">
          <agent-editor
            :agents="entities.agents"
            @update-agents="updateAgents"
            :darkMode="darkMode"
          />
        </div>
        <div class="md:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-gray-700 dark:text-gray-300">Select Business Analyst Agent:</label>
            <select
              v-model="selectedBusinessAgent"
              class="w-full p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
            >
              <option v-for="agent in businessAgents" :key="agent.id" :value="agent">
                {{ agent.data.name }}
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
            :businessAnalysis="businessAnalysis"
            :includeImages="includeImages"
            @toggle-include-images="toggleIncludeImages"
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

    // State
    const video = Vue.ref(null); // Current video entity
    const videoUrl = Vue.ref(null); // Blob URL for video playback
    const analyzingFrames = Vue.ref(new Set()); // Track frames being analyzed
    const frames = Vue.computed(() => {
      if (!video.value) return [];
      const videoFrames = entities.value.image.filter(img => img.data.videoUuid === video.value.id);
      console.log(`Frames for video ${video.value.id}:`, videoFrames);
      return videoFrames.map(frame => ({
        ...frame,
        isAnalyzing: analyzingFrames.value.has(frame.id),
      }));
    });
    const frameTimestamps = Vue.computed(() => frames.value.map(f => f.data.timestamp));
    const selectedFrame = Vue.ref(null);
    const businessAnalysis = Vue.ref(null); // Markdown from businessAnalysis entity
    const includeImages = Vue.ref(false); // Download checkbox state
    const isHistorySynced = Vue.ref(false); // Track if history sync is complete
    const selectedBusinessAgent = Vue.ref(null); // Selected Business Analyst agent
    const businessAgents = Vue.computed(() => {
      return entities.value.agents.filter(agent => agent.data.name.toLowerCase().includes('business analyst'));
    });

    // Wait for history sync before loading data
    Vue.onMounted(() => {
      // Listen for the sync-history-data event to know when history is loaded
      eventBus.$on('sync-history-data', () => {
        console.log('History sync completed, loading channel data');
        console.log('Entities after sync:', entities.value);
        isHistorySynced.value = true;
        initializeDefaultAgents();
        loadChannelData();
        // Set default Business Analyst agent if available
        if (businessAgents.value.length > 0) {
          selectedBusinessAgent.value = businessAgents.value[0];
        }
      });
    });

    Vue.onUnmounted(() => {
      eventBus.$off('sync-history-data');
    });

    // Initialize default agents only if none exist
    function initializeDefaultAgents() {
      if (entities.value.agents.length === 0) {
        console.log('No agents loaded from backend, creating default agents');
        const defaultAgents = [
          {
            name: 'Description Agent',
            prompt: 'Analyze this image and provide a detailed textual description of its contents, including objects, people, text, and context. Return the response as JSON with a `description` field.',
            model: 'gemini-1.5-flash',
            description: 'Default Description Agent for frame analysis',
          },
          {
            name: 'Structured Data Agent',
            prompt: 'Identify any tabular or form data in this image (e.g., Excel tables, forms). Return JSON with a `structuredData` field containing an array of fields (name, value) or table rows/columns.',
            model: 'gemini-1.5-flash',
            description: 'Default Structured Data Agent for frame analysis',
          },
          {
            name: 'Knowledge Graph Agent',
            prompt: 'Extract the main elements and their relationships in this image. Return JSON with a `knowledgeGraph` field containing `nodes` (id, label) and `edges` (source, target, relation).',
            model: 'gemini-1.5-flash',
            description: 'Default Knowledge Graph Agent for frame analysis',
          },
          {
            name: 'Business Analyst',
            prompt: 'Given an array of frame analysis JSONs from multiple videos, generate a comprehensive business analysis in Markdown. Include insights, trends, and recommendations based on descriptions, structured data, and knowledge graphs from all frames across all videos.',
            model: 'gemini-1.5-flash',
            description: 'Default Business Analyst for generating comprehensive reports',
          },
        ];

        defaultAgents.forEach(agent => {
          addEntity('agents', agent);
        });
      } else {
        console.log(`Loaded ${entities.value.agents.length} agents from backend, skipping default agent creation`);
        // Ensure Business Analyst agent exists
        if (!entities.value.agents.some(agent => agent.data.name === 'Business Analyst')) {
          addEntity('agents', {
            name: 'Business Analyst',
            prompt: 'Given an array of frame analysis JSONs from multiple videos, generate a comprehensive business analysis in Markdown. Include insights, trends, and recommendations based on descriptions, structured data, and knowledge graphs from all frames across all videos.',
            model: 'gemini-1.5-flash',
            description: 'Default Business Analyst for generating comprehensive reports',
          });
        }
      }
    }

    function loadChannelData() {
      const channel = channelName.value;
      if (!channel) return;

      // Load frames and analysis for the channel
      const channelFrames = entities.value.image.filter(img => img.channel === channel);
      if (channelFrames.length > 0) {
        const videoId = channelFrames[0].data.videoUuid;
        const videoEntity = entities.value.video.find(v => v.id === videoId && v.channel === channel);
        if (videoEntity) {
          video.value = videoEntity;
          // Note: videoUrl cannot be reloaded without the file; user must re-upload
        }

        const channelAnalysis = entities.value.businessAnalysis.find(ba => ba.data.videoUuid === videoId && ba.channel === channel);
        if (channelAnalysis) {
          businessAnalysis.value = channelAnalysis.data.markdown;
        }
      }
    }

    // Video Upload
    async function handleVideoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const videoId = uuidv4();
      const videoData = {
        id: videoId, // Ensure the id is included in the data
        name: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
      const addedVideoId = addEntity('video', videoData);
      console.log(`Added video with ID ${addedVideoId}`);

      // Update video ref with the correct entity
      const videoEntity = entities.value.video.find(v => v.id === addedVideoId);
      video.value = videoEntity;
      videoUrl.value = URL.createObjectURL(file);

      // Reset state
      selectedFrame.value = null;
      businessAnalysis.value = null;
      analyzingFrames.value.clear();
    }

    // Remove Video
    function removeVideo(videoEntity) {
      removeEntity('video', videoEntity.id);
      if (video.value?.id === videoEntity.id) {
        video.value = null;
        videoUrl.value = null;
        selectedFrame.value = null;
        businessAnalysis.value = null;
        analyzingFrames.value.clear();
      }
    }

    // Reattach Video File
    function reattachVideo(videoEntity, file) {
      if (videoEntity.id === video.value?.id) {
        videoUrl.value = URL.createObjectURL(file);
      }
    }

    // Select Video from List
    function selectVideo(videoEntity) {
      video.value = videoEntity;
      videoUrl.value = null; // Reset videoUrl; user must reattach file to play
      selectedFrame.value = null;
      businessAnalysis.value = null;

      // Load associated business analysis
      const channelAnalysis = entities.value.businessAnalysis.find(ba => ba.data.videoUuid === videoEntity.id && ba.channel === channelName.value);
      if (channelAnalysis) {
        businessAnalysis.value = channelAnalysis.data.markdown;
      }
    }

    // Timestamps JSON Upload
    async function handleTimestampsUpload(event) {
      const file = event.target.files[0];
      if (!file || !video.value) return;

      const text = await file.text();
      const timestamps = JSON.parse(text);
      if (!Array.isArray(timestamps)) return;

      timestamps.forEach((timestamp, index) => {
        const imageId = addEntity('image', {
          videoUuid: video.value.id,
          timestamp,
          sequence: index + 1,
          imageData: '/assets/placeholder.jpg',
          analysis: [],
        });
        console.log(`Added image ${imageId} with videoUuid ${video.value.id}`);
      });
    }

    // Frame Extraction and Analysis
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
      console.log(`Added image ${imageId} with videoUuid ${video.value.id}`);

      // Track analysis status locally
      analyzingFrames.value.add(imageId);

      // Collect all agent prompts (excluding Business Analyst agents)
      const agentPrompts = entities.value.agents
        .filter(agent => !agent.data.name.toLowerCase().includes('business analyst'))
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

      console.log(`Processing frame ${imageId} with ${agentPrompts.length} agents in a single batch request`);

      // Send a single batch request to the backend
      try {
        const results = await analyzeFrame(imageData, agentPrompts);
        console.log(`Received batch response for frame ${imageId}:`, results);

        // Update image entity with all analysis results
        updateEntity('image', imageId, {
          videoUuid: video.value.id,
          timestamp,
          sequence,
          imageData,
          analysis: results,
        });
      } catch (error) {
        console.error(`Batch analysis failed for frame ${imageId}:`, error);
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
        console.log(`Completed analysis for frame ${imageId}`);
      }
    }

    // Frame Selection
    function selectFrame(frameId) {
      selectedFrame.value = frames.value.find(f => f.id === frameId) || null;
    }

    // Agent Updates
    function updateAgents(updatedAgents) {
      updatedAgents.forEach(agent => {
        const existing = entities.value.agents.find(a => a.id === agent.id);
        if (existing) {
          updateEntity('agents', agent.id, {
            name: agent.data.name,
            prompt: agent.data.prompt,
            model: agent.data.model,
            description: agent.data.description || existing.data.description,
          });
        } else {
          addEntity('agents', {
            name: agent.data.name,
            prompt: agent.data.prompt,
            model: agent.data.model,
            description: agent.data.description || 'Custom agent',
          });
        }
      });
    }

    // Business Analysis
    async function generateBusinessAnalysis() {
      if (!entities.value.image.length || !selectedBusinessAgent.value) return;

      // Group images by videoUuid
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

      // Create a structured payload for the business analysis
      const analysisData = Object.keys(imagesByVideo).map(videoUuid => ({
        videoUuid,
        video: entities.value.video.find(v => v.id === videoUuid)?.data || { name: 'Unknown Video' },
        frames: imagesByVideo[videoUuid],
      }));

      const prompt = `${selectedBusinessAgent.value.data.prompt}\n\nAnalysis Data by Video:\n${JSON.stringify(analysisData, null, 2)}`;

      try {
        const markdown = await generateText(prompt);
        businessAnalysis.value = markdown;
        addEntity('businessAnalysis', {
          videoUuid: video.value ? video.value.id : Object.keys(imagesByVideo)[0], // Use current video or first video
          markdown,
        });
      } catch (error) {
        console.error('Business analysis generation failed:', error);
        businessAnalysis.value = `Error: Unable to generate business analysis - ${error.message}`;
      }
    }

    // Download Checkbox
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
      includeImages,
      selectedBusinessAgent,
      businessAgents,
      handleVideoUpload,
      reattachVideo,
      selectVideo,
      removeVideo,
      handleTimestampsUpload,
      handleExtractFrame,
      selectFrame,
      updateAgents,
      generateBusinessAnalysis,
      toggleIncludeImages,
    };
  },
};