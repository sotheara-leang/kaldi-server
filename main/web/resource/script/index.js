window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

window.URL = window.URL || window.webkitURL;
navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

function createWebSocket(url) {
    ws = new WebSocket(url);

    ws.onmessage = function(event) {
        response = $.parseJSON(event.data)

        console.log('Server: ', response)

        if (response.status == 0) {
            $('#txtTrans').val(response.data);
        } else {
            alert('Server Internal Error')
        }
    };

    ws.onopen = function(event) {

    };

    ws.onclose = function(event) {

    };

    ws.onerror = function(error) {
        console.log('WebSocket Error: ' + error);
        alert('Error Connecting to Server')
    };

    return ws;
}


function init() {
    if (navigator.getUserMedia) {
        navigator.getUserMedia({audio: true}, function(s) {
            console.log('Access microphone success');

            var mediaStreamSource = context.createMediaStreamSource(s);
            recorder = new Recorder(mediaStreamSource);

            var url = "ws://localhost:8080/ws/decode";
            createWebSocket(url);

            $('#btnRecord').attr("disabled", false);
            $('#btnStop').attr("disabled", false);

            $('#btnStop').hide();

        }, function(e) {
            console.log('Access microphone rejected', e);
            alert('Access microphone rejected', e);
        });

    } else {
        console.log('navigator.getUserMedia() not present');
        alert('Browser user media not present');
    }
}

function startRecording() {
    recorder.record();

    $('#txtTrans').val('');
    $('#btnRecord').hide();
    $('#btnStop').show();
}

function stopRecording() {
    recorder.stop();

    $('#btnRecord').show();
    $('#btnStop').hide();

    recorder.getBuffer(function(s) {
        // return value holds interleaved stereo audio data at mic's sample rate (44.1 or 48 kHz)
        // "interleaved": indices alternate between left and right channels
        var buffer = s;
        var sampleRateFromMic = context.sampleRate;

        // resample input stereo to 16khz stereo
        // Resample args: inputRate, outputRate, numChannels, length of buffer, noReturn boolean
        // since we want the returned value, noReturn is set to false
        var resamplerObj = new Resampler(sampleRateFromMic, 16000, 2, buffer.length, false);
        var resampledBuffer = resamplerObj.resampler(buffer);

        // convert stereo to mono and export
        recorder.export16kMonoWav(function(s) {
            // send to server
            ws.send(s);
            recorder.clear();

        }, resampledBuffer);
    });
}

$(document).ready(function() {
   init();
});