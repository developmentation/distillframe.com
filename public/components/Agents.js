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
            { id: uuidv4(), type: 'text', content: 
              
            `
              Analyze the web interface in the provided image and provide a detailed description of its core layout and components. Include the following:
              Overall Layout: Describe the structural organization (e.g., single-column, multi-column, grid-based, responsive design) and any notable patterns (e.g., fixed header, sticky sidebar).
              Key Components: Identify and describe all major UI elements, such as:
              Navigation elements (e.g., top nav bar, hamburger menu, breadcrumbs).
              Content sections (e.g., hero section, feature cards, footer).
              Interactive components (e.g., dropdown menus, forms, buttons, modals).
              Visual elements (e.g., images, icons, carousels).
              Component Details: For each component, specify its location (e.g., top-left, center), purpose (e.g., user input, navigation), and any observed interactivity (e.g., hover effects, click actions).
              Responsive Considerations: Note any indicators of responsive design (e.g., mobile-friendly elements, viewport-specific layouts).
              Contextual Observations: Highlight any unique or prominent features that stand out in the layout (e.g., asymmetry, overlapping elements). Ensure the description is precise, avoids assumptions not supported by the image, and is structured to facilitate integration into a web specification document.            
                          
            `
            
            },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return markdown formatted document specifically based on the elements of the layout.' },
          ],
          description: 'Describes web interface layouts and components',
          model: 'gemini-1.5-flash',
          category: 'Web Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },
        {
          name: 'StyleDescriptor',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 
              
`
            Enhanced Prompt: Conduct a thorough analysis of the styling and visual design of the web interface in the provided image. Provide a detailed breakdown of the following:
            Theme and Mode: Identify the overall theme (e.g., light mode, dark mode, hybrid) and any evidence of theme-switching functionality.
            Color Scheme: Describe the primary, secondary, and accent colors used, including approximate hex codes or color families (e.g., blue, neutral, vibrant). Note the use of gradients, contrasts, or background colors.
            Typography: Analyze the fonts used, including:
            Font families (e.g., sans-serif, serif) and their application (e.g., headings, body text).
            Font sizes, weights, and styles (e.g., bold, italic).
            Line spacing, letter spacing, and text alignment.
            CSS Framework or Styling Approach: Infer the use of any CSS frameworks (e.g., Tailwind, Bootstrap) or custom styling based on class naming conventions, utility patterns, or design consistency.
            Visual Styling: Describe additional styling elements, such as:
            Border styles, shadows, or rounded corners.
            Animations or transitions (e.g., button hover effects, fade-ins).
            Spacing and padding (e.g., consistent margins, grid gaps).
            Accessibility Considerations: Note any styling choices that impact accessibility (e.g., color contrast ratios, font readability). Ensure the analysis is specific, evidence-based, and structured for inclusion in a web specification document, avoiding speculative assumptions not visible in the image.
`            
            },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return markdown formatted document specifically based on the elements of the layout.' },
          ],
          description: 'Describes web interface styling and look-and-feel',
          model: 'gemini-1.5-flash',
          category: 'Web Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },
        {
          name: 'PurposeAnalysis',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 

              `

              Enhanced Prompt: Evaluate the web interface in the provided image to infer the likely purpose and functionality of its components and overall design. Provide a detailed analysis that includes:
              Overall Purpose: Determine the primary goal of the web interface (e.g., e-commerce, informational, user dashboard, social platform) based on the layout, components, and content.
              Component-Specific Purposes:
              For each major UI component (e.g., forms, buttons, navigation menus, content sections), infer its intended function (e.g., user authentication, product filtering, content browsing).
              Describe how the component supports user interactions or workflows (e.g., submitting data, navigating to another page, displaying dynamic content).
              User Flow: Hypothesize the intended user journey or workflow based on the arrangement and interactivity of components (e.g., landing page to product page to checkout).
              Target Audience: Identify the likely target audience (e.g., consumers, administrators, developers) and how the interface caters to their needs.
              Functional Inferences: Note any implied functionalities, such as:
              Data input/output (e.g., form submissions, search queries).
              Dynamic content (e.g., API-driven results, real-time updates).
              Integration with external systems (e.g., payment gateways, social logins).
              Contextual Evidence: Ground all inferences in specific observations from the image (e.g., presence of a cart icon suggests e-commerce).
              Gaps and Assumptions: Highlight any areas where the purpose is unclear and provide reasonable assumptions, clearly labeled as such. Ensure the analysis is logical, evidence-based, and structured to support the creation of a web specification document, avoiding speculative functionalities not supported by the image.                            
              `
              
             },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return markdown formatted document specifically based on the elements of the layout.' },
          ],
          description: 'Analyzes the purpose and functionality of web components',
          model: 'gemini-1.5-flash',
          category: 'Web Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },

        {
          name: 'BusinessAnalyst',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 
              
`
You are a senior web content analyst tasked with reviewing a set of analyses generated by other language models based on web content, including screenshots of web pages, descriptions of related videos, and the stated objectives of the web project. The analyses include structured data, UI elements, layouts, components, key features, and other extracted information. Your objective is to evaluate the provided materials, assess the web content’s design and functionality, and produce a comprehensive Web Specification Document and a summarized report.

### Instructions:
1. **Understand the Web Project Objective**:
   - Review the stated objective of the web project to understand its purpose, target audience, and intended outcomes (e.g., e-commerce, informational, SaaS platform).
   - Identify any ambiguities or gaps in the objective that require clarification or assumptions.

2. **Evaluate Video Descriptions**:
   - Analyze the provided descriptions of videos related to the web content or user flows.
   - Assess whether the descriptions align with the project objective and provide sufficient context for the web layouts, components, or functionality depicted in the screenshots.
   - Note any discrepancies, missing details, or assumptions needed to address gaps in the video descriptions.

3. **Evaluate Web Content Analyses**:
   - Review the analyses of the web content, which include:
     - Structured data extracted from the UI (e.g., text fields, buttons, links).
     - Identified UI elements (e.g., navigation bars, hero sections, forms, modals).
     - Web layouts (e.g., grid systems, responsive design breakpoints).
     - Key components (e.g., carousels, search bars, footers).
     - Features or functionalities inferred from the web content (e.g., user authentication, dynamic content loading).
     - Other observations, such as accessibility or performance considerations.
   - Assess the accuracy, completeness, and relevance of the analyses in relation to the project objective.
   - Identify inconsistencies, gaps, or areas where further clarification is needed.
   - Validate whether the extracted data, layouts, components, and features align with the web project’s purpose and the user flows described in the video descriptions.

4. **Prepare a Web Specification Document**:
   - Create a comprehensive Web Specification Document that includes the following sections:
     - **Introduction**: Summarize the web project’s objective, scope, and purpose of the specification document.
     - **Web Objectives**: Outline the key goals of the website (e.g., drive conversions, provide information, enhance user engagement).
     - **Layout Specifications**:
       - Describe the overall layout structure (e.g., single-page, multi-page, responsive grid).
       - Detail specific layout patterns identified in the analyses (e.g., hero section, sidebar, card-based design).
       - Specify responsive design considerations (e.g., mobile, tablet, desktop breakpoints).
     - **Component Specifications**:
       - List and describe key UI components (e.g., navigation menus, buttons, forms, modals).
       - Include details on component behavior (e.g., hover states, animations, interactivity).
       - Note any reusable components or design system patterns.
     - **Feature Specifications**:
       - Detail the core functionalities and features (e.g., search functionality, user login, content filtering).
       - Link features to specific UI elements or components identified in the analyses.
     - **Content Specifications**:
       - Outline the types of content displayed (e.g., text, images, videos, dynamic data).
       - Specify content hierarchy, typography, and visual styling based on the analyses.
     - **Data Requirements**:
       - List data inputs, outputs, and storage needs (e.g., form submissions, API calls, database integration).
       - Include structured data points extracted from the web content (e.g., form fields, metadata).
     - **Non-Functional Requirements**:
       - Specify requirements for performance (e.g., page load times), accessibility (e.g., WCAG compliance), SEO, and security (e.g., HTTPS, data validation).
     - **Assumptions**:
       - Document any assumptions made due to gaps in the provided materials (e.g., missing details on backend integration, unclear component behavior).
     - **Constraints**:
       - Note any limitations or risks inferred from the analyses (e.g., browser compatibility, scalability concerns).
     - **Stakeholder Considerations**:
       - Identify potential stakeholders (e.g., end-users, content editors, developers) and their needs based on the web project’s purpose.
   - Ensure the specification is clear, structured, and actionable, with traceability to the provided materials.

5. **Provide a Summarized Report**:
   - Create a concise report (1-2 pages) summarizing your findings and recommendations, including:
     - A high-level overview of the web project objective and alignment with the provided materials.
     - Key strengths and weaknesses of the web content analyses and video descriptions.
     - Critical findings from the Web Specification Document, such as key layouts, components, features, or gaps.
     - Recommendations for next steps, such as areas needing further clarification, additional stakeholder input, or validation of assumptions.
     - Highlight any risks or challenges that could impact the web project’s success (e.g., accessibility issues, performance bottlenecks).

6. **Guidelines**:
   - Maintain a professional tone and structure in both the Web Specification Document and summarized report.
   - Use clear, concise language to ensure accessibility to both technical and non-technical stakeholders.
   - Organize the specification with headings, subheadings, and numbered lists for readability.
   - Explicitly link findings to the provided materials (e.g., “Based on the analysis of the homepage screenshot…”).
   - If critical information is missing, make reasonable assumptions and clearly label them as such in the specification and report.
   - Avoid speculative features or requirements not supported by the provided materials.
   - Consider modern web standards (e.g., HTML5, CSS3, responsive design) when specifying layouts and components.

### Deliverables:
- A complete Web Specification Document capturing the layouts, components, features, content, data requirements, assumptions, and other relevant details.
- A summarized report highlighting key findings, recommendations, and next steps.

Proceed with the review and produce the requested deliverables based on the provided materials.
`

             },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return a markdown formated document with clear headings, sections and subsections.' },
          ],
          description: 'Analyzes the purpose and functionality of web components',
          model: 'gemini-1.5-flash',
          category: 'Web Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },



      ],
      data:[



        {
          name: 'DataStructureExtractor',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 
              
`
Analyze the provided image of structured data (Excel, JSON, or CSV) to extract and describe its schema and structure in detail. Include the following:
Data Format Identification: Specify the format of the data (e.g., Excel spreadsheet, JSON object/array, CSV file).
Schema Overview:
For Excel: List all column headers, their positions (e.g., column A, B), and any hierarchical structure (e.g., multiple sheets, merged cells).
For JSON: Identify the keys, nested objects, arrays, and their hierarchical relationships.
For CSV: List all column headers and their order.
Field Details:
Enumerate each field/column/key, including its name and location (e.g., column index, JSON path).
Note any apparent primary or foreign keys based on naming conventions (e.g., "ID", "CustomerID") or unique values.
Sample Data: Provide examples of data values for each field (e.g., first few rows or entries) to illustrate the content.
Structural Observations:
Highlight any structural complexities (e.g., nested JSON arrays, multi-sheet Excel files, quoted CSV fields).
Note any inconsistencies (e.g., missing headers, irregular row lengths).
Normalization Considerations: Suggest how the data could be normalized into relational tables (e.g., splitting nested JSON into separate tables). Ensure the description is precise, grounded in the image content, and structured for inclusion in a SQL Server data specification, avoiding assumptions not supported by the image.
`

             },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return JSON with a schema field containing the extracted data structure, including fields, format, sample data, and normalization suggestions.' },
          ],
          description: 'Analyzes the data structures',
          model: 'gemini-1.5-flash',
          category: 'Data Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },


        

        {
          name: 'DataTypeAnalyzer',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 
              
`
Analyze the provided image of structured data (Excel, JSON, or CSV) to determine the data types, constraints, and validation rules for each field or column. Provide a detailed breakdown of the following:
Data Types:
Infer the appropriate SQL Server data type for each field (e.g., INT, VARCHAR, DATE, DECIMAL) based on sample data values.
Specify the precision or length where applicable (e.g., VARCHAR(50), DECIMAL(10,2)).
Constraints:
Identify potential primary keys, foreign keys, or unique constraints based on naming conventions or data patterns (e.g., "OrderID" with unique integers).
Note any fields that appear nullable or non-nullable based on the presence or absence of data.
Suggest default values or check constraints where appropriate (e.g., "Status" with values like "Active"/"Inactive").
Validation Rules:
Infer validation requirements (e.g., email format for fields like "Email", date ranges for "OrderDate").
Highlight any patterns (e.g., fixed-length codes, enumerated values like "M/F" for gender).
Data Quality Observations:
Note any data quality issues (e.g., inconsistent date formats, missing values, non-standardized text).
Suggest data cleansing or transformation steps (e.g., trimming whitespace, standardizing case).
SQL Server Compatibility:
Ensure recommended data types and constraints are compatible with SQL Server (e.g., avoiding unsupported types, considering collation for text fields). Ensure the analysis is evidence-based, avoids speculative assumptions, and is structured for inclusion in a SQL Server data specification
`

             },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return JSON with a schema field containing the extracted data structure, including fields, format, sample data, and normalization suggestions.' },
          ],
          description: 'Analyzes the data type specifications',
          model: 'gemini-1.5-flash',
          category: 'Data Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },


        {
          name: 'DatabaseAdministrator',
          userPrompts: [
            { id: uuidv4(), type: 'text', content: 
              
`
You are a senior Database Administrator responsible for designing a SQL Server database based on the analyses of structured data (Excel, JSON, or CSV) provided by the following Agents:





DataStructureExtractor: Provides the schema, including fields, columns, or keys, their structure (e.g., column headers, JSON paths), sample data, and normalization suggestions.



DataTypeAnalyzer: Specifies data types, constraints (e.g., primary keys, foreign keys, nullable fields), validation rules, and data quality observations.



DataPurposeEvaluator: Describes the business purpose, field-specific roles, database role (e.g., transactional, reference), usage scenarios, and relationships.

Your task is to consolidate these outputs into a complete plan for creating a SQL Server database. Provide a detailed implementation plan and generate all necessary SQL CREATE statements. Include the following:





Database Design Overview:





Summarize the data source (Excel, JSON, CSV), its business purpose, and the intended database role (e.g., transactional, analytical).



Outline the normalized table structure based on the schema and normalization suggestions from DataStructureExtractor.



Identify the target SQL Server version (assume SQL Server 2022 unless otherwise specified) and any compatibility considerations.



Table Structures:





Define each table, including:





Table name (derived from the business purpose or schema, e.g., Customers, Orders).



Columns, their SQL Server data types, and lengths/precision (e.g., VARCHAR(50), DECIMAL(10,2)), based on DataTypeAnalyzer.



Constraints, including primary keys, foreign keys, unique constraints, and check constraints, based on DataTypeAnalyzer.



Nullable or non-nullable fields, default values, and validation rules.



Map complex structures (e.g., nested JSON arrays, multi-sheet Excel files) to normalized tables, ensuring relational integrity.



Include any additional tables suggested by DataPurposeEvaluator for supporting business workflows (e.g., audit logs, reference tables).



SQL CREATE Statements:





Generate complete CREATE TABLE statements for all tables, including:





Column definitions with data types and constraints.



Primary key and foreign key constraints (with REFERENCES clauses).



Unique constraints, check constraints, and default values where applicable.



Generate CREATE INDEX statements for performance optimization (e.g., indexes on frequently queried columns like CustomerID).



Include CREATE DATABASE statement if a new database is required, with appropriate settings (e.g., collation, filegroup).



Ensure syntax is compatible with SQL Server 2022 and follows best practices (e.g., explicit constraint names, proper collation).



Relationships and Constraints:





Define all relationships between tables based on primary and foreign keys identified by DataTypeAnalyzer and DataPurposeEvaluator.



Specify referential integrity actions (e.g., ON DELETE CASCADE, ON UPDATE NO ACTION) where appropriate.



Highlight any inferred relationships not explicitly defined in the analyses (e.g., linking OrderID across tables) and label them as assumptions.



Implementation Plan:





Provide a step-by-step plan for implementing the database, including:





Database Creation: Steps to create the database and configure settings (e.g., collation, recovery model).



Table Creation: Order of table creation to respect foreign key dependencies.



Data Loading: Recommended tools and methods for loading data (e.g., SSIS for CSV, OPENJSON for JSON, SQL Server Import Wizard for Excel), incorporating data cleansing steps from DataTypeAnalyzer.



Performance Optimization: Suggestions for indexes, partitioning, or statistics based on usage scenarios from DataPurposeEvaluator.



Security Considerations: Basic security recommendations (e.g., schema permissions, encrypted columns for sensitive data like emails).



Testing and Validation: Steps to verify data integrity and constraint enforcement post-loading.



Address data quality issues noted by DataTypeAnalyzer (e.g., handling missing values, standardizing formats).



Suggest maintenance tasks (e.g., regular index rebuilding, backup schedules).



Assumptions and Risks:





Document any assumptions made due to gaps in the provided analyses (e.g., unclear foreign key relationships, missing data volume estimates).



Highlight potential risks (e.g., performance bottlenecks for large datasets, data quality issues affecting constraints) and mitigation strategies.



Summarized Report:





Provide a concise report (1-2 pages) summarizing:





The database design, including table count and key relationships.



Key findings from the analyses and how they informed the design.



Critical implementation steps and data loading recommendations.



Risks, assumptions, and next steps (e.g., stakeholder validation, performance testing).

Guidelines:





Ensure all SQL statements are syntactically correct, executable in SQL Server 2022, and follow naming conventions (e.g., PK_TableName, FK_TableName_Column).



Use clear, consistent terminology suitable for database administrators and developers.



Structure the output for clarity, with separate sections for the design overview, SQL statements, implementation plan, and report.



Ground all decisions in the provided analyses, linking to specific outputs (e.g., “Based on DataTypeAnalyzer’s VARCHAR(100) recommendation for CustomerName…”).



Label assumptions clearly and avoid speculative designs not supported by the analyses.



Optimize for performance and scalability, considering the business purpose and usage scenarios.



Ensure the implementation plan is actionable, with tools and methods compatible with SQL Server.

Deliverables:





A complete Database Creation Plan including:





Database design overview.



Detailed table structures and relationships.



SQL CREATE statements for the database, tables, and indexes.



A step-by-step implementation plan for creation, data loading, and maintenance.



Assumptions and risks.



A Summarized Report highlighting the design, key decisions, and next steps.

`

             },
          ],
          systemPrompts: [
            { id: uuidv4(), type: 'text', content: 'Return a complete markdown format specification' },
          ],
          description: 'Analyzes the data type specifications',
          model: 'gemini-1.5-flash',
          category: 'Data Analysis',
          placeholderImage: Math.floor(Math.random() * 10) + 1,
        },



      ]
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