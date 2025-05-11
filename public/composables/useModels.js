// composables/useModels.js
// const models = Vue.ref([]); // Initialize as empty array

const models = Vue.ref([
  {
    name: { en: 'Gemini 2.5 Pro Preview', fr: 'Gemini 2.5 Pro Preview' },
    model: 'gemini-2.5-pro-preview-05-06',
    provider: 'google',
  },
]);

export const useModels = () => {
  // Server Model Functions
  const fetchServerModels = async () => {
    try {
      const response = await axios.get("/api/models");
      if (response.data?.payload && Array.isArray(response.data.payload)) {
        models.value = response.data.payload;
      } else {
        console.warn("Invalid server models response format", response.data);
        models.value = [];
      }
      console.log("Loaded the following models", models.value);
    } catch (error) {
      console.error("Error fetching models:", error);
      models.value = []; // Ensure it's always an array
    }
  };

  return {
    fetchServerModels,
    models,
  };
};
