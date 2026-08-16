-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 03, 2026 at 06:29 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `amms`
--

-- --------------------------------------------------------

--
-- Table structure for table `age_groups`
--

CREATE TABLE `age_groups` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `from_age` int(10) UNSIGNED NOT NULL,
  `to_age` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `age_groups`
--

INSERT INTO `age_groups` (`id`, `name`, `from_age`, `to_age`, `created_at`, `updated_at`) VALUES
(1, 'Youth', 0, 17, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(2, 'Adult', 18, 59, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(3, 'Senior', 60, 120, '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `association`
--

CREATE TABLE `association` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `chairman_phone` varchar(20) DEFAULT NULL,
  `secretary_phone` varchar(20) DEFAULT NULL,
  `treasurer_phone` varchar(20) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `association`
--

INSERT INTO `association` (`id`, `name`, `address`, `chairman_phone`, `secretary_phone`, `treasurer_phone`, `logo`, `created_at`, `updated_at`) VALUES
(1, 'Sample Association', 'Arusha, Tanzania', '255711111111', '255722222222', '255733333333', NULL, '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `features`
--

CREATE TABLE `features` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `features_group_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `features`
--

INSERT INTO `features` (`id`, `name`, `features_group_id`, `created_at`, `updated_at`) VALUES
(1, 'Manage Users', 1, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(2, 'Manage Roles', 1, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(3, 'Manage Members', 2, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(4, 'Manage Age Groups', 2, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(5, 'Manage Locations', 2, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(6, 'Manage Fees', 3, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(7, 'Manage Payments', 3, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(8, 'Manage Notifications', 4, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(9, 'View Audit Logs', 5, '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `features_group`
--

CREATE TABLE `features_group` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `features_group`
--

INSERT INTO `features_group` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'User Management', '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(2, 'Membership', '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(3, 'Finance', '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(4, 'Notifications', '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(5, 'System', '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `fee`
--

CREATE TABLE `fee` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `year` year(4) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `fee`
--

INSERT INTO `fee` (`id`, `name`, `amount`, `year`, `created_at`, `updated_at`) VALUES
(1, 'Annual Subscription 2026', 50000.00, '2026', '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `fee_payments`
--

CREATE TABLE `fee_payments` (
  `id` int(10) UNSIGNED NOT NULL,
  `date` date NOT NULL,
  `payment_mode_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `fee_id` int(10) UNSIGNED NOT NULL,
  `member_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `locations`
--

INSERT INTO `locations` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Arusha City', '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(2, 'Meru District', '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `logs`
--

CREATE TABLE `logs` (
  `id` int(10) UNSIGNED NOT NULL,
  `feature_id` int(10) UNSIGNED DEFAULT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `datetime` datetime NOT NULL,
  `before` text DEFAULT NULL,
  `after` text DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `id` int(10) UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `fathers_name` varchar(100) DEFAULT NULL,
  `mothers_name` varchar(100) DEFAULT NULL,
  `location_id` int(10) UNSIGNED DEFAULT NULL,
  `picture` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `member_status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `marital_status` enum('single','married','divorced','widowed') NOT NULL DEFAULT 'single',
  `phone` varchar(20) DEFAULT NULL,
  `fee_exemption` enum('yes','no') NOT NULL DEFAULT 'no',
  `age_group_id` int(10) UNSIGNED DEFAULT NULL,
  `registration_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `members`
--

INSERT INTO `members` (`id`, `first_name`, `last_name`, `fathers_name`, `mothers_name`, `location_id`, `picture`, `date_of_birth`, `member_status`, `marital_status`, `phone`, `fee_exemption`, `age_group_id`, `registration_date`, `created_at`, `updated_at`) VALUES
(1, 'John', 'Doe', 'James Doe', 'Jane Doe', 1, NULL, '1990-05-15', 'active', 'married', '255744444444', 'no', 2, '2026-08-03', '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `version` varchar(255) NOT NULL,
  `class` varchar(255) NOT NULL,
  `group` varchar(255) NOT NULL,
  `namespace` varchar(255) NOT NULL,
  `time` int(11) NOT NULL,
  `batch` int(11) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `version`, `class`, `group`, `namespace`, `time`, `batch`) VALUES
(1, '2026-08-03-000001', 'App\\Database\\Migrations\\CreateAmmsSchema', 'default', 'App', 1785729118, 1);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `notification_template_id` int(10) UNSIGNED DEFAULT NULL,
  `content` text NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications_members`
--

CREATE TABLE `notifications_members` (
  `id` int(10) UNSIGNED NOT NULL,
  `notification_id` int(10) UNSIGNED NOT NULL,
  `member_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_templates`
--

CREATE TABLE `notification_templates` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `notification_templates`
--

INSERT INTO `notification_templates` (`id`, `name`, `content`, `created_at`, `updated_at`) VALUES
(1, 'Welcome Message', 'Welcome {{first_name}} to our association!', '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `payment_modes`
--

CREATE TABLE `payment_modes` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `payment_modes`
--

INSERT INTO `payment_modes` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Cash', '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(2, 'Mobile Money', '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(3, 'Bank Transfer', '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'Admin', '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(2, 'Secretary', '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(3, 'Treasurer', '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `roles_features`
--

CREATE TABLE `roles_features` (
  `id` int(10) UNSIGNED NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `feature_id` int(10) UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `roles_features`
--

INSERT INTO `roles_features` (`id`, `role_id`, `feature_id`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(2, 1, 2, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(3, 1, 3, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(4, 1, 4, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(5, 1, 5, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(6, 1, 6, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(7, 1, 7, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(8, 1, 8, '2026-08-03 03:51:58', '2026-08-03 03:51:58'),
(9, 1, 9, '2026-08-03 03:51:58', '2026-08-03 03:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `phone`, `password`, `role_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 'System', 'Admin', 'admin@amms.local', '255700000000', '$2y$10$YabQ4g8ntP3d/rZNJ4yGTe4AcwV5Q6KeHEi2Ip.LhQaejGUufHs9m', 1, 'active', '2026-08-03 03:51:58', '2026-08-03 03:51:58');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `age_groups`
--
ALTER TABLE `age_groups`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `association`
--
ALTER TABLE `association`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `features`
--
ALTER TABLE `features`
  ADD PRIMARY KEY (`id`),
  ADD KEY `features_features_group_id_foreign` (`features_group_id`);

--
-- Indexes for table `features_group`
--
ALTER TABLE `features_group`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `fee`
--
ALTER TABLE `fee`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `fee_payments`
--
ALTER TABLE `fee_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fee_payments_payment_mode_id_foreign` (`payment_mode_id`),
  ADD KEY `fee_payments_fee_id_foreign` (`fee_id`),
  ADD KEY `fee_payments_member_id_foreign` (`member_id`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `logs`
--
ALTER TABLE `logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `logs_feature_id_foreign` (`feature_id`),
  ADD KEY `logs_user_id_foreign` (`user_id`);

--
-- Indexes for table `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`id`),
  ADD KEY `members_location_id_foreign` (`location_id`),
  ADD KEY `members_age_group_id_foreign` (`age_group_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_notification_template_id_foreign` (`notification_template_id`);

--
-- Indexes for table `notifications_members`
--
ALTER TABLE `notifications_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `notification_id_member_id` (`notification_id`,`member_id`),
  ADD KEY `notifications_members_member_id_foreign` (`member_id`);

--
-- Indexes for table `notification_templates`
--
ALTER TABLE `notification_templates`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payment_modes`
--
ALTER TABLE `payment_modes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `roles_features`
--
ALTER TABLE `roles_features`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_id_feature_id` (`role_id`,`feature_id`),
  ADD KEY `roles_features_feature_id_foreign` (`feature_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `users_role_id_foreign` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `age_groups`
--
ALTER TABLE `age_groups`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `association`
--
ALTER TABLE `association`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `features`
--
ALTER TABLE `features`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `features_group`
--
ALTER TABLE `features_group`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `fee`
--
ALTER TABLE `fee`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `fee_payments`
--
ALTER TABLE `fee_payments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `logs`
--
ALTER TABLE `logs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `members`
--
ALTER TABLE `members`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications_members`
--
ALTER TABLE `notifications_members`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_templates`
--
ALTER TABLE `notification_templates`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `payment_modes`
--
ALTER TABLE `payment_modes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `roles_features`
--
ALTER TABLE `roles_features`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `features`
--
ALTER TABLE `features`
  ADD CONSTRAINT `features_features_group_id_foreign` FOREIGN KEY (`features_group_id`) REFERENCES `features_group` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `fee_payments`
--
ALTER TABLE `fee_payments`
  ADD CONSTRAINT `fee_payments_fee_id_foreign` FOREIGN KEY (`fee_id`) REFERENCES `fee` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fee_payments_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fee_payments_payment_mode_id_foreign` FOREIGN KEY (`payment_mode_id`) REFERENCES `payment_modes` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `logs`
--
ALTER TABLE `logs`
  ADD CONSTRAINT `logs_feature_id_foreign` FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON UPDATE SET NULL,
  ADD CONSTRAINT `logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE SET NULL;

--
-- Constraints for table `members`
--
ALTER TABLE `members`
  ADD CONSTRAINT `members_age_group_id_foreign` FOREIGN KEY (`age_group_id`) REFERENCES `age_groups` (`id`) ON UPDATE SET NULL,
  ADD CONSTRAINT `members_location_id_foreign` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON UPDATE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_notification_template_id_foreign` FOREIGN KEY (`notification_template_id`) REFERENCES `notification_templates` (`id`) ON UPDATE SET NULL;

--
-- Constraints for table `notifications_members`
--
ALTER TABLE `notifications_members`
  ADD CONSTRAINT `notifications_members_member_id_foreign` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `notifications_members_notification_id_foreign` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `roles_features`
--
ALTER TABLE `roles_features`
  ADD CONSTRAINT `roles_features_feature_id_foreign` FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `roles_features_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
