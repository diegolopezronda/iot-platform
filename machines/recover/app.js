const data = require('./config/data');
const keys = require('./config/keys');
//MQTT
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);

var l = data.length;
var q = 25;
var min = (l*q)/1000/60;
console.log("~"+Math.round(min)+" min");
var i = 0;
var interval = setInterval(function(){
	d = data[i++];
	//d.time = Date.parse(d._date);
	d.key = keys[d.mac.toString()].key_item;
	mqtt_client.publish('recovery',JSON.stringify(d),{qos:2});
	if(i === l){
		clearInterval(interval);
	}
},q);
