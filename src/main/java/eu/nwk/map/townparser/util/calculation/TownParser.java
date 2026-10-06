package eu.nwk.map.townparser.util.calculation;

import eu.nwk.map.townparser.config.Constants;
import eu.nwk.map.townparser.model.Position;
import eu.nwk.map.townparser.model.Town;
import eu.nwk.map.townparser.model.TownSize;
import eu.nwk.map.townparser.util.external.OSMdataSupplier;
import org.jboss.logging.Logger;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class TownParser {

    private static final Logger LOGGER = Logger.getLogger(TownParser.class);

    public static List<Town> obtainTowns(Position<Double> northEast, Position<Double> southWest, int rotationDegrees,
                                         int townGranularity) throws SQLException {
        ResultSet rawQueryResult = OSMdataSupplier.queryForTowns(northEast, southWest, townGranularity);

        List<Town> rawTowns = convertRawQueryResult(rawQueryResult, northEast, southWest, townGranularity);
        List<Town> rotatedTowns = rotate(rawTowns, rotationDegrees);
        return normalizeCoordinates(rotatedTowns);
    }

    private static List<Town> convertRawQueryResult(ResultSet rawQueryResult, Position<Double> northEast,
                                                    Position<Double> southWest, int townGranularity) throws SQLException {
        List<Town> towns = new ArrayList<>();
        while (rawQueryResult.next()) {
            towns.add(extractTownData(rawQueryResult, northEast, southWest, townGranularity));
        }
        return towns;
    }

    private static Town extractTownData(ResultSet row, Position<Double> northEast, Position<Double> southWest,
                                         int townGranularity) throws SQLException {

        String name = row.getString("name");
        double viewportLongitude = (northEast.x() + southWest.x()) / 2;
        double longitude = CoordinateCalculator.unwrapLongitude(row.getDouble("lon"), viewportLongitude);
        Position<Double> coordinates = new Position<>(longitude, row.getDouble("lat"));

        TownSize size = Constants.TOWN_SIZE_BY_TYPE.get(row.getString("place"));
        int rawPopulation = determineTownPopulation(row, size);
        boolean isCity = determineIfCity(rawPopulation, size, townGranularity);
        int population = normalizePopulation(rawPopulation, Constants.POPULATION_NORMALIZATION_FLOOR,
                Constants.POPULATION_NORMALIZATION_CEILING_BY_GRANULARITY.get(townGranularity),
                Constants.POPULATION_NORMALIZATION_FACTOR);

        return new Town(name, CoordinateCalculator.adjustPositionToCutout(coordinates, southWest, northEast), isCity,
                size, population);
    }

    private static int determineTownPopulation(ResultSet row, TownSize townSize) throws SQLException {
        int population = row.getInt("population");
        return row.wasNull() ? Constants.DEFAULT_POPULATION_BY_SIZE.get(townSize) : population;
    }

    private static boolean determineIfCity(int rawPopulation, TownSize size, int townGranularity) {
        boolean isOsmCity = size == TownSize.TOWN_SIZE_LARGE;
        int cityPopulationThreshold = Constants.POPULATION_CITY_THRESHOLD_BY_GRANULARITY.get(townGranularity);
        boolean hasCityPopulation = rawPopulation >= cityPopulationThreshold;

        return isOsmCity && (!Constants.CITY_DETECTION_REQUIRES_POPULATION || hasCityPopulation);
    }

    private static int normalizePopulation(int originalValue, int floor, int ceiling, int factor) {
        double cutOffValue = Math.min(originalValue, ceiling);
        return (int) Math.max(floor, ((cutOffValue / ceiling) * factor));
    }

    private static List<Town> rotate(List<Town> towns, int rotationDegrees) {
        List<Town> rotatedTowns = new ArrayList<>();
        for (Town town : towns) {
            Town rotatedTown = new Town(town.name(), CoordinateCalculator.rotateSinglePoint(town.position(),
                    rotationDegrees, Constants.OTTD_MAP_SIZE), town.isCity(), town.size(), town.population());
            rotatedTowns.add(rotatedTown);
        }
        double edgeOffset = CoordinateCalculator.calculateEdgeCutoffCoordinateOffset(rotationDegrees);
        List<Town> rotatedTownsInBounds = sanitizeTowns(rotatedTowns, (int) edgeOffset,
                (int) (Constants.OTTD_MAP_SIZE - edgeOffset));
        return sanitizeTowns(cutOutTowns(rotatedTownsInBounds, rotationDegrees), 0, Constants.OTTD_MAP_SIZE);
    }

    private static List<Town> sanitizeTowns(List<Town> towns, int bottomEdge, int topEdge) {
        List<Town> sanitizedTowns = new ArrayList<>();
        for (Town town : towns) {
            boolean townWithinBounds =
                    town.position().x() > bottomEdge && town.position().y() > bottomEdge &&
                            town.position().x() < topEdge && town.position().y() < topEdge;
            if (townWithinBounds) {
                sanitizedTowns.add(town);
            }
        }
        return sanitizedTowns;
    }

    private static List<Town> cutOutTowns(List<Town> towns, int rotationDegrees) {
        double offset = CoordinateCalculator.calculateEdgeCutoffCoordinateOffset(rotationDegrees);
        Position<Double> newTop = new Position<>(offset, offset);
        Position<Double> newBottom = new Position<>(Constants.OTTD_MAP_SIZE - offset, Constants.OTTD_MAP_SIZE - offset);
        List<Town> cutOutTowns = new ArrayList<>();
        for (Town town : towns) {
            cutOutTowns.add(new Town(town.name(), CoordinateCalculator.adjustPositionToCutout(town.position(),
                    newBottom, newTop),
                    town.isCity(), town.size(), town.population()));
        }
        return cutOutTowns;
    }

    private static List<Town> normalizeCoordinates(List<Town> towns) {
        List<Town> normalizedTowns = new ArrayList<>();
        for (Town town : towns) {
            Town normalizedTown = normalizeCoordinates(town);
            if (!CoordinateCalculator.isTooCloseToBorder(normalizedTown.position())) {
                normalizedTowns.add(normalizedTown);
            } else {
                LOGGER.debugf("Skipping town too close to the OpenTTD map edge: %s", normalizedTown);
            }
        }
        return normalizedTowns;
    }

    private static Town normalizeCoordinates(Town town) {
        Position<Double> flippedPosition = new Position<>(town.position().y(),
                Constants.OTTD_MAP_SIZE - town.position().x());
        Position<Double> normalizedPosition = CoordinateCalculator.normalizePosition(flippedPosition,
                new Position<>(0d, 0d), new Position<>(1d, 1d));
        return new Town(town.name(), normalizedPosition, town.isCity(), town.size(), town.population());
    }

}
