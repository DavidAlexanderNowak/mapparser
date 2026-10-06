package eu.nwk.map.townparser.util.calculation;

import eu.nwk.map.townparser.config.Constants;

import java.awt.geom.AffineTransform;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.awt.image.Raster;
import java.awt.image.WritableRaster;
import java.util.ArrayList;
import java.util.List;

public class ImageTransformer {

    public static BufferedImage buildRotatedImage(BufferedImage image, int rotationDegrees) {
        BufferedImage rotatedImage = applyRotation(image, rotationDegrees);
        return rotatedImage;
    }

    public static BufferedImage buildCutOutImage(BufferedImage image, double percentage) {
        int offset = (int) Math.round(Constants.OTTD_MAP_SIZE * (1d - percentage) * 0.5);
        BufferedImage cutOutImage = cutOutImage(image, offset);
        double scaleUpPercentage = Constants.OTTD_MAP_SIZE / (double) cutOutImage.getWidth();
        return scaleUpImageByPercentage(cutOutImage, scaleUpPercentage);
    }

    private static BufferedImage applyRotation(BufferedImage image, int rotationDegrees) {
        AffineTransform affineTransform = AffineTransform.getRotateInstance(
                Math.toRadians(rotationDegrees * -1.0),
                Constants.OTTD_MAP_SIZE / 2d,
                Constants.OTTD_MAP_SIZE / 2d
        );
        AffineTransformOp rotationOperation = new AffineTransformOp(
                affineTransform,
                AffineTransformOp.TYPE_NEAREST_NEIGHBOR
        );
        BufferedImage rotatedImage = new BufferedImage(
                image.getWidth(),
                image.getHeight(),
                BufferedImage.TYPE_USHORT_GRAY
        );
        return rotationOperation.filter(image, rotatedImage);
    }

    private static BufferedImage cutOutImage(BufferedImage origin, int offset) {
        int sideLength = Constants.OTTD_MAP_SIZE - offset * 2;
        return origin.getSubimage(offset, offset, sideLength, sideLength);
    }

    public static BufferedImage scaleUpImageByPercentage(BufferedImage origin, double percentage) {
        BufferedImage result = new BufferedImage(Constants.OTTD_MAP_SIZE, Constants.OTTD_MAP_SIZE,
                BufferedImage.TYPE_USHORT_GRAY);
        WritableRaster resultRaster = result.getRaster();
        Raster originRaster = origin.getRaster();

        int originSideLength = origin.getWidth();
        double inversePercentage = 1.0 / percentage;

        for (int y = 0; y < Constants.OTTD_MAP_SIZE; y++) {
            for (int x = 0; x < Constants.OTTD_MAP_SIZE; x++) {
                double originX = x * inversePercentage;
                double originY = y * inversePercentage;

                int xLeft = (int) originX;
                int yTop = (int) originY;
                int xRight = Math.min(xLeft + 1, originSideLength - 1);
                int yBottom = Math.min(yTop + 1, originSideLength - 1);
                double fx = originX - xLeft;
                double fy = originY - yTop;

                int neighbour00 = originRaster.getPixel(xLeft, yTop, new int[1])[0];
                int neighbour10 = originRaster.getPixel(xRight, yTop, new int[1])[0];
                int neighbour01 = originRaster.getPixel(xLeft, yBottom, new int[1])[0];
                int neighbour11 = originRaster.getPixel(xRight, yBottom, new int[1])[0];

                int resultValue;
                boolean seaInNeighbours =
                        neighbour00 == 0 || neighbour10 == 0 || neighbour01 == 0 || neighbour11 == 0;
                if (seaInNeighbours) {
                    resultValue = interpolateWithNearestNeighbours(originX, originY, originSideLength, originRaster);
                } else {
                    resultValue = interpolateWithBicubic(neighbour00, neighbour10, neighbour01, neighbour11, fx, fy);
                }
                resultRaster.setSample(x, y, 0, resultValue);
            }
        }
        return result;
    }

    private static int interpolateWithNearestNeighbours(double originX, double originY, int originSideLength,
                                                        Raster originRaster) {
        int nearestX = Math.min((int) (originX + 0.5), originSideLength - 1);
        int nearestY = Math.min((int) (originY + 0.5), originSideLength - 1);
        return originRaster.getPixel(nearestX, nearestY, new int[1])[0];
    }

    private static int interpolateWithBicubic(int neighbour00, int neighbour10, int neighbour01, int neighbour11,
                                              double fx, double fy) {
        return (int) (neighbour00 * (1 - fx) * (1 - fy) +
                neighbour10 * fx * (1 - fy) +
                neighbour01 * (1 - fx) * fy +
                neighbour11 * fx * fy);
    }

    public static BufferedImage buildNormalizedImage(BufferedImage image, double seaLevel, boolean seaLevelPercentile) {
        List<Integer> sortedElevations = new ArrayList<>();
        int[] pixelValues = image.getRaster().getSamples(0, 0, image.getWidth(), image.getHeight(), 0,
                new int[image.getWidth() * image.getHeight()]);
        for (int pixelValue : pixelValues) {
            sortedElevations.add(pixelValue);
        }
        sortedElevations.sort(Integer::compareTo);

        int seaLevelValue = (int) Math.round(seaLevel + Constants.HEIGHTMAP_SEA_LEVEL_OFFSET);
        if (seaLevelPercentile) {// TODO handle array index issues
            seaLevelValue = sortedElevations.get((int) Math.round(sortedElevations.size() * (seaLevel / 100.0)));
        }
        int seaLevelMinimum = sortedElevations.get((int) Math.round(sortedElevations.size() * (0.005 / 100.0)));
        seaLevelValue = Math.max(seaLevelMinimum, seaLevelValue);

        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        for (int elevation : sortedElevations) {
            if (elevation <= seaLevelValue) {
                continue;
            }
            if (elevation < min) {
                min = elevation;
            }
            if (elevation > max) {
                max = elevation;
            }
        }

        BufferedImage normalizedImage = new BufferedImage(image.getWidth(), image.getHeight(),
                BufferedImage.TYPE_USHORT_GRAY);
        for (int x = 0; x < image.getWidth(); x++) {
            for (int y = 0; y < image.getHeight(); y++) {
                int pixelValue = image.getRaster().getSample(x, y, 0);
                int elevationRange = max - min;

                int normalizedValue = 0;
                if (pixelValue > seaLevelValue) {
                    normalizedValue = (int) Math.round((pixelValue - min) / (double) elevationRange * 65535);
                    if (normalizedValue == 0) {// TODO name this something like elevationsFloor
                        normalizedValue = 1;// TODO pass all those settings the user can set in with some config object,
                        // so that the values dont need to be passed in via method parameters (same for sea level)
                    }
                }
                normalizedImage.getRaster().setSample(x, y, 0, normalizedValue);
            }
        }
        return normalizedImage;
    }

}
