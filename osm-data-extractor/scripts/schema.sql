DROP TABLE IF EXISTS `osm_place`;

CREATE TABLE `osm_place`
(
    osm_id     BIGINT UNSIGNED NOT NULL,
    name       VARCHAR(255) NOT NULL,
    place      ENUM('city', 'town', 'village', 'suburb') NOT NULL,
    lat DOUBLE NOT NULL,
    lon DOUBLE NOT NULL,
    population INT UNSIGNED NULL,

    PRIMARY KEY (osm_id),

    KEY        idx_place_lat_lon (place, lat, lon)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
