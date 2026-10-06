package eu.nwk.map.townparser.rest;

import eu.nwk.map.townparser.generation.HeightMapGenerator;
import eu.nwk.map.townparser.model.Position;
import eu.nwk.map.townparser.model.Town;
import eu.nwk.map.townparser.util.calculation.CoordinateCalculator;
import eu.nwk.map.townparser.util.calculation.TownParser;
import eu.nwk.map.townparser.util.output.JsonFileWriter;
import eu.nwk.map.townparser.util.output.ZipFileWriter;

import java.awt.image.ImagingOpException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import java.util.NoSuchElementException;

public class RestServiceBean {

    // TODO -------------------0.13alpha-----------------------------

    // TODO -ESSENTIAL- 0 Webpage:
    // '- Link to public separate repo
    //  '- create repo + process to keep it updated (like release or something)
    //   '- Justification partially because: og repo has deployment configs for server etc (plus commit history mails)

    //

    // TODO -POLISH- 0: Rework icon. Idea good, design needs to work better (too much detail/noise)

    //

    // TODO -CLEANUP- 0: maplibre version update + js conversion to ES modules + cleanup (CVE fix also)

    // TODO -CLEANUP- 1: change naming of sea level percentile mode in code to sea level relative mode

    // TODO -------------------0.13alpha-----------------------------

    //

    //

    // TODO -------------------0.14alpha-----------------------------

    // TODO -FEATURE- 0: Fold button changes to flip upside down (new tiny img needed)

    // TODO -FEATURE- 1: See if different map tiles can be used (now using OpenStreetMap for MapLibre)
    // '- self built tiles with elevation lines?
    // '- Names of towns not rotating (staying upright)

    //

    // TODO -POLISH- 0: Make viewport and text boxes align in the middle, so the top distance doesnt scale
    //  asymmetrically between the two side text boxes and the viewport
    // -> realistic issues for:
    //    '- Ultrawide -> always have the windows be in the centre, and have minimum space to top+bottom
    //    '- 4:3 -> always have the windows be in the centre, and have minimum space to sides? (to top and botom too
    //    regardless tho)

    //

    // TODO -CLEANUP- 0: Rework entire readme by hand

    // TODO -------------------0.14alpha-----------------------------

    //

    //

    // TODO -------------------0.15alpha-----------------------------

    // TODO -ESSENTIAL- 0: add contact/compliance information

    //

    // TODO -FEATURE- 0: Custom exception popup in browser: popup box in openttd style

    // TODO -FEATURE- 1: Share button (coordinate hash)

    // TODO -FEATURE- 2: Add country code to db plus english names, so that it can be configured, which country
    //  should get transliterated names and which should get english names

    // TODO -FEATURE- 3: Sea normalization mode
    // - maybe allow point to be clicked to take height value for sea level
    // '-> can be put in as coordinate, then later use this point (translate -> x,y in tiles) during normalization
    // - Work on auto mode (work out concept, and if it is even feasable - however keeping it and then always using
    //      some default value for placebo effect is probably good anyways

    //

    // TODO -PERFORMANCE- 0: Caching put in database (check if makes sense - reason: memory usage)
    // '- caching of only changed pixels per tile -> way less data to be stored
    // '- cache expires? (if data is not so much, expiry can be kept high)
    //  '- When the underlying mapdata changes, the entire cache should be invalid, becaues it may happen then, that
    //     old cached tiles are then directly next to new tiles, that do not match at the tile border


    // TODO -------------------0.15alpha-----------------------------

    // TODO --------------------BACKLOG------------------------------
    // TODO ----------------refinement tbd---------------------------

    // TODO -POLISH- X: Recommend generating industries in user manual (currently spacing issues)

    //

    // TODO -FEATURE- X: Locking of rotation at 45 degree intervals
    // '- Add rotation slider -> this feature would then remove the zoom slider (to refine, do not implement before
    //     decision is made, on which of the two features to keep (probably this one))
    // '- Checkbox or some way to disable locking->in advanced settings? although disabling it would probably be
    //     a common wish, so not hide it?

