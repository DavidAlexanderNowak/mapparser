package eu.nwk.map.townparser.util.output;

import eu.nwk.map.townparser.config.Constants;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class ZipFileWriter {

    public static ByteArrayOutputStream createZipFile(ByteArrayOutputStream heightMapBytes,
                                                      ByteArrayOutputStream townsJsonBytes) throws IOException {
        ByteArrayOutputStream zipOutput = new ByteArrayOutputStream();

        try (ZipOutputStream zipOutputStream = new ZipOutputStream(zipOutput)) {
            addHeightMapToZip(zipOutputStream, heightMapBytes);
            addTownsJsonToZip(zipOutputStream, townsJsonBytes);
        }
        return zipOutput;
    }

    private static void addHeightMapToZip(ZipOutputStream zipOutputStream, ByteArrayOutputStream heightMapBytes) throws IOException {
        ZipEntry zipEntry = new ZipEntry(Constants.HEIGHT_MAP_FILENAME);
        zipOutputStream.putNextEntry(zipEntry);
        zipOutputStream.write(heightMapBytes.toByteArray());
        zipOutputStream.closeEntry();
    }

    private static void addTownsJsonToZip(ZipOutputStream outputStream, ByteArrayOutputStream townsJsonBytes) throws IOException {
        ZipEntry zipEntry = new ZipEntry(Constants.TOWN_JSON_FILENAME);
        outputStream.putNextEntry(zipEntry);
        outputStream.write(townsJsonBytes.toByteArray());
        outputStream.closeEntry();
    }

}
