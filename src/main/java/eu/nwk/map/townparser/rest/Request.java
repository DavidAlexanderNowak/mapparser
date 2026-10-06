package eu.nwk.map.townparser.rest;

import eu.nwk.map.townparser.model.Position;

public record Request(Position<Double> centre, int rotationDegrees, double coordinateWidth, double maxCoordinateWidth,
                      double maxCoordinateHeight, boolean isSeaLevelPercentile, double seaLevel,
                      int townGranularity, boolean includeTownData) {
}
