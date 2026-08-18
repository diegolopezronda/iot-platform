//MQTT
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect(mqtt_config);

//Esendex
const templates = require('./config/sms_templates');
const esendex_config = require('./config/esendex');
const esendex = require('esendex')(esendex_config);
const messages = {
	accountreference:'EX0228784',
	message:[{}]
};
 
mqtt_client.on("connect",function(){
  mqtt_client.subscribe("sms/+");	
});
 
mqtt_client.on("message",function(topic,buffer){
  var data = JSON.parse(buffer.toString());
	var topic_array = topic.split("/");
	var template_index = topic_array[1];
	var template = templates[template_index];
	for(p in data.params){
		var regex = new RegExp("@"+p.toUpperCase(),"g");
		template = template.replace(regex,data.params[p].toString());
	}
	messages.message[0].to = data.to.toString().replace(/[+-]*/g,'');
	messages.message[0].body = template;
	console.log(messages.message[0]);
	esendex.messages.send(messages,function(error,response){
		if(error) return console.error(error);
		console.log(response);
	});
});
