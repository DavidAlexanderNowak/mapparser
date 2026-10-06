package eu.nwk.map.townparser.util.output;

import eu.nwk.map.townparser.model.Town;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

public class JsonFileWriter {

    public static ByteArrayOutputStream generateJsonFile(List<Town> towns) throws IOException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        OutputStreamWriter streamWriter = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);
        streamWriter.write(buildFileContent(towns));
        streamWriter.flush();
        return outputStream;
    }

    private static String buildFileContent(List<Town> towns) {
        if (towns.isEmpty()) {
            return "[]";
        }
        String content = "[\r\n";
        for (Town town : towns) {
            content += "\t{\r\n%s\t},\r\n".formatted(buildTownEntry(town));
        }
        content = content.substring(0, content.lastIndexOf(","));
        content += "\r\n]";
        return content;
    }


    private static String buildTownEntry(Town town) {
        return "\t\t\"name\": \"%s\",\r\n".formatted(town.name()) + //
                "\t\t\"population\": %d,\r\n".formatted(town.population()) + //
                "\t\t\"city\": %s,\r\n".formatted(town.isCity()) + //
                String.format(Locale.ENGLISH, "\t\t\"x\": %.5f,\r\n", town.position().x()) + //
                String.format(Locale.ENGLISH, "\t\t\"y\": %.5f\r\n", town.position().y());
    }

}
