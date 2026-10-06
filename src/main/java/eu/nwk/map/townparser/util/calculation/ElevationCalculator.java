package eu.nwk.map.townparser.util.calculation;

import eu.nwk.map.townparser.config.Constants;
import eu.nwk.map.townparser.model.Position;
import org.jboss.logging.Logger;

import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;

public class ElevationCalculator {

    private static final Logger LOGGER = Logger.getLogger(ElevationCalculator.class);
    private static int outliersDetected = 0;

    public static double[][] extractElevations(BufferedImage terrariumImage) {
        int width = terrariumImage.getWidth();
        int height = terrariumImage.getHeight();
        double[][] elevations = new double[height][width];

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int rgb = terrariumImage.getRGB(x, y);
                int red = (rgb >> 16) & 0xFF;
                int green = (rgb >> 8) & 0xFF;
                int blue = rgb & 0xFF;

                elevations[y][x] = (double) red * 256d + (double) green + (double) blue / 256d;
            }
        }
        return elevations;
    }

    public static double[][] fixNoisyPixels(double[][] elevations) {
        double medianDeviation = calculateApplicableMedianDeviation(elevations);
        for (int y = 0; y < elevations.length; y++) {
            for (int x = 0; x < elevations[y].length; x++) {
                elevations = fixSinglePointRecursively(elevations, new Position<>(x, y), 0, medianDeviation);
            }
        }
        LOGGER.debugf("Outliers detected and fixed: %d", outliersDetected);
        return elevations;
    }

    public static double[][] cropStitchedElevations(double[][] stitchedElevations, Position<Double> centreInTile) {
        int xOffset = (int) ((centreInTile.x() - Math.floor(centreInTile.x())) * Constants.MAPZEN_TILE_SIZE);
        int yOffset = (int) ((centreInTile.y() - Math.floor(centreInTile.y())) * Constants.MAPZEN_TILE_SIZE);
        return cropElevations(stitchedElevations, xOffset, yOffset, Constants.OTTD_MAP_SIZE);
    }

    public static double[][] cropElevations(double[][] stitchedElevations, int xOffset, int yOffset,
                                            int targetSideLength) {
        double[][] croppedElevations = new double[targetSideLength][targetSideLength];
        for (int y = 0; y < targetSideLength; y++) {
            for (int x = 0; x < targetSideLength; x++) {
                croppedElevations[y][x] = stitchedElevations[y + yOffset][x + xOffset];
            }
        }
        return croppedElevations;
    }

    private static double calculateApplicableMedianDeviation(double[][] elevations) {
        double[] minMaxElevations = calculateMinMaxElevations(elevations,
                Constants.ELEVATION_RANGE_OUTLIER_PERCENTILE, -32768d);
        double minElevation = minMaxElevations[0];
        double maxElevation = minMaxElevations[1];
        double elevationRange = maxElevation - minElevation;
        double calculatedMedianDeviation = Math.pow(elevationRange, 1.05) * Constants.MEDIAN_DEVIATION_MULTIPLIER;
        return Math.max(calculatedMedianDeviation, Constants.MEDIAN_DEVIATION_MINIMUM);
    }

    private static double[] calculateMinMaxElevations(double[][] elevations, double extremeExclusionPercentile,
                                                      double lowerCutoff) {
        List<Double> sortedElevations = getSortedElevations(elevations, lowerCutoff);

        int minIndex = (int) (sortedElevations.size() * extremeExclusionPercentile);
        int maxIndex = (int) (sortedElevations.size() * 1d - extremeExclusionPercentile) - 1;

        double minElevation = sortedElevations.get(minIndex);
        double maxElevation = sortedElevations.get(maxIndex);

        return new double[]{minElevation, maxElevation};
    }

    private static List<Double> getSortedElevations(double[][] elevations, double lowerCutoff) {
        List<Double> sortedElevations = new ArrayList<>();
        for (double[] line : elevations) {
            for (double elevation : line) {
                if (elevation > lowerCutoff) {
                    sortedElevations.add(elevation);
                }
            }
        }
        sortedElevations.sort(Double::compareTo);
        return sortedElevations;
    }

    private static double[][] fixSinglePointRecursively(double[][] elevations, Position<Integer> pixelPosition,
                                                        int recursionDepth, double medianDeviation) {
        double[][] elevationsAfterFix = fixSinglePoint(elevations, pixelPosition, medianDeviation);
        if (recursionDepth <= Constants.OUTLIER_FIXING_MAX_RECURSION_DEPTH && elevationsAfterFix != null) {
            return fixSinglePointRecursively(elevationsAfterFix, pixelPosition, recursionDepth + 1, medianDeviation);
        }
        return elevations;
    }

    private static double[][] fixSinglePoint(double[][] elevations, Position<Integer> position,
                                             double medianDeviation) {
        double[] neighbours = getNeighbourValues(elevations, position, null);
        double pixelValue = elevations[position.y()][position.x()];

        if (isOutlier(neighbours, pixelValue, medianDeviation)) {
            double[] nonOutlierNeighbourValues = getNonOutlierNeighbourValues(elevations, position, medianDeviation);
            if (nonOutlierNeighbourValues.length > 0) {
                outliersDetected++;
                LOGGER.debugf("Outlier count: %d", outliersDetected);
                elevations[position.y()][position.x()] = calculateNeighbourAverage(nonOutlierNeighbourValues);
                return fixPreviousNeighbours(elevations, position, medianDeviation);
            }
        }
        return null;
    }

    private static double[] getNeighbourValues(double[][] elevations, Position<Integer> position,
                                               Position<Integer> positionToExclude) {
        List<Double> neighbours = new ArrayList<>();
        int height = elevations.length;
        int width = elevations[0].length;

        for (int offsetY = -1 * Constants.NEIGHBOUR_DISTANCE; offsetY <= Constants.NEIGHBOUR_DISTANCE; offsetY++) {
            for (int offsetX = -1 * Constants.NEIGHBOUR_DISTANCE; offsetX <= Constants.NEIGHBOUR_DISTANCE; offsetX++) {
                if (offsetX == 0 && offsetY == 0) {
                    continue;
                }
                Position<Integer> neighbourPosition = CoordinateCalculator.applyOffset(position, offsetX, offsetY);
                boolean isExcluded = neighbourPosition.equals(positionToExclude);
                boolean withinBounds = neighbourPosition.x() >= 0 && neighbourPosition.x() < width
                        && neighbourPosition.y() >= 0 && neighbourPosition.y() < height;
                if (withinBounds && !isExcluded) {
                    neighbours.add(elevations[neighbourPosition.y()][neighbourPosition.x()]);
                }
            }
        }
        return neighbours.stream().mapToDouble(Double::doubleValue).toArray();
    }

    private static double[] getNonOutlierNeighbourValues(double[][] elevations, Position<Integer> position,
                                                         double medianDeviation) {
        List<Double> neighbours = new ArrayList<>();
        int height = elevations.length;
        int width = elevations[0].length;

        for (int offsetY = -1 * Constants.NEIGHBOUR_DISTANCE; offsetY <= Constants.NEIGHBOUR_DISTANCE; offsetY++) {
            for (int offsetX = -1 * Constants.NEIGHBOUR_DISTANCE; offsetX <= Constants.NEIGHBOUR_DISTANCE; offsetX++) {
                if (offsetX == 0 && offsetY == 0) {
                    continue;
                }
                Position<Integer> neighbourPosition = CoordinateCalculator.applyOffset(position, offsetX, offsetY);
                boolean withinBounds = neighbourPosition.x() >= 0 && neighbourPosition.x() < width
                        && neighbourPosition.y() >= 0 && neighbourPosition.y() < height;
                if (withinBounds) {
                    double[] neighbourNeighbours = getNeighbourValues(elevations, neighbourPosition, position);
                    double neighbourValue = elevations[neighbourPosition.y()][neighbourPosition.x()];
                    boolean neighbourIsOutlier = isOutlier(neighbourNeighbours, neighbourValue, medianDeviation);
                    if (!neighbourIsOutlier) {
                        neighbours.add(elevations[neighbourPosition.y()][neighbourPosition.x()]);
                    }
                }
            }
        }
        return neighbours.stream().mapToDouble(Double::doubleValue).toArray();
    }

    private static boolean isOutlier(double[] values, double value, double medianDeviation) {
        double median = calculateMedian(values);
        // to avoid more calculation
        if (Math.abs(value - median) <= medianDeviation) {
            // early return to skip standard deviation calculation
            return false;
        } else {
            double mean = calculateMean(values);
            double standardDeviation = calculateStandardDeviation(values, mean);
            return Math.abs(value - mean) > standardDeviation * Constants.OUTLIER_STANDARD_DEVIATION_MULTIPLIER;
        }
    }

    private static double calculateMedian(double[] values) {
        int middle = values.length / 2;
        if (values.length % 2 == 0) {
            return values[middle - 1];
        } else {
            return values[middle];
        }
    }

    private static double calculateMean(double[] values) {
        return java.util.Arrays.stream(values).average().orElse(0);
    }

    private static double calculateStandardDeviation(double[] values, double mean) {
        double variance = java.util.Arrays.stream(values).map(v -> Math.pow(v - mean, 2)).average().orElse(0);
        return Math.sqrt(variance);
    }

    private static double calculateNeighbourAverage(double[] neighbours) {
        double sum = 0;
        for (double neighbour : neighbours) {
            sum += neighbour;
        }
        return sum / neighbours.length;
    }

    private static double[][] fixPreviousNeighbours(double[][] elevations, Position<Integer> position,
                                                    double medianDeviation) {
        for (int offsetY = -1 * Constants.NEIGHBOUR_DISTANCE; offsetY <= 0; offsetY++) {
            int checkCutoffX = offsetY == 0 ? -1 : Constants.NEIGHBOUR_DISTANCE;
            for (int offsetX = -1 * Constants.NEIGHBOUR_DISTANCE; offsetX <= checkCutoffX; offsetX++) {
                Position<Integer> neighbourPosition = CoordinateCalculator.applyOffset(position, offsetX, offsetY);
                boolean withinBounds =
                        neighbourPosition.x() >= 0 && neighbourPosition.x() < elevations[0].length
                                && neighbourPosition.y() >= 0 && neighbourPosition.y() < elevations.length;
                if (withinBounds) {
                    double[][] elevationsAfterFix = fixSinglePoint(elevations, neighbourPosition, medianDeviation);
                    if (elevationsAfterFix != null) {
                        elevations = elevationsAfterFix;
                    }
                }
            }
        }
        return elevations;
    }

}
