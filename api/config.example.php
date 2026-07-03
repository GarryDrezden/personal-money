<?php

/**
 * Скопируйте в config.php и заполните значения.
 * config.php не попадает в git.
 */
return [
  // sqlite — локальная разработка; mysql — прод на shared-хостинге
  'DB_DRIVER' => 'mysql',

  'DB_HOST' => 'localhost',
  'DB_NAME' => 'your_database',
  'DB_USER' => 'your_user',
  'DB_PASSWORD' => 'your_password',
  'DB_CHARSET' => 'utf8mb4',

  'APP_URL' => 'http://where-is-the-money.ru',
  'APP_HTTPS' => false,
];
