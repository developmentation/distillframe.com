//Configs to the frontend side. Anything that Vue needs to know from the environment comes from here

exports.getConfigs = async function (req, res, next) {
  try {
    //Key Vue environmental variables
    const payload = {
      WEBSOCKET_URL: process.env.WEBSOCKET_URL,
      API_URL: process.env.API_URL,
    };
    // Send the counts as JSON response
    res.status(200).json({
      message: "Here are the configuration variables from the server side",
      payload: payload,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error returning models",
      payload: null,
    });
  }
};
