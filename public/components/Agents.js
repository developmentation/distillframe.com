import { useGlobal } from '../composables/useGlobal.js';
import { useHistory } from '../composables/useHistory.js';
import { useModels } from '../composables/useModels.js';

export default {
  name: 'Agents',
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-8 flex justify-between items-center">
        <h2 class="text-2xl font-semibold" :class="darkMode ? 'text-white' : 'text-gray-900'">Manage AI Agents</h2>
        <div class="flex gap-4">
          <select
            v-model="selectedCategory"
            class="p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <option v-for="category in categories" :key="category.value" :value="category.value">{{ category.label }}</option>
          </select>
          <button
            @click="addDefaultAgents"
            class="py-2 px-4 bg-green-600 dark:bg-green-500 dark:hover:bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all"
          >
            Add Default Agents
          </button>
          <button
            @click="openEditModal()"
            class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all"
          >
            Add New Agent
          </button>
        </div>
      </div>

      <!-- Agents Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="agent in entities.agents"
          :key="agent.id"
          class="relative h-48 rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105"
          :style="{ backgroundImage: \`url(\${agent.data.imageUrl ? agent.data.imageUrl : returnImage(agent.data.placeholderImage)})\`, backgroundSize: 'cover', backgroundPosition: 'center' }"
        >
          <div class="absolute inset-0 bg-gradient-to-t from-gray-900/90 to-transparent"></div>
          <div class="relative z-10 flex flex-col h-full p-4 justify-between">
            <div>
              <h3 class="text-xl font-semibold text-white">{{ agent.data.name }}</h3>
              <p class="text-gray-300 text-sm mt-1 line-clamp-2">{{ agent.data.description }}</p>
              <p class="text-gray-400 text-xs mt-1">{{ agent.data.category }}</p>
            </div>
            <div class="flex justify-end gap-2">
              <button @click.stop="openEditModal(agent)" class="py-1 px-3 bg-blue-500 dark:bg-blue-400 dark:hover:bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
                Edit
              </button>
              <button @click.stop="removeAgent(agent.id)" class="py-1 px-3 bg-red-500 dark:bg-red-400 dark:hover:bg-red-600 hover:bg-red-600 text-white rounded-lg transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
        <div v-if="!entities.agents.length" class="col-span-full text-center py-12" :class="darkMode ? 'text-gray-400' : 'text-gray-500'">
          No agents created yet. Click "Add New Agent" or "Add Default Agents" to get started.
        </div>
      </div>

      <!-- Edit Modal -->
      <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl">
          <h2 class="text-xl font-semibold text-blue-500 dark:text-blue-400 mb-6">{{ editingAgent ? 'Edit Agent' : 'Add Agent' }}</h2>
          
          <!-- Responsive Grid: Two columns on desktop, single column on mobile -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Left Column: Agent Info -->
            <div class="space-y-6">
              <div>
                <input
                  v-model="agentName"
                  @input="validateName"
                  type="text"
                  class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                  placeholder="Agent name (letters, numbers, underscores only, no spaces)"
                  :class="{ 'border-red-500': nameError }"
                />
                <span v-if="nameError" class="text-red-500 text-sm mt-1 block">{{ nameError }}</span>
              </div>
              <textarea
                v-model="agentDescription"
                class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all h-32"
                placeholder="Description (e.g., Analyzes images for structured data)"
              ></textarea>
              <input
                v-model="agentImageUrl"
                type="text"
                class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                placeholder="Image URL for avatar (optional)"
              />
              <div>
                <label class="text-gray-700 dark:text-gray-300 mb-2 block font-medium">Select Model</label>
                <select
                  v-model="agentModel"
                  class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all"
                >
                  <option v-for="model in models" :key="model.model" :value="model.model">
                    {{ model.name.en }} ({{ model.provider }})
                  </option>
                </select>
              </div>
            </div>

            <!-- Right Column: System and User Prompts -->
            <div class="space-y-6">
              <!-- System Prompts -->
              <div>
                <h3 class="text-gray-700 dark:text-gray-300 mb-3 font-medium">System Prompts</h3>
                <table class="w-full text-left border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead>
                    <tr class="bg-gray-100 dark:bg-gray-700">
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Type</th>
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Content</th>
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(prompt, index) in systemPrompts" :key="prompt.id" class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td class="py-3 px-4">
                        <select v-model="prompt.type" class="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-1 w-full border border-gray-200 dark:border-gray-600">
                          <option value="text">Text</option>
                        </select>
                      </td>
                      <td class="py-3 px-4">
                        <button @click="openPromptModal('system', index, prompt.content)" class="py-1 px-3 bg-blue-5 dark:bg-blue-400 dark:hover:bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
                          Edit
                        </button>
                      </td>
                      <td class="py-3 px-4">
                        <button @click="removePrompt('system', index)" class="text-red-500 hover:text-red-600">
                          <i class="pi pi-times"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <button @click="addPrompt('system')" class="mt-3 py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">
                  Add System Prompt
                </button>
              </div>

              <!-- User Prompts -->
              <div>
                <h3 class="text-gray-700 dark:text-gray-300 mb-3 font-medium">User Prompts</h3>
                <table class="w-full text-left border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead>
                    <tr class="bg-gray-100 dark:bg-gray-700">
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Type</th>
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Content</th>
                      <th class="py-3 px-4 text-gray-900 dark:text-gray-200 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(prompt, index) in userPrompts" :key="prompt.id" class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td class="py-3 px-4">
                        <select v-model="prompt.type" class="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-1 w-full border border-gray-200 dark:border-gray-600">
                          <option value="text">Text</option>
                        </select>
                      </td>
                      <td class="py-3 px-4">
                        <button @click="openPromptModal('user', index, prompt.content)" class="py-1 px-3 bg-blue-500 dark:bg-blue-400 dark:hover:bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all">
                          Edit
                        </button>
                      </td>
                      <td class="py-3 px-4">
                        <button @click="removePrompt('user', index)" class="text-red-500 hover:text-red-600">
                          <i class="pi pi-times"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <button @click="addPrompt('user')" class="mt-3 py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">
                  Add User Prompt
                </button>
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="mt-6 flex gap-3 justify-end">
            <button @click="closeModal" class="py-2 px-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-all">Cancel</button>
            <button @click="saveAgent" class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">Save</button>
          </div>
        </div>
      </div>

      <!-- Prompt Editing Modal -->
      <div v-if="isPromptModalOpen" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg w-full max-w-xl max-h-[80vh] overflow-y-auto shadow-xl">
          <h2 class="text-xl font-semibold text-blue-500 dark:text-blue-400 mb-6">Edit Prompt</h2>
          <textarea
            v-model="promptContent"
            class="w-full p-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:outline-none transition-all h-64"
            placeholder="Enter prompt for image analysis (e.g., Analyze this image and return JSON with a description field)"
          ></textarea>
          <div class="mt-6 flex gap-3 justify-end">
            <button @click="closePromptModal" class="py-2 px-4 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-all">Cancel</button>
            <button @click="savePrompt" class="py-2 px-4 bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all">Save</button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const { entities } = useGlobal();
    const { addEntity, updateEntity, removeEntity } = useHistory();
    const { models } = useModels();

    const agentName = Vue.ref('');
    const agentDescription = Vue.ref('');
    const agentImageUrl = Vue.ref('');
    const agentModel = Vue.ref('gemini-1.5-flash');
    const systemPrompts = Vue.ref([]);
    const userPrompts = Vue.ref([]);
    const nameError = Vue.ref('');
    const editErrors = Vue.ref({});
    const isModalOpen = Vue.ref(false);
    const isPromptModalOpen = Vue.ref(false);
    const editingAgent = Vue.ref(null);
    const agentId = Vue.ref('');
    const promptType = Vue.ref('');
    const promptIndex = Vue.ref(null);
    const promptContent = Vue.ref('');
    const selectedCategory = Vue.ref('business');

    const defaultAgentCategories = {
      business: [
        {
          name: 'StructuredDataIdentifier',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 'Analyze the image for structured data such as graphs, charts, tables, Excel interfaces, or forms.' },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return JSON with a `structuredData` field containing identified data types and their descriptions.' },
          ],
          description: 'Identifies structured data in images like graphs, charts, or forms',
          model: 'gemini-1.5-flash',
          category: 'Business Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },
        {
          name: 'InterfaceDescriptor',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 'Provide a clear and detailed description of the interface in the image, including layout, components, and design elements.' },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Format the response as JSON with a `description` field.' },
          ],
          description: 'Describes interfaces for clear recreation by others',
          model: 'gemini-1.5-flash',
          category: 'Business Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },
        {
          name: 'WorkflowAnalyzer',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 'Identify the workflow in the image (e.g., user-driven, linear, sequential, task-based, Gantt, Kanban, ticket-based).' },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return JSON with a `workflow` field describing the type and details.' },
          ],
          description: 'Analyzes workflows in interfaces',
          model: 'gemini-1.5-flash',
          category: 'Business Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },

        {
          name: 'BusinessAnalyst',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 
              
`
You are a senior business analyst tasked with reviewing a set of analyses generated by other language models based on screenshots of an application or user flow, along with descriptions of related videos. Your objective is to evaluate the provided materials, including the project's stated goals, the video descriptions, and the analyses of the screenshots (which include structured data, UI elements, key features, and other extracted information). Based on this review, you will prepare a comprehensive Business Requirements Document (BRD) and a summarized report.

### Instructions:
1. **Understand the Project Objective**:
   - Review the stated objective of the project to understand its purpose, target audience, and intended outcomes.
   - Identify any gaps or ambiguities in the objective that may require clarification or assumptions.

2. **Evaluate Video Descriptions**:
   - Analyze the provided descriptions of videos related to the application or user flow.
   - Assess whether the descriptions align with the project objective and provide sufficient context for the user flow or functionality depicted in the screenshots.
   - Note any discrepancies, missing information, or assumptions needed to bridge gaps in the video descriptions.

3. **Evaluate Screenshot Analyses**:
   - Review the analyses of the screenshots, which include:
     - Structured data extracted from the UI (e.g., fields, labels, buttons).
     - Identified UI elements (e.g., menus, forms, navigation components).
     - Key features or functionalities inferred from the screenshots.
     - Any other relevant observations or insights.
   - Assess the accuracy, completeness, and relevance of the analyses in relation to the project objective.
   - Identify inconsistencies, gaps, or areas where further clarification is needed.
   - Validate whether the extracted data and features align with the user flow or application purpose described in the video descriptions and project objective.

4. **Prepare a Business Requirements Document (BRD)**:
   - Create a comprehensive BRD that includes the following sections:
     - **Introduction**: Summarize the project objective, scope, and purpose of the BRD.
     - **Business Requirements**: Outline the key business needs and goals the application or user flow aims to address.
     - **Functional Requirements**: Detail the specific functionalities, features, and user interactions based on the screenshot analyses and video descriptions. Include structured data points (e.g., input fields, outputs) and UI components.
     - **Non-Functional Requirements**: Specify performance, usability, accessibility, or security requirements inferred from the materials or assumed based on standard practices.
     - **Key Activities**: Describe the primary user activities or workflows supported by the application, linking them to the UI elements and features identified.
     - **Data Requirements**: List the data inputs, outputs, and storage needs based on the structured data extracted from the screenshots.
     - **Assumptions**: Document any assumptions made due to gaps in the provided materials (e.g., missing video details, unclear UI functionality).
     - **Constraints**: Note any limitations or risks inferred from the analyses or materials.
     - **Stakeholder Considerations**: Identify potential stakeholders (e.g., end-users, administrators) and their needs based on the application's purpose.
   - Ensure the BRD is clear, structured, and actionable, with traceability to the provided materials.

5. **Provide a Summarized Report**:
   - Create a comprehensive report identifying your findings and recommendations, including:
     - A high-level overview of the project objective and alignment with the provided materials.
     - Key strengths and weaknesses of the screenshot analyses and video descriptions.
     - Critical findings from the BRD, such as key functionalities, data needs, or gaps.
     - Recommendations for next steps, such as areas needing further clarification, additional stakeholder input, or validation of assumptions.
     - Highlight any risks or challenges that could impact the project's success.

6. **Guidelines**:
   - Maintain a professional tone and structure in both the BRD and summarized report.
   - Use clear, concise language to ensure accessibility to both technical and non-technical stakeholders.
   - Organize the BRD with headings, subheadings, and numbered lists for readability.
   - Explicitly link findings to the provided materials (e.g., “Based on screenshot analysis of the login page…”).
   - If critical information is missing, make reasonable assumptions and clearly label them as such in the BRD and report.
   - Avoid speculative features or requirements not supported by the provided materials.

### Deliverables:
- A complete Business Requirements Document (BRD) capturing the key activities, data, requirements, assumptions, and other relevant details.
- A summarized report highlighting key findings, recommendations, and next steps.

Proceed with the review and produce the requested deliverables based on the provided materials.
`

             },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return a markdown formated document with clear headings, sections and subsections.' },
          ],
          description: 'Writes comprehensive business analysis',
          model: 'gemini-1.5-flash',
          category: 'Business Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },

      ],
      web: [
        {
          name: 'UIDescriptor',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 'Describe the core layout and components of the web interface in the image (e.g., title bars, headers, hero sections, dropdowns, forms, buttons).' },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return JSON with a `layout` field.' },
          ],
          description: 'Describes web interface layouts and components',
          model: 'gemini-1.5-flash',
          category: 'Web Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },
        {
          name: 'StyleDescriptor',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 'Analyze the styling of the web interface (e.g., light/dark mode, CSS framework like Tailwind, color scheme, typography).' },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return JSON with a `styles` field.' },
          ],
          description: 'Describes web interface styling and look-and-feel',
          model: 'gemini-1.5-flash',
          category: 'Web Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },
        {
          name: 'PurposeAnalysis',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 'Evaluate the likely purpose of the web interface components and their functionality.' },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return JSON with a `purpose` field describing the inferred goals and interactions.' },
          ],
          description: 'Analyzes the purpose and functionality of web components',
          model: 'gemini-1.5-flash',
          category: 'Web Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },
      ],
    };

    const categories = Vue.computed(() => Object.keys(defaultAgentCategories).map(key => ({
      value: key,
      label: defaultAgentCategories[key][0].category,
    })));

    function addDefaultAgents() {
      const agents = defaultAgentCategories[selectedCategory.value] || [];
      agents.forEach(agent => {
        addEntity('agents', {
          ...agent,
          placeholderImage: Math.floor(Math.random() * 10) + 1, // Ensure a new random image on each addition
        });
      });
    }

    function addAgentWithPlaceholder() {
      if (nameError.value || !agentName.value.trim()) return;
      addEntity('agents', {
        name: agentName.value,
        description: agentDescription.value,
        imageUrl: agentImageUrl.value,
        model: agentModel.value,
        systemPrompts: systemPrompts.value,
        userPrompts: userPrompts.value,
        placeholderImage: Math.floor(Math.random() * 10) + 1,
      });
      closeModal();
    }

    function validateName() {
      if (!/^[a-zA-Z0-9_]+$/.test(agentName.value)) {
        nameError.value = 'Name must contain only letters, numbers, or underscores, no spaces.';
      } else {
        nameError.value = '';
      }
    }

    function validateEditName(agent) {
      if (!/^[a-zA-Z0-9_]+$/.test(agent.data.name)) {
        editErrors.value[agent.id] = 'Invalid name';
      } else {
        delete editErrors.value[agent.id];
      }
    }

    function openEditModal(agent = null) {
      if (agent) {
        editingAgent.value = agent;
        agentId.value = agent.id;
        agentName.value = agent.data.name;
        agentDescription.value = agent.data.description;
        agentImageUrl.value = agent.data.imageUrl || '';
        agentModel.value = agent.data.model || 'gemini-1.5-flash';
        systemPrompts.value = agent.data.systemPrompts ? [...agent.data.systemPrompts] : [];
        userPrompts.value = agent.data.userPrompts ? [...agent.data.userPrompts] : [];
      } else {
        editingAgent.value = null;
        agentId.value = uuidv4();
        agentName.value = '';
        agentDescription.value = '';
        agentImageUrl.value = '';
        agentModel.value = 'gemini-1.5-flash';
        systemPrompts.value = [];
        userPrompts.value = [];
      }
      isModalOpen.value = true;
      validateName();
    }

    function closeModal() {
      isModalOpen.value = false;
      editingAgent.value = null;
    }

    function addPrompt(type) {
      const prompts = type === 'system' ? systemPrompts : userPrompts;
      prompts.value.push({ id: uuidv4(), type: 'text', content: '' });
    }

    function removePrompt(type, index) {
      const prompts = type === 'system' ? systemPrompts : userPrompts;
      prompts.value.splice(index, 1);
    }

    function openPromptModal(type, index, content) {
      promptType.value = type;
      promptIndex.value = index;
      promptContent.value = content || '';
      isPromptModalOpen.value = true;
    }

    function closePromptModal() {
      isPromptModalOpen.value = false;
      promptType.value = '';
      promptIndex.value = null;
      promptContent.value = '';
    }

    function savePrompt() {
      if (promptType.value && promptIndex.value !== null) {
        const prompts = promptType.value === 'system' ? systemPrompts : userPrompts;
        prompts.value[promptIndex.value] = { ...prompts.value[promptIndex.value], content: promptContent.value };
      }
      closePromptModal();
    }

    function updateAgent(agent) {
      if (editErrors.value[agent.id]) return;
      updateEntity('agents', agent.id, {
        name: agent.data.name,
        description: agent.data.description,
        imageUrl: agent.data.imageUrl,
        model: agent.data.model,
        systemPrompts: agent.data.systemPrompts,
        userPrompts: agent.data.userPrompts,
        category: agent.data.category || undefined,
        placeholderImage: agent.data.placeholderImage,
      });
    }

    function saveAgent() {
      if (nameError.value) return;
      if (editingAgent.value) {
        updateEntity('agents', agentId.value, {
          name: agentName.value,
          description: agentDescription.value,
          imageUrl: agentImageUrl.value,
          model: agentModel.value,
          systemPrompts: systemPrompts.value,
          userPrompts: userPrompts.value,
          category: editingAgent.value.data.category || undefined,
          placeholderImage: editingAgent.value.data.placeholderImage,
        });
      } else {
        addAgentWithPlaceholder();
      }
      closeModal();
    }

    function removeAgent(id) {
      removeEntity('agents', id);
    }

    function returnImage(placeholderImage)
    {
      return `/assets/aiagent${placeholderImage}.jpg`
    }

    Vue.onMounted(() => {
      if (!models.value.some(m => m.model === 'gemini-1.5-flash')) {
        models.value.push({
          name: { en: 'Gemini 1.5 Flash', fr: 'Gemini 1.5 Flash' },
          model: 'gemini-1.5-flash',
          provider: 'google',
        });
      }
      if (!models.value.some(m => m.model === 'gemini-2.5-pro-preview-05-06')) {
        models.value.push({
          name: { en: 'Gemini 2.5 Pro Preview', fr: 'Gemini 2.5 Pro Preview' },
          model: 'gemini-2.5-pro-preview-05-06',
          provider: 'google',
        });
      }
    });

    return {
      entities,
      agentName,
      agentDescription,
      agentImageUrl,
      agentModel,
      systemPrompts,
      userPrompts,
      nameError,
      editErrors,
      isModalOpen,
      isPromptModalOpen,
      editingAgent,
      agentId,
      promptType,
      promptIndex,
      promptContent,
      models,
      selectedCategory,
      categories,
      validateName,
      validateEditName,
      openEditModal,
      closeModal,
      addPrompt,
      removePrompt,
      openPromptModal,
      closePromptModal,
      savePrompt,
      updateAgent,
      saveAgent,
      removeAgent,
      addDefaultAgents,
      returnImage,
    };
  },
};