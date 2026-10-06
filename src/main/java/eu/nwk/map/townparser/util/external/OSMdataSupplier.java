package eu.nwk.map.townparser.util.external;

import eu.nwk.map.townparser.config.Constants;
import eu.nwk.map.townparser.model.Position;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class OSMdataSupplier {

    public static ResultSet queryForTowns(Position<Double> northEast, Position<Double> southWest,
                                          int townGranularity) throws SQLException {
        String[] townTypes = Constants.townTypesByGranularity(townGranularity);
        return DatabaseQueryRunner.runQuery(Constants.TOWN_DB_URL, Constants.TOWN_DB_USERNAME,
                Constants.TOWN_DB_PASSWORD, buildQuery(townTypes, northEast, southWest),
                buildParameters(townTypes, northEast, southWest));
    }

    private static String buildQuery(String[] townTypes, Position<Double> northEast,
                                     Position<Double> southWest) {
        String placeholders = Arrays.stream(townTypes).map(type -> "?").collect(Collectors.joining(", "));
        return Constants.TOWN_DB_QUERY.formatted(placeholders, buildLongitudeCondition(northEast, southWest));
    }

    private static Object[] buildParameters(String[] townTypes, Position<Double> northEast,
                                            Position<Double> southWest) {
        List<Object> parameters = new ArrayList<>();
        for (String townType : townTypes) {
            parameters.add(townType);
        }
        parameters.add(southWest.y());
        parameters.add(northEast.y());
        addLongitudeParameters(parameters, northEast, southWest);
        return parameters.toArray();
    }

    private static String buildLongitudeCondition(Position<Double> northEast, Position<Double> southWest) {
        if (southWest.x() < -180) {
            return Constants.TOWN_DB_LONGITUDE_CROSSING_QUERY;
        }
        if (northEast.x() > 180) {
            return Constants.TOWN_DB_LONGITUDE_CROSSING_QUERY;
        }
        return Constants.TOWN_DB_LONGITUDE_QUERY;
    }

    private static void addLongitudeParameters(List<Object> parameters, Position<Double> northEast,
                                               Position<Double> southWest) {
        if (southWest.x() < -180) {
            parameters.add(southWest.x() + 360);
            parameters.add(northEast.x());
            return;
        }
        if (northEast.x() > 180) {
            parameters.add(southWest.x());
            parameters.add(northEast.x() - 360);
            return;
        }
        parameters.add(southWest.x());
        parameters.add(northEast.x());
    }

}
