package eu.nwk.map.townparser.config;

import eu.nwk.map.townparser.model.TownSize;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Constants {

    public static final int OTTD_MAP_SIZE = 1024;
    public static final int OTTD_TOWN_EDGE_DISTANCE_TILES = 15;
    public static final double OTTD_TOWN_EDGE_DISTANCE_NORMALIZED =
            OTTD_TOWN_EDGE_DISTANCE_TILES / (double) OTTD_MAP_SIZE;

    public static final String TOWN_JSON_FILENAME = "towns.json";
    public static final String HEIGHT_MAP_FILENAME = "heightmap.png";
    public static final String RESULT_ZIP_FILE_FILENAME = "mapdata.zip";

    /* * * * * * * * * * * * *
     * Town size parameters  *
     * * * * * * * * * * * * */

    /* Population mapping */
    public static final Map<String, TownSize> TOWN_SIZE_BY_TYPE = Map.of(//
            "city", TownSize.TOWN_SIZE_LARGE, //
            "town", TownSize.TOWN_SIZE_MEDIUM, //
            "village", TownSize.TOWN_SIZE_SMALL,//
            "suburb", TownSize.TOWN_SIZE_SMALL
    );

    public static final Map<TownSize, Integer> DEFAULT_POPULATION_BY_SIZE = Map.of(//
            TownSize.TOWN_SIZE_LARGE, 2000, //
            TownSize.TOWN_SIZE_MEDIUM, 500, //
            TownSize.TOWN_SIZE_SMALL, 100//
    );

    public static final boolean CITY_DETECTION_REQUIRES_POPULATION = true;
    public static final Map<Integer, Integer> POPULATION_CITY_THRESHOLD_BY_GRANULARITY = Map.of(//
            1, 500_000, //
            2, 100_000, //
            3, 20_000//
    );

    /* Normalization */
    public static final int POPULATION_NORMALIZATION_FLOOR = 50;
    public static final Map<Integer, Integer> POPULATION_NORMALIZATION_CEILING_BY_GRANULARITY = Map.of(//
            1, 500_000, //
            2, 100_000, //
            3, 20_000//
    );
    public static final int POPULATION_NORMALIZATION_FACTOR = 3_000;

    /* * * * * * * * * * * * * * * * * * *
     * Height map calculation parameters *
     * * * * * * * * * * * * * * * * * * */

    /* Zoom */
    public static final int MINIMUM_HEIGHTMAP_ZOOM = 2;

    /* Normalization */
    public static final int HEIGHTMAP_SEA_LEVEL_OFFSET = 32768;

    /* Sanitization */
    public static final int NEIGHBOUR_DISTANCE = 2;
    public static final int OUTLIER_FIXING_MAX_RECURSION_DEPTH = 2;
    public static final double ELEVATION_RANGE_OUTLIER_PERCENTILE = 0.01;
    public static final double MEDIAN_DEVIATION_MULTIPLIER = 0.05;
    public static final double MEDIAN_DEVIATION_MINIMUM = 10;
    public static final double OUTLIER_STANDARD_DEVIATION_MULTIPLIER = 2;

    /* * * * * * * * * * *
     * External services *
     * * * * * * * * * * */

    /* Town database (local) */
    public static final String TOWN_DB_URL = "jdbc:mariadb://osm-db:3306/places";
    public static final String TOWN_DB_USERNAME = "mapparser";
    public static final String TOWN_DB_PASSWORD = "mapparser";

    public static final String TOWN_DB_QUERY = "SELECT name, lat, lon, place, population FROM osm_place " +
            "WHERE place IN (%s) AND lat BETWEEN ? AND ? AND %s";
    public static final String TOWN_DB_LONGITUDE_QUERY = "lon BETWEEN ? AND ?";
    public static final String TOWN_DB_LONGITUDE_CROSSING_QUERY =
            "(lon BETWEEN ? AND 180 OR lon BETWEEN -180 AND ?)";

    public static String[] townTypesByGranularity(int townGranularity) {
        List<String> townTypes = new ArrayList<>();
        switch (townGranularity) {
            case 3:
                townTypes.add("suburb");
                townTypes.add("village");
            case 2:
                townTypes.add("town");
            case 1:
                townTypes.add("city");
                break;
            default:
                throw new IllegalArgumentException("Unknown town granularity: " + townGranularity);
        }
        return townTypes.toArray(new String[0]);
    }

    /* MapZen HeightMap API */
    public static final String MAPZEN_API_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/%d/%d/%d.png";
    public static final int MAPZEN_TILE_SIZE = 256;

}
