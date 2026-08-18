/***
 * Routes MQTT transactions
 ***/
const express = require("express");
const router = express.Router();
const routeHandler = require("../api/routeHandler");
const MQTT = require("mqtt");
const mqtt_config = require("../config/mqtt");
/***
 * SENDS AN EMAIL
 ***/
router.post("/email", routeHandler.authenticate, function(req, res) {
	var TOPIC = "email/" + req.body.template;
	var MESSAGE = JSON.stringify(req.body);
	var mqtt_client = MQTT.connect(mqtt_config);
	mqtt_client.on("connect", function() {
		mqtt_client.publish(
			TOPIC,
			MESSAGE,
			{
				qos: 2
			},
			function(error) {
				if (typeof error === "undefined") error = null;
				mqtt_client.end(true, function() {
					return res.json({ error: error });
				});
			}
		);
	});
});
//NODEJS module
module.exports = router;
