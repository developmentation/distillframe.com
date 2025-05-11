// composables/useConfigs.js
const env = Vue.ref({});

//If you don't want to change the backend code, you can add models here too
const models = Vue.ref([
  {
    name: { en: 'Gemini 1.5 Flash', fr: 'Gemini 1.5 Flash' },
    model: 'gemini-1.5-flash',
    provider: 'google',
  },
  {
    name: { en: 'Gemini 2.5 Pro Preview', fr: 'Gemini 2.5 Pro Preview' },
    model: 'gemini-2.5-pro-preview-05-06',
    provider: 'google',
  },
]);


export const useConfigs = () => {
  // Key Messages grouped by category
  const getConfigs = async () => {
    try {
      let results = await axios.get("/api/configs");
      console.log("Configs:", results)
      if(results?.data?.payload)
      {
        env.value = results.data.payload;
      }

      if (env.value.data?.payload?.models)
        models.value = env.value.data.payload.models;

    } catch (error) {
      console.log("Error", error);
      env.value = null;
    }
  };

  return {
    env,
    getConfigs,
    models,
  };
};