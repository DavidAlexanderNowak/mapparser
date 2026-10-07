package eu.nwk.map.townparser.generation;

import eu.nwk.map.townparser.model.Position;
import eu.nwk.map.townparser.model.Town;
import eu.nwk.map.townparser.util.calculation.TownParser;
import eu.nwk.map.townparser.util.output.JsonFileWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;

public class TownsGenerator {

    public static ByteArrayOutputStream generateTowns(Position<Double> northEastEdge, Position<Double> southWestEdge,
                                                      int rotationDegrees, int townGranularity) throws SQLException,
            IOException {
        List<Town> towns = TownParser.obtainTowns(northEastEdge, southWestEdge, rotationDegrees, townGranularity);
        return JsonFileWriter.generateJsonFile(towns);
    }

}
