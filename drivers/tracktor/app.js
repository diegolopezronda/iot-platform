const net = require("net");
const frameBuilder = require("./api/TracktorFrameBuilder.js");
const frameParser = require("./api/TracktorFrameParser.js");
//MQTT
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect(mqtt_config);

const PORT = 3001;
const TAG = ",";
const server = net.createServer();

server.on("connection", function(socket) {
	socket.on("data", function(buffer) {
		var input = buffer.toString().replace(/\)\(/g, ")\r\n(");
		console.log(input);
		console.log("--DATA-START--");
		console.log("[data]");
		frameBuilder.getFrames(input).forEach(function(frame) {
			console.log("[frame]");
			console.log(frame);
			var data = frameParser.parse(frame);
			if (data == null) return;
			var mac = Number(data.mac);
			console.log(data);
			mqtt_client.publish("data/" + mac, JSON.stringify(data));
		});
		console.log("--DATA-END--");
	});
});

server.listen(PORT, function() {
	console.log("LISTENING ON PORT: " + PORT);
});
