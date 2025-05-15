var router = require('express').Router();
const { transcribe } = require('../controllers/transcription.js');

//Sub Routes

router.post('/', transcribe);

//export the router back to the index.js page
module.exports = router;