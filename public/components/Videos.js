import MediaPlayer from './MediaPlayer.js';
import FrameGallery from './FrameGallery.js';
import JsonViewer from './JsonViewer.js';
import AgentSelector from './AgentSelector.js';
import DownloadButton from './DownloadButton.js';
import MediaList from './MediaList.js';
import SimpleAnalysis from './SimpleAnalysis.js';
import AdvancedAnalysis from './AdvancedAnalysis.js';
import { useGlobal } from '../composables/useGlobal.js';
import { useHistory } from '../composables/useHistory.js';
import { useRealTime } from '../composables/useRealTime.js';
import { useGeminiApi } from '../composables/useGeminiApi.js';
import { useBusinessAnalyst } from '../composables/useBusinessAnalyst.js';
import eventBus from '../composables/eventBus.js';

export default {
  name: 'Videos',
  components: { MediaPlayer, FrameGallery, JsonViewer, AgentSelector, DownloadButton, MediaList, SimpleAnalysis, AdvancedAnalysis },
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 p-4 gap-4">
      <!-- First Row: Media in Channel and Project Prompt -->
      <div class="flex flex-col md:flex-row gap-4">
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <media-list
            :media="media"
            @select-media="selectMedia"
            @reattach-media="reattachMedia"
            @remove-media="removeMedia"
            @edit-media="openEditMediaModal"
            @upload-media="handleMediaUpload"
            @update-media="handleUpdateMedia"
            :darkMode="darkMode"
          />
        </div>
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <label class="text-gray-700 dark:text-gray-300 block mb-2">Project Prompt</label>
          <textarea
            v-model="projectPrompt"
            class="w-full h-32 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
            placeholder="Describe the intent of this initiative..."
          ></textarea>
        </div>
      </div>

      <!-- Second Row: Media Display and Agent Selector -->
      <div class="flex flex-col md:flex-row gap-4">
        <div class="md:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div v-if="!mediaUrl" class="flex flex-col gap-4">
            <p class="text-center text-gray-500 dark:text-gray-400">Select or upload a video, image, or audio to start analyzing.</p>
          </div>
          <media-player
            v-else
            :mediaFile="mediaUrl"
            :media="selectedMedia"
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

      <!-- Third Row: Captured Frames and Analysis Output -->
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

      <!-- Fourth Row: Download Button -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col gap-4">
        <download-button
          :frames="frames"
          :businessAnalysis="selectedBusinessAnalysis?.data?.markdown"
          :includeImages="includeImages"
          @toggle-include-images="toggleIncludeImages"
          :darkMode="darkMode"
        />
      </div>

      <!-- Fifth Row: Simple and Advanced Analysis with Tabbed Navigation -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            @click="activeTab = 'simple'"
            class="py-2 px-4"
            :class="activeTab === 'simple' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400'"
          >
            Simple Analysis
          </button>
          <button
            @click="activeTab = 'advanced'"
            class="py-2 px-4"
            :class="activeTab === 'advanced' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-500 dark:text-gray-400'"
          >
            Advanced Analysis
          </button>
        </div>
        <div class="mt-4">
          <simple-analysis
            v-if="activeTab === 'simple'"
            :analyses="entities.businessAnalysis"
            :selected-agents="selectedAgents"
            :entities="entities"
            :project-prompt="projectPrompt"
            :updateEntity="updateEntity"
            :selected-business-analysis="selectedBusinessAnalysis"
            @select-analysis="selectBusinessAnalysis"
            @generate-business-analysis="generateSimpleAnalysis"
            @delete-analysis="deleteBusinessAnalysis"
            :dark-mode="darkMode"
          />
          <advanced-analysis
            v-else
            :entities="entities"
            :selected-agents="selectedAgents"
            :project-prompt="projectPrompt"
            :updateEntity="updateEntity"
            :selected-business-analysis="selectedBusinessAnalysis"
            @select-analysis="selectBusinessAnalysis"
            @generate-business-analysis="generateAdvancedAnalysis"
            @delete-analysis="deleteBusinessAnalysis"
            :dark-mode="darkMode"
          />
        </div>
      </div>

      <!-- Edit Media Modal -->
      <div
        v-if="showEditModal"
        class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Media</h2>
          <div class="flex flex-col gap-4">
            <div>
              <label class="text-gray-700 dark:text-gray-300 block mb-1">Media Name</label>
              <input
                v-model="editMediaData.name"
                class="w-full p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter media name"
              />
            </div>
            <div>
              <label class="text-gray-700 dark:text-gray-300 block mb-1">Media Description</label>
              <textarea
                v-model="editMediaData.description"
                class="w-full h-24 p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter media description"
              ></textarea>
            </div>
            <div class="flex justify-end gap-2">
              <button
                @click="closeEditMediaModal"
                class="py-2 px-4 bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 hover:bg-gray-400 text-gray-900 dark:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                @click="saveMediaEdits"
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

    const media = Vue.computed(() => entities.value?.media || []);
    const selectedMedia = Vue.ref(null);
    const mediaUrl = Vue.ref(null);
    const mediaFiles = Vue.ref({});
    const analyzingFrames = Vue.ref(new Set());
    const frames = Vue.computed(() => {
      if (!selectedMedia.value) return [];
      const mediaFrames = entities.value?.image?.filter(img => img.data.mediaUuid === selectedMedia.value.id) || [];
      return mediaFrames.map(frame => ({
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
    const editMediaData = Vue.ref({ id: null, name: '', description: '', type: '' });
    const activeTab = Vue.ref('simple');

    Vue.onMounted(() => {
      eventBus.$on('sync-history-data', () => {
        isHistorySynced.value = true;
        loadChannelData();
        const channelEntity = entities.value?.channel?.find(c => c.id === channelName.value);
        selectedAgents.value = entities.value?.agents?.map(agent => agent.id) || [];
      });
    });

    Vue.onUnmounted(() => {
      eventBus.$off('sync-history-data');
      Object.values(mediaFiles.value).forEach(file => {
        if (mediaUrl.value && mediaUrl.value.startsWith('blob:')) {
          URL.revokeObjectURL(mediaUrl.value);
        }
      });
      mediaFiles.value = {};
    });

    function loadChannelData() {
      const channel = channelName.value;
      if (!channel) return;

      const channelFrames = entities.value?.image?.filter(img => img.channel === channel && img.data.mediaUuid) || [];
      if (channelFrames.length > 0) {
        const mediaId = channelFrames[0].data.mediaUuid;
        let mediaEntity = entities.value?.media?.find(m => m.id === mediaId && m.channel === channel);
        if (mediaEntity) {
          console.log('Videos.js: Loaded media entity after refresh:', mediaEntity);
          selectedMedia.value = mediaEntity;
          const file = mediaFiles.value[mediaEntity.id];
          mediaUrl.value = file ? URL.createObjectURL(file) : null;
        }

        const channelAnalysis = entities.value?.businessAnalysis?.find(ba => ba.data.mediaUuid === mediaId && ba.channel === channel);
        if (channelAnalysis) {
          selectBusinessAnalysis(channelAnalysis.id);
        }
      }
    }

    function handleUpdateMedia(mediaItem) {
      if (mediaItem?.id && mediaItem?.data) {
        console.log('Videos.js: Received update-media event for media', mediaItem.id, 'with data:', mediaItem.data);
        updateEntity('media', mediaItem.id, mediaItem.data);
        console.log('Videos.js: Updated entity in database for media', mediaItem.id);
      } else {
        console.warn('Videos.js: Invalid mediaItem received in update-media event:', mediaItem);
      }
    }

    async function handleMediaUpload(files) {
      console.log('handleMediaUpload called with files:', files);
      if (!files || files.length === 0) return;

      let lastMediaEntity = null;
      for (const file of files) {
        const mediaId = uuidv4();
        const mediaData = {
          name: file.name,
          description: '',
          fileSize: file.size,
          mimeType: file.type,
          type: file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image',
        };
        console.log(`Adding media to entities with mediaData for file ${file.name}:`, mediaData);
        const addedMediaId = addEntity('media', mediaData, mediaId, channelName.value);
        console.log(`Added media ID for file ${file.name}:`, addedMediaId);

        const mediaEntity = entities.value?.media?.find(m => m.id === addedMediaId);
        console.log(`Found mediaEntity for file ${file.name}:`, mediaEntity);
        mediaFiles.value[addedMediaId] = file;
        lastMediaEntity = mediaEntity;
      }

      if (lastMediaEntity) {
        selectedMedia.value = lastMediaEntity;
        mediaUrl.value = URL.createObjectURL(files[files.length - 1]);
        console.log('Selected last uploaded media:', selectedMedia.value);
      }

      selectedFrame.value = null;
      businessAnalysis.value = null;
      selectedBusinessAnalysis.value = null;
      analyzingFrames.value.clear();
    }

    function removeMedia(mediaEntity) {
      removeEntity('media', mediaEntity.id);
      delete mediaFiles.value[mediaEntity.id];
      if (selectedMedia.value?.id === mediaEntity.id) {
        selectedMedia.value = null;
        mediaUrl.value = null;
        selectedFrame.value = null;
        businessAnalysis.value = null;
        selectedBusinessAnalysis.value = null;
        analyzingFrames.value.clear();
      }
    }

    function reattachMedia(mediaEntity, file) {
      selectMedia(mediaEntity);
      mediaFiles.value[mediaEntity.id] = file;
      mediaUrl.value = URL.createObjectURL(file);
    }

    function selectMedia(mediaEntity) {
      selectedMedia.value = mediaEntity;
      const file = mediaFiles.value[mediaEntity.id];
      mediaUrl.value = file ? URL.createObjectURL(file) : null;
      selectedFrame.value = null;
      businessAnalysis.value = null;

      const channelAnalysis = entities.value?.businessAnalysis?.find(ba => ba.data.mediaUuid === mediaEntity.id && ba.channel === channelName.value);
      if (channelAnalysis) {
        selectBusinessAnalysis(channelAnalysis.id);
      } else {
        selectedBusinessAnalysis.value = null;
      }
    }

    function openEditMediaModal(mediaEntity) {
      editMediaData.value = {
        id: mediaEntity.id,
        name: mediaEntity.data.name,
        description: mediaEntity.data.description || '',
        type: mediaEntity.data.type,
      };
      showEditModal.value = true;
    }

    function closeEditMediaModal() {
      showEditModal.value = false;
      editMediaData.value = { id: null, name: '', description: '', type: '' };
    }

    function saveMediaEdits() {
      if (editMediaData.value.id) {
        const mediaEntity = entities.value?.media?.find(m => m.id === editMediaData.value.id);
        if (mediaEntity) {
          const updatedData = {
            name: editMediaData.value.name,
            description: editMediaData.value.description,
            fileSize: mediaEntity.data.fileSize,
            mimeType: mediaEntity.data.mimeType,
            type: mediaEntity.data.type,
            transcription: mediaEntity.data.transcription, // Preserve transcription
          };
          updateEntity('media', mediaEntity.id, updatedData);
          selectedMedia.value = { ...mediaEntity, data: updatedData };
        }
      }
      closeEditMediaModal();
    }

    function selectBusinessAnalysis(analysisId) {
      const analysis = entities.value?.businessAnalysis?.find(ba => ba.id === analysisId);
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

    async function handleExtractFrame({ timestamp, imageData, includeTranscription, transcription }) {
      if (!selectedMedia.value) return;

      const sequence = frames.value.length + 1;
      const imageId = addEntity('image', {
        mediaUuid: selectedMedia.value.id,
        timestamp,
        sequence,
        imageData,
        analysis: [],
      }, null, channelName.value);

      analyzingFrames.value.add(imageId);
      await processFrame(imageId, imageData, timestamp, sequence, includeTranscription, transcription);
    }

    async function processFrame(imageId, imageData, timestamp, sequence, includeTranscription, transcription) {
      const agentPrompts = entities.value?.agents
        ?.filter(agent => selectedAgents.value.includes(agent.id))
        ?.map(agent => {
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
              content: `Media Name: ${selectedMedia.value.data.name}\nMedia Description: ${selectedMedia.value.data.description || 'No description provided.'}`,
            },
            {
              role: 'user',
              content: agent.data.userPrompts?.map(p => p.content).filter(c => c).join('\n\n') || 'No user prompts provided.',
            },
          ];

          if (includeTranscription && transcription) {
            messageHistory.push({
              role: 'user',
              content: `Transcription at ${formatTime(timestamp)}: ${transcription.speaker}: ${transcription.text}`,
            });
          }

          return {
            agentId: agent.id,
            systemPrompt,
            messageHistory,
            model: agent.data.model || 'gemini-1.5-flash',
          };
        }) || [];

      try {
        const results = await analyzeFrame(imageData, agentPrompts);
        updateEntity('image', imageId, {
          mediaUuid: selectedMedia.value.id,
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
          mediaUuid: selectedMedia.value.id,
          timestamp,
          sequence,
          imageData,
          analysis: failedAnalysis,
        });
      } finally {
        analyzingFrames.value.delete(imageId);
      }
    }

    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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

    async function generateSimpleAnalysis(selectedBusinessAgent) {
      if (!entities.value?.image?.length || !selectedBusinessAgent) return;

      const agent = entities.value?.agents?.find(a => a.id === selectedBusinessAgent);
      if (!agent) return;

      const systemPrompt = [
        ...(agent.data.systemPrompts || []),
      ]
        .map(p => p.content)
        .filter(c => c)
        .join('\n\n') || 'No system prompts provided.';

      const messageHistory = [
        {
          role: 'user',
          content: projectPrompt.value || 'No project prompt provided.',
        },
        {
          role: 'user',
          content: agent.data.userPrompts?.map(p => p.content).filter(c => c).join('\n\n') || 'No user prompts provided.',
        },
      ];

      entities.value?.image?.forEach(image => {
        image.data.analysis.forEach(analysis => {
          const text = analysis.response?.text || analysis.response?.description || '';
          if (text) {
            messageHistory.push({
              role: 'user',
              content: `Frame Analysis (Media UUID: ${image.data.mediaUuid}, Timestamp: ${image.data.timestamp}): ${text}`,
            });
          }
        });
      });

      const promptData = {
        systemPrompt: systemPrompt + '\n\nReturn your response in a complete and comprehensive markdown document.',
        messageHistory,
        model: agent.data.model || 'gemini-1.5-flash',
      };

      console.log('Simple Analysis LLM PAYLOAD:', promptData);

      try {
        const markdown = await generateText(promptData);
        businessAnalysis.value = markdown;
        const newAnalysisId = addEntity('businessAnalysis', {
          mediaUuid: selectedMedia.value ? selectedMedia.value.id : entities.value?.image[0]?.data.mediaUuid,
          markdown,
        }, null, channelName.value);
        selectBusinessAnalysis(newAnalysisId);
      } catch (error) {
        businessAnalysis.value = `Error: Unable to generate business analysis - ${error.message}`;
        selectBusinessAnalysis(null);
      }
    }

    async function generateAdvancedAnalysis(selectedBusinessAgent, customPrompt, selectedArtifacts) {
      if (!entities.value?.image?.length || !selectedBusinessAgent) return;

      const agent = entities.value?.agents?.find(a => a.id === selectedBusinessAgent);
      if (!agent) return;

      console.log('Received selectedArtifacts:', selectedArtifacts);
      console.log('Entities media:', entities.value?.media);

      const systemPrompt = customPrompt
        ? 'No system prompts provided.'
        : [
            ...(agent.data.systemPrompts || []),
            ...(agent.data.userPrompts || []),
          ]
            .map(p => p.content)
            .filter(c => c)
            .join('\n\n') || 'No system prompts provided.';

      const messageHistory = [];

      if (customPrompt) {
        messageHistory.push({
          role: 'user',
          content: customPrompt || 'No custom prompt provided.',
        });
      } else {
        messageHistory.push({
          role: 'user',
          content: projectPrompt.value || 'No project prompt provided.',
        });
        messageHistory.push({
          role: 'user',
          content: agent.data.userPrompts?.map(p => p.content).filter(c => c).join('\n\n') || 'No user prompts provided.',
        });
      }

      if (selectedArtifacts?.projectPrompt) {
        messageHistory.push({
          role: 'user',
          content: `Project Prompt: ${projectPrompt.value}`,
        });
      }

      if (selectedArtifacts?.transcriptions?.length) {
        console.log('Processing transcriptions:', selectedArtifacts.transcriptions);
        selectedArtifacts.transcriptions.forEach(mediaId => {
          const media = entities.value?.media?.find(m => m.id === mediaId);
          console.log(`Media found for ID ${mediaId}:`, media);
          if (media?.data?.transcription?.segments) {
            console.log(`Transcription segments for ${mediaId}:`, media.data.transcription.segments);
            const transcriptionText = media.data.transcription.segments
              .map(segment => `${segment.speaker}: ${segment.text}`)
              .join('\n');
            messageHistory.push({
              role: 'user',
              content: `Transcription for ${media.data.name}:\n${transcriptionText}`,
            });
          } else {
            console.log(`No transcription segments found for media ID ${mediaId}`);
          }
        });
      } else {
        console.log('No transcriptions selected in selectedArtifacts');
      }

      if (selectedArtifacts?.frameAnalyses) {
        Object.entries(selectedArtifacts.frameAnalyses).forEach(([frameId, agentIds]) => {
          const frame = entities.value?.image?.find(img => img.id === frameId);
          if (frame) {
            agentIds.forEach(agentId => {
              const analysis = frame.data.analysis.find(a => a.agentId === agentId);
              if (analysis?.response?.text || analysis?.response?.description) {
                const text = analysis.response.text || analysis.response.description;
                messageHistory.push({
                  role: 'user',
                  content: `Frame Analysis (Media UUID: ${frame.data.mediaUuid}, Timestamp: ${frame.data.timestamp}, Agent: ${agentId}): ${text}`,
                });
              }
            });
          }
        });
      }

      if (selectedArtifacts?.businessAnalyses) {
        selectedArtifacts.businessAnalyses.forEach(analysisId => {
          const analysis = entities.value?.businessAnalysis?.find(ba => ba.id === analysisId);
          if (analysis?.data?.markdown) {
            messageHistory.push({
              role: 'user',
              content: `Previous Business Analysis (ID: ${analysisId}): ${analysis.data.markdown}`,
            });
          }
        });
      }

      const promptData = {
        systemPrompt: systemPrompt + '\n\nReturn your response in a complete and comprehensive markdown document.',
        messageHistory,
        model: agent.data.model || 'gemini-1.5-flash',
      };

      console.log('Advanced Analysis LLM PAYLOAD:', promptData);

      try {
        const markdown = await generateText(promptData);
        businessAnalysis.value = markdown;
        const newAnalysisId = addEntity('businessAnalysis', {
          mediaUuid: selectedMedia.value ? selectedMedia.value.id : entities.value?.image[0]?.data.mediaUuid,
          markdown,
        }, null, channelName.value);
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
      media,
      selectedMedia,
      mediaUrl,
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
      editMediaData,
      activeTab,
      handleMediaUpload,
      reattachMedia,
      selectMedia,
      removeMedia,
      openEditMediaModal,
      closeEditMediaModal,
      saveMediaEdits,
      handleExtractFrame,
      processFrame,
      deleteFrame,
      selectFrame,
      selectBusinessAnalysis,
      deleteBusinessAnalysis,
      generateSimpleAnalysis,
      generateAdvancedAnalysis,
      toggleAgent,
      toggleIncludeImages,
      updateEntity,
      handleUpdateMedia,
    };
  },
};