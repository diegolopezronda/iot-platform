ALTER TABLE item MODIFY mac_item bigint(20) DEFAULT NULL 
COMMENT 'Sensum serial number of Item.';
ALTER TABLE stock ADD COLUMN is_metadata_stock tinyint(1) NOT NULL DEFAULT 0 
COMMENT 'Defines if this item was associated by a zone.';
DROP TABLE IF EXISTS metastock;
CREATE TABLE metastock (
	id_metadata INT NOT NULL COMMENT "Id of metadata.",
	id_asset INT NOT NULL COMMENT "Id of asset.",
	PRIMARY KEY (id_metadata,id_asset)
) COMMENT='List of assets that include a metadata';
ALTER TABLE metastock ADD FOREIGN KEY (id_metadata) REFERENCES metadata(id_metadata) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE metastock ADD FOREIGN KEY (id_asset) REFERENCES asset(id_asset) ON UPDATE CASCADE ON DELETE NO ACTION;
delimiter //
DROP TRIGGER IF EXISTS insert_item;
CREATE TRIGGER insert_item BEFORE INSERT ON item
	FOR EACH ROW
		BEGIN
			IF NEW.mac_item IS NULL THEN
				SET @mac = (
					SELECT MAX(mac_item)+1 FROM item WHERE mac_item BETWEEN 100000000 AND 999999999
				);
				IF @mac IS NULL THEN
					SET @mac = 100000000;
				END IF;
				SET NEW.mac_item = @mac;
			END IF;
			IF NEW.hash_item IS NULL THEN 
				SET @hash = (
					SELECT MD5(UNIX_TIMESTAMP())
				);
				SET NEW.hash_item = @hash; 
			END IF;
		END;
//
delimiter ;
