ALTER TABLE user ADD COLUMN date_user TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT "Date user was created.";
ALTER TABLE user ADD COLUMN is_verified_user TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Indicates if user e-mail was verified.";
ALTER TABLE user ADD COLUMN hash_user VARCHAR(255) DEFAULT NULL COMMENT "Verification hash.";
