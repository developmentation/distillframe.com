var router = require('express').Router();
const geminiController = require('../controllers/geminiController');

//Sub Routes

router.post('/text', geminiController.geminiTextController);
router.post('/images', geminiController.geminiImageController);
router.post('/batch-images', geminiController.geminiBatchImageController);

//export the router back to the index.js page
module.exports = router;