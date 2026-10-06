package eu.nwk.map.townparser.generation;

import eu.nwk.map.townparser.model.Position;
import eu.nwk.map.townparser.util.calculation.ImageTransformer;
import eu.nwk.map.townparser.util.external.HeightMapSupplier;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.awt.image.ImagingOpException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public class HeightMapGenerator {

    public static ByteArrayOutputStream getHeightMap(Position<Double> centre, int zoom, int rotationDegrees,
                                                     double cutoutPercentage, double seaLevel,
                                                     boolean seaLevelPercentile) throws IOException {
        ByteArrayOutputStream heightMap = HeightMapSupplier.getRawHeightMap(centre, zoom);
        BufferedImage image = buildTransformedImage(loadImage(heightMap), rotationDegrees, cutoutPercentage, seaLevel,
                seaLevelPercentile);
        return writeImageToStreamAndReturn(image);
    }

    private static BufferedImage buildTransformedImage(BufferedImage rawHeightMapImage, int rotationDegrees,
                                                       double cutoutPercentage, double seaLevel,
                                                       boolean seaLevelPercentile) throws ImagingOpException {
        BufferedImage cutOutImage;
        if (rotationDegrees != 0) {
            BufferedImage rotatedImage = ImageTransformer.buildRotatedImage(rawHeightMapImage, rotationDegrees);
            cutOutImage = ImageTransformer.buildCutOutImage(rotatedImage, cutoutPercentage);
        } else {
            cutOutImage = ImageTransformer.buildCutOutImage(rawHeightMapImage, cutoutPercentage);
        }
        return ImageTransformer.buildNormalizedImage(cutOutImage, seaLevel, seaLevelPercentile);
    }

    private static BufferedImage loadImage(ByteArrayOutputStream fileStream) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(fileStream.toByteArray()));
    }

    private static ByteArrayOutputStream writeImageToStreamAndReturn(BufferedImage image) throws IOException {
        ByteArrayOutputStream transformedImageStream = new ByteArrayOutputStream();
        ImageIO.write(image, "png", transformedImageStream);
        return transformedImageStream;
    }

}