    // TODO -FEATURE- X: zoom slider inside the footer of viewport
    // '- 1 portrays limits well
    // '- 2 good for laptop users (without scrollwheel)

    // TODO - FEATURE- X: Advanced settings menu
    // advanced settings that drop down from a button (optional for power users)
    // '- probably rather in pagination of user man? or some dropdown on the left text box, where you choose
    //    another menu (-> text box header name changes as well then)

    // TODO -FEATURE- X: Allow non-square box [LARGE FEATURE]
    // '- First step: Choosable ratio by dragging viewport
    //  '- also limit max size there
    // '- Second step: some menu allowing to choose preset ratio

    //

    // TODO -PERFORMANCE- X: get only the tiles needed for final image
    // - After cutout percentage
    // - After rotationDegrees

    // TODO -PERFORMANCE- X: even less false positive outliers
    // 1. Check number of pixels changed correctly
    //  '- Log distinct outlier pixels fixed
    //  '- Log fixed neighbours separately
    // 2. See if outlier detection can be made more restrictive
    //    without missing causing any outliers to be missed
    //   '- Standard deviation multiplier defined by elevation range of tile (2 - (1000-x)/1000)
    //   '- IQR -- could be the same effect as median but more expensive -> still could produce desired effect

    // TODO -PERFORMANCE- X: allow higher resoltion of output image
    // '- Will need to use more smaller tiles probably

    //

    // TODO -POLISH- X: Interface code structure

    // TODO --------------------BACKLOG------------------------------

    //

    //

    public ByteArrayOutputStream generateOutput(Request request) throws IOException, SQLException {
        ByteArrayOutputStream heightMapStream = generateHeightMap(request.centre(), request.rotationDegrees(),
                request.coordinateWidth(), request.maxCoordinateWidth(), request.seaLevel(),
                request.isSeaLevelPercentile());

        if (!request.includeTownData()) {
            return heightMapStream;
        }

        ByteArrayOutputStream townsJsonStream = generateTownArray(request.centre(), request.rotationDegrees(),
                request.maxCoordinateWidth(), request.maxCoordinateHeight(), request.townGranularity());
        return ZipFileWriter.createZipFile(heightMapStream, townsJsonStream);
    }

    private ByteArrayOutputStream generateHeightMap(Position<Double> centre, int rotationDegrees,
                                                    double coordinateWidth, double maxCoordinateWidth, double seaLevel,
                                                    boolean seaLevelPercentile) throws NoSuchElementException,
            ImagingOpException, IOException {
        int zoom = CoordinateCalculator.calculateZoomToUse(maxCoordinateWidth);
        double cutoutPercentage = CoordinateCalculator.calculateCutoutPercentage(coordinateWidth, zoom);
        return HeightMapGenerator.getHeightMap(centre, zoom, rotationDegrees, cutoutPercentage, seaLevel,
                seaLevelPercentile);
    }

    private ByteArrayOutputStream generateTownArray(Position<Double> centre, int rotationDegrees,
                                                    double maxCoordinateWidth, double maxCoordinateHeight,
                                                    int townGranularity) throws IOException, SQLException {
        Position<Double> northEastEdge = CoordinateCalculator.calculateNorthEastEdge(centre, maxCoordinateWidth,
                maxCoordinateHeight);
        Position<Double> southWestEdge = CoordinateCalculator.calculateSouthWestEdge(centre, maxCoordinateWidth,
                maxCoordinateHeight);
        // TODO maybe put next two lines in one method, like with HeightMapGenerator (or other way around)
        List<Town> towns = TownParser.obtainTowns(northEastEdge, southWestEdge, rotationDegrees, townGranularity);
        return JsonFileWriter.generateJsonFile(towns);
    }

}