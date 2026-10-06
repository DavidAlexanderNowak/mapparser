package eu.nwk.map.townparser.rest;

import eu.nwk.map.townparser.config.Constants;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.io.ByteArrayOutputStream;

@Path("")
public class RestService {

    private static final Logger LOGGER = Logger.getLogger(RestService.class);

    @POST
    @Path("/download")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response generateDownload(Request request) {
        try {
            RestServiceBean bean = new RestServiceBean();
            ByteArrayOutputStream outputStream;
            String fileName;

            if (request.includeTownData()) {
                fileName = Constants.RESULT_ZIP_FILE_FILENAME;
            } else {
                fileName = Constants.HEIGHT_MAP_FILENAME;
            }
            outputStream = bean.generateOutput(request);

            byte[] outputBytes = outputStream.toByteArray();
            return Response.ok(outputBytes)
                    .header("Content-Disposition", "attachment; filename=\"%s\"".formatted(fileName))
                    .header("Content-Length", outputBytes.length)
                    .build();
        } catch (Exception exception) {
            LOGGER.errorf(exception, "Error occurred while trying to obtain map data for request: %s", request);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("{\"error\": \"" + exception.getLocalizedMessage() + "\"}")
                    .build();
        }
    }
}