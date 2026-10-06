package eu.nwk.map.townparser.util.external;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class RequestRunner {

    public static <Type> Type runGetRequest(String url, HttpResponse.BodyHandler<Type> bodyHandler) throws IOException,
            InterruptedException {
        HttpResponse<Type> response = sendGetRequest(url, bodyHandler);
        if (response.statusCode() != 200) {
            throw new IOException("Request to %s failed with HTTP status %d"
                    .formatted(url, response.statusCode()));
        }
        return response.body();
    }

    private static <Type> HttpResponse<Type> sendGetRequest(String url, HttpResponse.BodyHandler<Type> bodyHandler) throws IOException,
            InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
        return client.send(request, bodyHandler);
    }

}
