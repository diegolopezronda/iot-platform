ALTER TABLE asset ADD COLUMN manufacturer_asset VARCHAR (255) NOT NULL DEFAULT 'Unknown' COMMENT 'Name of the company who builts the hardware.';
ALTER TABLE asset ADD COLUMN model_asset VARCHAR (255) NOT NULL DEFAULT 'Unknown' COMMENT 'Generic identifier of hardware.';
ALTER TABLE asset ADD COLUMN date_asset TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update.';
