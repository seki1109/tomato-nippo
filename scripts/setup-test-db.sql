-- テスト用DBのセットアップスクリプト
-- MySQL の root または管理者権限で実行してください
--
-- 実行方法:
--   mysql -u root -p < scripts/setup-test-db.sql

CREATE DATABASE IF NOT EXISTS tomato_nippo_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `tomato_nippo_test`.* TO 'tomato_user'@'localhost';
FLUSH PRIVILEGES;

SELECT 'Test database created successfully.' AS status;
