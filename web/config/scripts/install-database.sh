sudo mysql -p < config/dump/database.sql
sudo mysql -p < config/dump/user.sql
sudo mysql sensum -p < config/dump/views.sql
sudo mysql sensum -p < config/dump/triggers.sql
sudo mysql sensum -p < config/dump/insert.sql
