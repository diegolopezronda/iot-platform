ALTER TABLE project ADD COLUMN schema_project TEXT DEFAULT NULL COMMENT "Configuration of project";
ALTER TABLE user MODIFY first_name_user varchar(45) DEFAULT 'Sensumian' COMMENT 'First name (or two names).';
ALTER TABLE user MODIFY last_name_user varchar(45) DEFAULT 'Sensumian' COMMENT 'First name (or two names).';
ALTER TABLE asset ADD COLUMN is_trusted_asset TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Defines if the device is Sensum Trusted.';
