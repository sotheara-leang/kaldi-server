var dictate = new Dictate({
    server : "ws://localhost:8080/ws/decode",
    onReadyForSpeech : function() {
        __message("READY FOR SPEECH");
        __status("Listening and transcribing...");

    },
    onEndOfSpeech : function() {
        __message("END OF SPEECH");
        __status("Transcribing...");

        $('#btnStop').hide()
	    $('#btnRecord').show()
    },

    onEndOfSession : function() {
        __message("END OF SESSION");
        __status("");
    },
    onPartialResults : function(hypos) {
        console.log(hypos)
    },
    onResults : function(hypos) {
        console.log(hypos)
    },
    onError : function(code, data) {
        __error(code, data);
        __status("Viga: " + code);

        dictate.cancel();
    },
    onEvent : function(code, data) {
        __message(code, data);
    }
});

function init() {
	dictate.init();

    $('#btnStop').hide()

	$('#btnRecord').click(function(e) {
        $(this).hide()
        $('#btnStop').show()

        startListening()
	});

	$('#btnStop').click(function(e) {
	    $(this).hide()
        $('#btnRecord').show()

        stopListening()
	});
}

function startListening() {
	dictate.startListening();
}

function stopListening() {
	dictate.stopListening();
}

function cancel() {
	dictate.cancel();
}

function __message(msg) {
	console.log('Debug: ', msg)
}

function __error(msg) {
	console.log('Error: ', msg)
}

function __status(msg) {
	console.log('Status: ', msg)
}

window.onload = function() {
	init();
};