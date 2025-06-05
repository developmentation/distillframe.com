
// List of agent categories to load
const agentCategories = ['business', 'web', 'data', 'film'];

export async function getDefaultAgentCategories() {
  const categories = {};

  // Fetch JSON files for each category
  for (const category of agentCategories) {
    try {
      const response = await fetch(`/utils/agents/${category}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const agents = await response.json();
      categories[category] = agents.map(agent => ({
        ...agent,
        userPrompts: agent.userPrompts.map(prompt => ({
          ...prompt,
          id: uuidv4(),
        })),
        systemPrompts: agent.systemPrompts.map(prompt => ({
          ...prompt,
          id: uuidv4(),
        })),
        placeholderImage: Math.floor(Math.random() * 10) + 1,
      }));
    } catch (error) {
      console.error(`Failed to load agent category ${category}:`, error);
      categories[category] = [];
    }
  }
  console.log("categories", categories)

  return categories;
}