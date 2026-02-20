CREATE TABLE `auth_nonces` (
  `nonce` text PRIMARY KEY NOT NULL,
  `wallet_address` text NOT NULL,
  `created_at` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `used_at` integer
);

CREATE INDEX `auth_nonces_wallet_idx` ON `auth_nonces` (`wallet_address`);
