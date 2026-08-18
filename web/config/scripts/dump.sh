mysqldump --databases sensum -a --add-drop-database --add-drop-table --order-by-primary --no-data --skip-triggers --skip-comments -u sensum -p > config/dump/database.sql;
mysqldump sensum -u sensum -p --no-create-db --no-create-info --no-data --add-drop-trigger --skip-comments > config/dump/triggers.sql;
mysqldump sensum -u sensum -p --no-create-db --no-create-info --skip-triggers --skip-comments --tables timezone list level metadata module carrier protocol > config/dump/insert.sql;
mysqldump sensum -u sensum -p --no-create-db --no-create-info --skip-triggers --skip-comments --tables project capability -w "id_project = 1" >> config/dump/insert.sql;
mysqldump sensum -u sensum -p --no-create-db --no-create-info --skip-triggers --skip-comments --tables route link -w "id_project = 1 OR id_project IS NULL" >> config/dump/insert.sql;
mysqldump sensum -u sensum -p --no-create-db --no-create-info --skip-triggers --skip-comments --tables user -w "id_user = 1" >> config/dump/insert.sql;
mysqldump sensum -u sensum -p --no-create-db --no-create-info --skip-triggers --skip-comments --tables member -w "id_member = 1" >> config/dump/insert.sql;
mysqldump sensum -u sensum -p --no-create-db --no-create-info --skip-triggers --skip-comments --tables network >> config/dump/insert.sql;
