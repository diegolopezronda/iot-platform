#NodeJS
sudo apt update
sudo apt upgrade 
sudo apt install curl npm
sudo apt install -y build-essential
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt install -y nodejs
#MongoDB
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list
sudo apt update
sudo apt install -y mongodb-org
sudo service mongod start
mongo sensum mongo_indexes.js
mongo sensum mongo_user.js
#MySQL
sudo apt-get install mysql-server
sudo service mysql start
#Mosquitto
sudo add-apt-repository ppa:mosquitto-dev/mosquitto-ppa
sudo apt update
sudo apt install mosquitto
sudo service mosquitto start
#NPM dependencies
sudo npm install -g pm2 prettier uglify-js
