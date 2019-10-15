(function(window){

	// Defaults
	var CONTENT_TYPE = "content-type=audio/x-raw,+layout=(string)interleaved,+rate=(int)16000,+format=(string)S16LE,+channels=(int)1";
	// Send blocks 4 x per second as recommended in the server doc.
	var INTERVAL                = 100000;
	var TAG_END_OF_SENTENCE     = "EOS";
	var RECORDER_WORKER_PATH    = 'static/lib/recorderWorker.js';

	// Error codes (mostly following Android error names and codes)
	var ERR_NETWORK     = 02;
	var ERR_AUDIO       = 03;
	var ERR_SERVER      = 04;
	var ERR_CLIENT      = 05;

	// Event codes
	var MSG_WAITING_MICROPHONE      = 1;
	var MSG_MEDIA_STREAM_CREATED    = 2;
	var MSG_INIT_RECORDER           = 3;
	var MSG_RECORDING               = 4;
	var MSG_SEND                    = 5;
	var MSG_SEND_EMPTY              = 6;
	var MSG_SEND_EOS                = 7;
	var MSG_WEB_SOCKET              = 8;
	var MSG_WEB_SOCKET_OPEN         = 9;
	var MSG_WEB_SOCKET_CLOSE        = 10;
	var MSG_STOP                    = 11;
	var MSG_SERVER_CHANGED          = 12;
	var MSG_AUDIOCONTEXT_RESUMED    = 13;

	// Server status codes
	var SERVER_STATUS_CODE = {
		0: 'Success',
		1: 'System Error',
		2: 'Data Invalid'
	};

	var REC_START   = 0
	var REC_STOP    = 1

	var silence_delay   = 2000;
    var min_decibels    = -80;

	var Dictate = function(cfg) {
		var config = cfg || {};
		config.audioSourceId = config.audioSourceId;
		config.contentType = config.contentType || CONTENT_TYPE;
		config.interval = config.interval || INTERVAL;
		config.recorderWorkerPath = config.recorderWorkerPath || RECORDER_WORKER_PATH;
		config.onReadyForSpeech = config.onReadyForSpeech || function() {};
		config.onEndOfSpeech = config.onEndOfSpeech || function() {};
		config.onPartialResults = config.onPartialResults || function(data) {};
		config.onResults = config.onResults || function(data) {};
		config.onEndOfSession = config.onEndOfSession || function() {};
		config.onEvent = config.onEvent || function(e, data) {};
		config.onError = config.onError || function(e, data) {};
		config.rafCallback = config.rafCallback || function(time) {};
		if (config.onServerStatus) {
			monitorServerStatus();
		}

		// Initialized by init()
		var audioContext;
		var recorder;
		// Initialized by startListening()
		var ws;
		var intervalKey;
		// Initialized during construction
		var wsServerStatus;

        var recordStatus = REC_STOP

		// Returns the configuration
		this.getConfig = function() {
			return config;
		}

		// Set up the recorder (incl. asking permission)
		// Initializes audioContext
		// Can be called multiple times.
		// TODO: call something on success (MSG_INIT_RECORDER is currently called)
		this.init = function() {
			var audioSourceConstraints = {};
			config.onEvent(MSG_WAITING_MICROPHONE, "Waiting for approval to access your microphone ...");
			try {
				window.AudioContext = window.AudioContext || window.webkitAudioContext;
				navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
				window.URL = window.URL || window.webkitURL;
				audioContext = new AudioContext();
			} catch (e) {
				// Firefox 24: TypeError: AudioContext is not a constructor
				// Set media.webaudio.enabled = true (in about:config) to fix this.
				config.onError(ERR_CLIENT, "Error initializing Web Audio browser: " + e);
			}

			if (navigator.getUserMedia) {
				if(config.audioSourceId) {
					audioSourceConstraints.audio = {
						optional: [{ sourceId: config.audioSourceId }]
					};
				} else {
					audioSourceConstraints.audio = true;
				}
				navigator.getUserMedia(audioSourceConstraints, startUserMedia, function(e) {
					config.onError(ERR_CLIENT, "No live audio input in this browser: " + e);
				});
			} else {
				config.onError(ERR_CLIENT, "No user media support");
			}
		}

		// Start recording and transcribing
		this.startListening = function() {
			if (! recorder) {
				config.onError(ERR_AUDIO, "Recorder undefined");
				return;
			}

			if (ws) {
				cancel();
			}

			try {
				ws = createWebSocket();
				audioContext.resume().then(() => {
					config.onEvent(MSG_AUDIOCONTEXT_RESUMED, "Audio context resumed");
				});

				recordStatus = REC_START

				detectSilence()

			} catch (e) {
				config.onError(ERR_CLIENT, "No web socket support in this browser!");
			}
		}

		// Stop listening, i.e. recording and sending of new input.
		this.stopListening = function() {
			// Stop the regular sending of audio
			clearInterval(intervalKey);
			// Stop recording
			if (recorder) {
				recorder.stop();

				recordStatus = REC_STOP

				config.onEvent(MSG_STOP, 'Stopped recording');
				// Push the remaining audio to the server
				recorder.export16kMono(function(blob) {


                    // convert blob to binary data so can send over socket
                    var reader = new FileReader();
                    reader.onloadend = function () {
                        console.log('wav file created...sending to server');

                        socketSend(reader.result)

					    recorder.clear();
                    }

                    // send binary string to server where it will save wav locally and decode
                    reader.readAsBinaryString(blob);

//					socketSend(blob);
					//socketSend(TAG_END_OF_SENTENCE);
//					recorder.clear();

				}, 'audio/x-raw');
				config.onEndOfSpeech();

			} else {
				config.onError(ERR_AUDIO, "Recorder undefined");
			}
		}

		// Cancel everything without waiting on the server
		this.cancel = function() {
			// Stop the regular sending of audio (if present)
			clearInterval(intervalKey);
			if (recorder) {
				recorder.stop();
				recorder.clear();
				config.onEvent(MSG_STOP, 'Stopped recording');
			}
			if (ws) {
				ws.close();
				ws = null;
			}
		}

		// Private methods
		function startUserMedia(stream) {
			var streamNode = audioContext.createMediaStreamSource(stream);

			config.onEvent(MSG_MEDIA_STREAM_CREATED, 'Media stream created');

            //Firefox loses the audio streamNode every five seconds
            // To fix added streamNode to window.source
            window.source = streamNode;
                        
			// make the analyser available in window context
			window.userSpeechAnalyser = audioContext.createAnalyser();
			streamNode.connect(window.userSpeechAnalyser);

			config.rafCallback();

			recorder = new Recorder(streamNode, { workerPath : config.recorderWorkerPath });
			config.onEvent(MSG_INIT_RECORDER, 'Recorder initialized');
		}

        function detectSilence() {
            analyser = window.userSpeechAnalyser;
			analyser.minDecibels = min_decibels;

            data = new Uint8Array(analyser.frequencyBinCount); // will hold our data
            silence_start = performance.now();
            triggered = true

            function loop(time) {
                if (recordStatus == REC_STOP) {
                    return
                }

                requestAnimationFrame(loop); // we'll loop every 60th of a second to check

                analyser.getByteFrequencyData(data); // get current data

                if (data.some(v => v)) { // if there is data above the given db limit
                    if (triggered) {
                        triggered = false;
                        config.onReadyForSpeech();
                    }
                    silence_start = time; // set it to now
                }
                if (!triggered && time - silence_start > silence_delay) {
                    console.log('Debug: detect silence voices')
                    stopListening();

                    triggered = true;
                }
            }

            loop()
        }

		function socketSend(item) {
			if (ws) {
				var state = ws.readyState;
				if (state == 1) {
					// If item is an audio blob
					if (item instanceof Blob) {
						if (item.size > 0) {
							ws.send(item);
							config.onEvent(MSG_SEND, 'Send: blob: ' + item.type + ', ' + item.size);
						} else {
							config.onEvent(MSG_SEND_EMPTY, 'Send: blob: ' + item.type + ', EMPTY');
						}
					// Otherwise it's the EOS tag (string)
					} else {
						ws.send(item);
						config.onEvent(MSG_SEND_EOS, 'Send tag: ' + item);
					}
				} else {
					config.onError(ERR_NETWORK, 'WebSocket: readyState!=1: ' + state + ": failed to send: " + item);
				}
			} else {
				config.onError(ERR_CLIENT, 'No web socket connection: failed to send: ' + item);
			}
		}

		function createWebSocket() {
			var url = config.server + '?' + config.contentType;
			if (config["user_id"]) {
				url += '&user-id=' + config["user_id"]
			}
			if (config["content_id"]) {
				url += '&content-id=' + config["content_id"]
			}
			var ws = new WebSocket(url);

			ws.onmessage = function(e) {
				var data = e.data;
				config.onEvent(MSG_WEB_SOCKET, data);
				if (data instanceof Object && ! (data instanceof Blob)) {
					config.onError(ERR_SERVER, 'WebSocket: onEvent: got Object that is not a Blob');
				} else if (data instanceof Blob) {
					config.onError(ERR_SERVER, 'WebSocket: got Blob');
				} else {
					var res = JSON.parse(data);

					console.log(res)

					if (res.status == 0) {
						if (res.result) {
							if (res.result.final) {
								config.onResults(res.result.hypotheses);
							} else {
								config.onPartialResults(res.result.hypotheses);
							}
						}
					} else {
						config.onError(ERR_SERVER, 'Server error: ' + res.status + ': ' + getDescription(res.status));
					}
				}
			}

			// Start recording only if the socket becomes open
			ws.onopen = function(e) {
				intervalKey = setInterval(function() {
					recorder.export16kMono(function(blob) {

					    console.log(blob)

						socketSend(blob);
						recorder.clear();
					}, 'audio/x-raw');
				}, config.interval);
				// Start recording
				recorder.record();
				config.onReadyForSpeech();
				config.onEvent(MSG_WEB_SOCKET_OPEN, e);
			};

			// This can happen if the blob was too big
			// E.g. "Frame size of 65580 bytes exceeds maximum accepted frame size"
			// Status codes
			// http://tools.ietf.org/html/rfc6455#section-7.4.1
			// 1005:
			// 1006:
			ws.onclose = function(e) {
				var code = e.code;
				var reason = e.reason;
				var wasClean = e.wasClean;
				// The server closes the connection (only?)
				// when its endpointer triggers.
				config.onEndOfSession();
				config.onEvent(MSG_WEB_SOCKET_CLOSE, e.code + "/" + e.reason + "/" + e.wasClean);
			};

			ws.onerror = function(e) {
				var data = e.data;
				config.onError(ERR_NETWORK, data);
			}

			return ws;
		}

		function getDescription(code) {
			if (code in SERVER_STATUS_CODE) {
				return SERVER_STATUS_CODE[code];
			}
			return "Unknown error";
		}
	};

	window.Dictate = Dictate;

})(window);
