//Provides high level version information back to the user, or any other server stats desired

const packageInfo = require("../../package.json");

exports.getStats = async function (req, res, next) {
  try {
    //Get the node version for troubleshooting
    const version = packageInfo.version;

    // Send the counts as JSON response
    res.status(200).json({
      message: "Here are relevants stats",
      payload: {
        version: version, // Include the version in the response
      },
    });
  } catch (error) {
    console.log(error);
    res.status(200).json({
      message: "Error on retrieving stats",
      payload: null,
    });
  }
};
