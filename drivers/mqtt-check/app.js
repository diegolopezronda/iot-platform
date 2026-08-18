//MQTT
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect('mqtts://rs.loranexus.io',mqtt_config);
const mqtt_sensum = mqtt.connect('mqtt://localhost');

mqtt_client.on("connect", function() {
	console.log("Connected");
	mqtt_client.subscribe("df.sensum-queue.uldata");
});
mqtt_sensum.on("connect", function() {
	console.log("SENSUM Connected");
	mqtt_sensum.subscribe("df.sensum-queue.uldata");
});

const FRAME = {
	DevAddr:'macAddr',
	payload_hex:'data',
	LrrRSSI:'extra.rssi',
	LrrSNR:'extra.snr',
	devEUI:'extra.devEUI',
	SpFact:'extra.sf',
	Time:'recv'
}

function parse(topic,buffer){
		mqtt_sensum.publish("df.sensum-queue.uldata-test",buffer.toString());
	try {
		var data = JSON.parse(buffer.toString());
		var query = {};
		for(f in FRAME){
			var fields = FRAME[f].split('.');
			var value = data[fields[0]];
			fields.shift();
			fields.forEach(function(x,y){
				value = value[x];
			});
			query[f] = value;
		}
		console.log(data);
		console.log("---");
		console.log(query);
		mqtt_sensum.publish("lora",JSON.stringify(query));
	} catch (error) {
		console.error(buffer.toString());
	}
}

mqtt_sensum.on("message", function(topic, buffer) {
	parse(topic,buffer);
});

mqtt_client.on("message", function(topic, buffer) {
	parse(topic,buffer);
});

mqtt_client.on("error", function(error) {
		console.error(error);
});
