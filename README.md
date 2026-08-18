# SENSUM PLATFORM #
## 1 Introduction ##
### 1.1 Intended readership ###
The character of this document is FOR INTERNAL USE ONLY OF SENSUM EMPLOYEES. 
Sharing this document or the source code mentioned on it, complete or partially, 
with third-parties would result in a security issue. Sensum team is working now in 
making this document available to public in future.

This document should be read by analyst programmers, 
or people acquainted with DBMS installation and Node JS enviroments.
### 1.2 Applicability statement ###
This manual applies to version 1 or later of Sensum Platform.
### 1.3 Purpose ###
This manual contents the directions to install Sensum Platform in a server.
### 1.4 How to use this document ###
The instructions in this manual are sequential; users must follow the instructions in order.
### 1.5 Related documents ###
(not applicable)
### 1.6 Conventions ###
(not applicable)
### 1.7 Problem reporting instructions ###
Please, write an e-mail to diego@sensum.co.nz, if a problem installing Sensum Platform appears. 
## 2 Sensum Platform Overview ##
(TBD)
## 3 Installation instructions ##
### 3.1 Cloning the device ###
Please clone the repository via HTTPS using git.
#### 3.1.1 Cautions and warnings ####
* To clone you will need to have access to repository.
#### 3.1.2 Procedure ####
* Ensure you have git installed in your server.
* Clone the repository the repository via HTTPS using git.
#### 3.1.3 Probable errors and possible causes ####
##### 3.1.3.1 Out of memory, malloc failed #####
If you receive this output from git:

`fatal: Out of memory, malloc failed (tried to allocate 439137858 bytes)`

Try to execute the following command:

`git config --global pack.windowMemory 256m`

and then, clonning again the repository.

### 3.2 Installing system dependencies ###
To run Sensum Platform on your server you will need to install the following third-party software:

* MongoDB >= 3.2
* MySQL >= 5.6
* Mosquitto >= 3.1
* Node JS >= 6.0
* NPM >= 3.10

After install NPM, use it to install ***globally*** the following dependencies:

* pm2 >= 2.9.3
* uglify-js >= 3.3.11
* prettier >=1.7.4

#### 3.2.1 Cautions and warnings ####
* When installing MySQL, remember type a strong password and save it in a safe place. 
* Instead working with root, we recommend create an MySQL user able to read and write Sensum Platform database.

#### 3.2.2 Procedure ####
In Ubuntu 16.04 you can execute `sudo ./system-config.sh` to install system dependencies.

### 3.2.3 Probable errors and possible causes ###
(Not applicable)

### 3.3 Installing API Model ###
API defines data format and restrictions for the incoming device data.

#### 3.3.1 Cautions and warnings ####
(not applicable)

#### 3.3.2 Procedure ####
1. Enter to `web` folder.
2. Execute `sudo npm ./config/scripts/install-database.sh`. 
3. When asked, type the root password of MySQL.
4. You can test the configuration running `npm run mysql`, using the password `sensum.s`
5. Type `show tables;show triggers;` and press enter, you should see 36 tables and views and 7 triggers.

#### 3.3.3 Probable errors and possible causes ####
##### 3.3.3.1 ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES) #####
You need to type the root password properly.

### 3.4 Setup user ###
We encourage to setup the user and password for the administrator user as soon you can.

#### 3.4.1 Cautions and warnings ####
(not applicable)

#### 3.4.2 Procedure ####
1. On `web` folder run `npm run update-admin <email> <password>` replacing `<email>` for a real e-mail you have access and `<password>` for a password and press enter.

#### 3.4.3 Probable errors and possible causes ####
##### 3.4.3.1 ERROR 1045 (28000): Access denied for user 'sensum'@'localhost' (using password: YES) #####
You need to type the sensum password properly.

### 3.5 Running dashboard ###
Dashboard is the utility to deploy the data received in a human-readable way.

#### 3.5.1 Cautions and warnings ####
The default TCP port for dashboard is 1989. Your server must have this port open to see dashboard.

#### 3.5.2 Procedure ####
1. On `web` folder, run `npm run update-domain <domain>`, replacing `<domain>` for the domain name of your server.
2. Run `npm run start`.
3. Open your browser using the domain of first step.
4. Login as `sensum`, the password is the one you setup in 3.4.

#### 3.5.3 Probable errors and possible causes ####
(TBD)

### 3.6 Running other modules ###
Sensum Platform breakdowns tasks in Node JS services. 
You can deploy them using `npm run start` on the main directory of each module, 
with exception of monitor.

These are the main folders, and the order you should start modules. If a module is not mentioned, don't run it. 

* **messengers:** Utilities for sending messages. They can be called from all the other services.
	* **device-chat:** Allows to recover, send and receive messages from dashboard chat.
	* **email:** Send e-mails to users. Commonly triggered from web and listener. 
	  You will need to setup `config/nodemailer.json` with a valid e-mail and password.
	* **sms:** Send SMS to users. Commonly triggered from web and listener.
* **machines:** Services are called from web or listener when user requires. 
	* **user-remover:** This modules deletes users who didn't confirm their e-mail address after one day of waiting.
	* **psycho:**  This module registers the routes visited by users and the device they are using. Called from web.
	* **daily:** For each device, it creates a daily summary from data received from listener.
	* **scheduler:** Send commands to devices - able to receive commands -, 
	  on time intervals programmed by user on dashboard.  
	* **alerts:** Call e-mail and/or sms services when a device requires service. 
	  The user decides which alert channel use on dashboard.   
	* **reporter:** Generates and sends reports to an e-mail address or ftp server. 
	  The report format, data source and destiny of information is configured on dashboard by user.
	* **monitor:** Monitors all the running services both on PM2 and System related to sensum platform. 
	  It also monitor the disk space and generates a system report in a defined time interval. 
	  It requires an special way to run it that will be explained later. 
* **drivers:** These services works as brokers between carriers and listener.
	* **receiver:** Receives data from sensum, lora, and sigfox servers.
* **listener:** Receives, validates, and store data from devices. Triggers alerts and daily reports. 

#### 3.6.1 Cautions and warnings ####
(Not applicable).

#### 3.6.2 Procedure ####
For each module:

1. Enter to module folder.
2. Run `mkdir logs`.
3. Run `npm run start`.

After running all processes:

4. Run `pm2 save` to save the current list of processes.
5. Run `pm2 startup` to get a command to recover all processes in case of crash. 
You must follow the instructions of command.

#### 3.6.3 Probable errors and possible causes ####

##### 3.6.3.1 Dependencies stuck #####
You need more RAM in your machine or swap space.

### 3.7 Running monitor ###
(TBD)

## 4 Reference ##
Node JS
https://nodejs.org/dist/latest-v8.x/docs/api/

PM2 Manual
http://pm2.keymetrics.io/

MySQL Manual
https://dev.mysql.com/doc/refman/5.7/en/ 

MongoDB Manual
https://docs.mongodb.com/manual/

MongoDB NodeJS Driver Manual
http://mongodb.github.io/node-mongodb-native/3.1/api/

Mosquitto Manual
https://mosquitto.org/

## Appendix A Error messages and recovery procedures ##
(TBC)
## Appendix B Glossary ##
* **TBD: ** To be discussed.
* **TBC: ** To be confirmed.
