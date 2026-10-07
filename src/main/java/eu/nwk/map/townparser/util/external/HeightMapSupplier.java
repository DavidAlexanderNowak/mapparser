package eu.nwk.map.townparser.util.external;

import eu.nwk.map.townparser.config.Constants;
import eu.nwk.map.townparser.model.Position;
import eu.nwk.map.townparser.model.TileDataKey;
import eu.nwk.map.townparser.util.calculation.CoordinateCalculator;
import eu.nwk.map.townparser.util.calculation.ElevationCalculator;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

public class HeightMapSupplier {

    private static Map<TileDataKey, double[][]> tileDataCache = new HashMap<>();

    private static final int SIDE_LENGTH_TILE_COUNT = 5;

    public static ByteArrayOutputStream getRawHeightMap(Position<Double> centre, int zoom) throws IOException {

        Position<Double> mapCentreTilePosition = CoordinateCalculator.convertCoordinateToTile(centre, zoom + 2);
        double[][] rawStitchedElevations = getRawStitchedElevations(mapCentreTilePosition, SIDE_LENGTH_TILE_COUNT,
                SIDE_LENGTH_TILE_COUNT, zoom + 2);
        double[][] croppedElevations = ElevationCalculator.cropStitchedElevations(rawStitchedElevations,
                mapCentreTilePosition);

        BufferedImage resultImage = writeElevationsToImage(croppedElevations);
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        ImageIO.write(resultImage, "png", result);
        return result;
    }

    private static double[][] getRawStitchedElevations(Position<Double> centreTilePosition, int tileCountWidth,
                                                       int tileCountHeight, int tileZoom) {

        Position<Integer> startTilePosition = new Position<>(
                (int) Math.floor(centreTilePosition.x()) - 2,
                (int) Math.floor(centreTilePosition.y()) - 2);

        Map<TileDataKey, CompletableFuture<double[][]>> tiles = new HashMap<>();

        for (int tileOffsetY = 0; tileOffsetY < tileCountHeight; tileOffsetY++) {
            for (int tileOffsetX = 0; tileOffsetX < tileCountWidth; tileOffsetX++) {
                Position<Integer> tilePosition = CoordinateCalculator.applyOffset(startTilePosition, tileOffsetX,
                        tileOffsetY);
                TileDataKey tileDataKey = createTileDataKey(tilePosition, tileZoom);
                CompletableFuture<double[][]> tileFuture = CompletableFuture.supplyAsync(
                        () -> {
                            try {
                                return getTileData(tileDataKey);
                            } catch (InterruptedException exception) {
                                Thread.currentThread().interrupt();
                                throw new CompletionException(exception);
                            } catch (IOException exception) {
                                throw new CompletionException(exception);
                            }
                        }
                );
                tiles.put(tileDataKey, tileFuture);
            }
        }
        return buildStitchedElevations(tiles, startTilePosition, tileCountWidth, tileCountHeight, tileZoom);
    }

    private static TileDataKey createTileDataKey(Position<Integer> logicalTilePosition, int tileZoom) {
        Position<Integer> adjustedTilePosition = new Position<>(
                CoordinateCalculator.adjustTileXforWrap(logicalTilePosition.x(), tileZoom),
                logicalTilePosition.y());
        return new TileDataKey(adjustedTilePosition, tileZoom);
    }

    private static double[][] getTileData(TileDataKey tileDataKey) throws IOException,
            InterruptedException {
        if (tileDataCache.containsKey(tileDataKey)) {
            return tileDataCache.get(tileDataKey);
        }
        BufferedImage tile = getTile(tileDataKey);
        double[][] tileElevations = ElevationCalculator.extractElevations(tile);
        double[][] noiseFixedElevations = ElevationCalculator.fixNoisyPixels(tileElevations);
        tileDataCache.put(tileDataKey, noiseFixedElevations);
        return noiseFixedElevations;
    }

    private static BufferedImage getTile(TileDataKey tileDataKey) throws IOException,
            InterruptedException {
        String url = Constants.MAPZEN_API_URL.formatted(tileDataKey.zoom(), tileDataKey.tilePosition().x(),
                tileDataKey.tilePosition().y());
        byte[] heightMapTileBytes = RequestRunner.runGetRequest(url, HttpResponse.BodyHandlers.ofByteArray());
        return ImageIO.read(new ByteArrayInputStream(heightMapTileBytes));
    }

    private static double[][] buildStitchedElevations(Map<TileDataKey, CompletableFuture<double[][]>> tiles,
                                                      Position<Integer> startTilePosition, int tileCountWidth,
                                                      int tileCountHeight, int tileZoom) {
        int imageWidth = tileCountWidth * Constants.MAPZEN_TILE_SIZE;
        int imageHeight = tileCountHeight * Constants.MAPZEN_TILE_SIZE;
        double[][] stitchedElevations = new double[imageHeight][imageWidth];

        CompletableFuture.allOf(tiles.values().toArray(CompletableFuture[]::new)).join();

        for (int tileOffsetY = 0; tileOffsetY < tileCountHeight; tileOffsetY++) {
            for (int tileOffsetX = 0; tileOffsetX < tileCountWidth; tileOffsetX++) {
                Position<Integer> tilePosition = CoordinateCalculator.applyOffset(startTilePosition, tileOffsetX,
                        tileOffsetY);
                TileDataKey tileDataKey = createTileDataKey(tilePosition, tileZoom);
                double[][] tileElevations = tiles.get(tileDataKey).join();
                stitchedElevations = addToStitchedElevations(stitchedElevations, tileElevations,
                        tileOffsetX * Constants.MAPZEN_TILE_SIZE, tileOffsetY * Constants.MAPZEN_TILE_SIZE);
            }
        }
        return stitchedElevations;
    }

    private static double[][] addToStitchedElevations(double[][] stitchedElevations, double[][] tileElevations,
                                                      int xOffset, int yOffset) {
        for (int y = 0; y < tileElevations.length; y++) {
            System.arraycopy(tileElevations[y], 0, stitchedElevations[y + yOffset], xOffset,
                    tileElevations[y].length);
        }
        return stitchedElevations;
    }

    private static BufferedImage writeElevationsToImage(double[][] elevations) {
        int height = elevations.length;
        int width = elevations[0].length;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_USHORT_GRAY);

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                image.getRaster().setSample(x, y, 0, (int) Math.round(elevations[y][x]));
            }
        }
        return image;
    }
}
