package eu.nwk.map.townparser.rest;

import eu.nwk.map.townparser.generation.HeightMapGenerator;
import eu.nwk.map.townparser.generation.TownsGenerator;
import eu.nwk.map.townparser.model.Position;
import eu.nwk.map.townparser.util.calculation.CoordinateCalculator;
import eu.nwk.map.townparser.util.output.ZipFileWriter;

import java.awt.image.ImagingOpException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.SQLException;
import java.util.NoSuchElementException;

public class RestServiceBean {

    public ByteArrayOutputStream generateOutput(Request request) throws IOException, SQLException {
        ByteArrayOutputStream heightMapStream = generateHeightMap(request.centre(), request.rotationDegrees(),
                request.coordinateWidth(), request.maxCoordinateWidth(), request.seaLevel(),
                request.seaLevelRelativeMode());

        if (!request.includeTownData()) {
            return heightMapStream;
        }

        ByteArrayOutputStream townsJsonStream = generateTownArray(request.centre(), request.rotationDegrees(),
                request.maxCoordinateWidth(), request.maxCoordinateHeight(), request.townGranularity());
        return ZipFileWriter.createZipFile(heightMapStream, townsJsonStream);
    }

    private ByteArrayOutputStream generateHeightMap(Position<Double> centre, int rotationDegrees,
                                                    double coordinateWidth, double maxCoordinateWidth, double seaLevel,
                                                    boolean seaLevelRelativeMode) throws NoSuchElementException,
            ImagingOpException, IOException {
        int zoom = CoordinateCalculator.calculateZoomToUse(maxCoordinateWidth);
        double cutoutPercentage = CoordinateCalculator.calculateCutoutPercentage(coordinateWidth, zoom);
        return HeightMapGenerator.generateHeightMap(centre, zoom, rotationDegrees, cutoutPercentage, seaLevel,
                seaLevelRelativeMode);
    }

    private ByteArrayOutputStream generateTownArray(Position<Double> centre, int rotationDegrees,
                                                    double maxCoordinateWidth, double maxCoordinateHeight,
                                                    int townGranularity) throws IOException, SQLException {
        Position<Double> northEastEdge = CoordinateCalculator.calculateNorthEastEdge(centre, maxCoordinateWidth,
                maxCoordinateHeight);
        Position<Double> southWestEdge = CoordinateCalculator.calculateSouthWestEdge(centre, maxCoordinateWidth,
                maxCoordinateHeight);
        return TownsGenerator.generateTowns(northEastEdge, southWestEdge, rotationDegrees, townGranularity);
    }

}