const nodemailer = require("nodemailer");
const config = require("../config/nodemailer");
var transport = nodemailer.createTransport(config);
module.exports = transport;
