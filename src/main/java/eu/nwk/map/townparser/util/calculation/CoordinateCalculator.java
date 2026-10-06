package eu.nwk.map.townparser.util.calculation;

import eu.nwk.map.townparser.config.Constants;
import eu.nwk.map.townparser.model.Position;

public class CoordinateCalculator {

    public static Position<Double> adjustPositionToCutout(Position<Double> position, Position<Double> newBottom,
                                                          Position<Double> newTop) {
        return new Position<>(calculateAndNormalizeCutoutCoordinate(position.x(), newBottom.x(), newTop.x()),
                calculateAndNormalizeCutoutCoordinate(position.y(), newBottom.y(), newTop.y()));
    }

    private static double calculateAndNormalizeCutoutCoordinate(double originalValue, double edgeBottom,
                                                                double edgeTop) {
        double min = Math.min(edgeBottom, edgeTop);
        double max = Math.max(edgeBottom, edgeTop);
        double fullLength = max - min;
        double distanceFromTop = Math.abs(originalValue - edgeTop);
        double relativeDistanceFromTop = distanceFromTop / fullLength;
        return Constants.OTTD_MAP_SIZE * relativeDistanceFromTop;
    }

    public static Position<Double> normalizePosition(Position<Double> position, Position<Double> newBottom,
                                                     Position<Double> newTop) {
        return new Position<>(calculateNormalizedCoordinate(position.x(), newBottom.x(), newTop.x()),
                calculateNormalizedCoordinate(position.y(), newBottom.y(), newTop.y()));
    }

    private static double calculateNormalizedCoordinate(double originalValue, double min, double max) {
        double fullLength = max - min;
        return (originalValue / Constants.OTTD_MAP_SIZE) * fullLength;
    }

    public static boolean isTooCloseToBorder(Position<Double> position) {
        double minimumCoordinate = Constants.OTTD_TOWN_EDGE_DISTANCE_NORMALIZED;
        double maximumCoordinate = 1 - minimumCoordinate;
        return position.x() <= minimumCoordinate || position.x() >= maximumCoordinate
                || position.y() <= minimumCoordinate || position.y() >= maximumCoordinate;
    }

    public static Position<Double> rotateSinglePoint(Position<Double> position, int rotationDegrees, int squareWidth) {
        double centrePointDistance = squareWidth / 2d;
        double theta = Math.toRadians(rotationDegrees);

        Position<Double> translatedPosition = new Position<>(
                position.x() - centrePointDistance,
                position.y() - centrePointDistance);
        Position<Double> rotatedPosition = new Position<>(
                translatedPosition.x() * Math.cos(theta) - translatedPosition.y() * Math.sin(theta),
                translatedPosition.x() * Math.sin(theta) + translatedPosition.y() * Math.cos(theta));

        return new Position<>(rotatedPosition.x() + centrePointDistance, rotatedPosition.y() + centrePointDistance);
    }

    public static double calculateEdgeCutoffCoordinateOffset(int rotationDegrees) {
        double diagonalFullLength = calculateDividingDiagonal(Constants.OTTD_MAP_SIZE, Constants.OTTD_MAP_SIZE);
        double diagonalInnerLength = calculateDividingDiagonalInnerLength(Constants.OTTD_MAP_SIZE, rotationDegrees);
        double diagonalEdgeDistance = (diagonalFullLength - diagonalInnerLength) / 2;
        return Math.sqrt(0.5 * Math.pow(diagonalEdgeDistance, 2));
    }

    private static double calculateDividingDiagonal(double sideA, double sideB) {
        return Math.sqrt(Math.pow(sideA, 2) + Math.pow(sideB, 2));
    }

    private static double calculateDividingDiagonalInnerLength(double sideLength, double degrees) {
        double quadrantNormalizedDegrees = Math.abs(degrees) % 90;
        double beta = Math.toRadians(90 - (45 + quadrantNormalizedDegrees));
        return sideLength / Math.cos(beta);
    }

    public static int calculateZoomToUse(double coordinateWidth) {
        int zoom = 15;
        double zoomLevelCoordinateWidth;
        do {
            zoom--;
            zoomLevelCoordinateWidth = calculateZoomLevelCoordinateWidth(zoom);
        } while (zoomLevelCoordinateWidth < coordinateWidth && zoom > Constants.MINIMUM_HEIGHTMAP_ZOOM);
        return zoom;
    }

    private static double calculateZoomLevelCoordinateWidth(int zoom) {
        return 360.0 / Math.pow(2, zoom);
    }

    public static double calculateCutoutPercentage(double coordinateWidth, int zoom) {
        double zoomLevelCoordinateWidth = calculateZoomLevelCoordinateWidth(zoom);
        return coordinateWidth / zoomLevelCoordinateWidth;
    }

    public static Position<Double> calculateNorthEastEdge(Position<Double> centre, double maxCoordinateWidth,
                                                          double maxCoordinateHeight) {
        double x = centre.x() + maxCoordinateWidth / 2;
        double y = centre.y() + maxCoordinateHeight / 2;
        return new Position<>(x, y);
    }

    public static Position<Double> calculateSouthWestEdge(Position<Double> centre, double maxCoordinateWidth,
                                                          double maxCoordinateHeight) {
        double x = centre.x() - maxCoordinateWidth / 2;
        double y = centre.y() - maxCoordinateHeight / 2;
        return new Position<>(x, y);
    }

    public static Position<Double> convertCoordinateToTile(Position<Double> position, int tileZoom) {
        double tileX = (position.x() + 180.0) / 360.0 * (1 << tileZoom);
        double latitudeRad = Math.toRadians(position.y());
        double tileY =
                (1.0 - Math.log(Math.tan(latitudeRad) + 1.0 / Math.cos(latitudeRad)) / Math.PI) / 2.0 * (1 << tileZoom);
        return new Position<>(tileX, tileY);
    }

    public static int adjustTileXforWrap(int tileX, int tileZoom) {
        return Math.floorMod(tileX, 1 << tileZoom);
    }

    public static double unwrapLongitude(double longitude, double referenceLongitude) {
        double unwrappedLongitude = longitude;
        while (unwrappedLongitude - referenceLongitude > 180) {
            unwrappedLongitude -= 360;
        }
        while (unwrappedLongitude - referenceLongitude < -180) {
            unwrappedLongitude += 360;
        }
        return unwrappedLongitude;
    }

    public static Position<Integer> applyOffset(Position<Integer> position, int offsetX, int offsetY) {
        return new Position<>(position.x() + offsetX, position.y() + offsetY);
    }

}