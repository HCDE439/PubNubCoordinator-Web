'use strict';

var publishKey = 'pub-c-2725239f-4145-4fef-81e3-ayylmao';
var subscribeKey = 'sub-c-f6e9a4fc-1d08-11e8-84be-ayymao';

var Coordinator = Coordinator();
var valueFor = function(id) { return document.getElementById(id).value };

function Coordinator() {
    var obj = new Object();
    obj.send = function(text, callback) { obj.pubnub.publish({message: { "text": text }, channel: 'Default'}, callback); };
    obj.speak = function(text) {
        var voice = 'en-US_LisaVoice';
        var token = obj.watsonToken;
        var format = 'audio/mpeg';
        var wsURI = 'wss://stream.watsonplatform.net/text-to-speech/api/v1/synthesize'
          + '?voice=' + voice
          + '&watson-token=' + token;
        var websocket = new WebSocket(wsURI);
        var audioParts = [];
        var words = [];
        websocket.onopen = function(evt) {
            websocket.send(JSON.stringify({ text: text, accept: format, timings: ['words'] }));
        };
        websocket.onerror = function(evt) { console.log(evt) };
        websocket.onclose = function(evt) {
            var audioBlob = new Blob(audioParts, {type: format});
            var audioURL = URL.createObjectURL(audioBlob);
            var sound = new Howl({
                src: [audioURL],
                format: ['mp3'],
                autoplay: true
            });
            sound.once('load', function(){
                typeof obj.statusHandler == 'function' && obj.statusHandler("playing", words);
                sound.play();
            });
            sound.on('end', function(){ typeof obj.statusHandler == 'function' && obj.statusHandler("connected"); });
        };
        websocket.onmessage = function(evt) {
            if (typeof evt.data === 'string') {
                var word = JSON.parse(evt.data).words;
                if (word) { words = words.concat(word); }
            }
            else { audioParts.push(evt.data); }
        };
    }
    var statusHandler;
    var responseHandler;
    var _initializeWatson = function(callback) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == XMLHttpRequest.DONE && request.status == 200) {
                typeof callback == 'function' && callback(request.responseText);
            }
        };
        request.open('GET', 'https://team-jane.herokuapp.com/token');
        request.send();
    };

    obj.pubnub = new PubNub({
        subscribeKey: subscribeKey,
        publishKey: publishKey
    });
    obj.pubnub.addListener({
        status: function(statusEvent) {
            if (statusEvent.category === "PNUnknownCategory") {
                var newState = { new: 'error' };
                obj.pubnub.setState(
                    { state: newState },
                    function (status) { console.log(statusEvent.errorData.message) }
                );
                typeof obj.statusHandler == 'function' && obj.statusHandler("error");
            } else {
                typeof obj.statusHandler == 'function' && obj.statusHandler("connected");
            }
        },
        message: function(response) {
            typeof obj.statusHandler == 'function' && obj.statusHandler("received");
            typeof obj.responseHandler == 'function' && obj.responseHandler(response.message.text);
        }
    });
    obj.pubnub.subscribe({channels: ['Default']});
    _initializeWatson(function(watsonToken) { obj.watsonToken = watsonToken; });
    return obj;
}
