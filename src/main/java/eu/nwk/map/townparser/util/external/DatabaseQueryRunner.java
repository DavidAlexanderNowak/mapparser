package eu.nwk.map.townparser.util.external;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetProvider;
import java.sql.*;

public class DatabaseQueryRunner {

    public static ResultSet runQuery(String url, String username, String password, String query,
                                     Object... parameters) throws SQLException {
        try (Connection connection = DriverManager.getConnection(url, username, password);
             PreparedStatement statement = connection.prepareStatement(query)) {
            bindParameters(statement, parameters);
            try (ResultSet resultSet = statement.executeQuery()) {
                return toDisconnectedResultSet(resultSet);
            }
        }
    }

    private static void bindParameters(PreparedStatement statement, Object[] parameters) throws SQLException {
        for (int index = 0; index < parameters.length; index++) {
            statement.setObject(index + 1, parameters[index]);
        }
    }

    private static CachedRowSet toDisconnectedResultSet(ResultSet resultSet) throws SQLException {
        CachedRowSet cachedRowSet = RowSetProvider.newFactory().createCachedRowSet();
        cachedRowSet.populate(resultSet);
        return cachedRowSet;
    }

}
