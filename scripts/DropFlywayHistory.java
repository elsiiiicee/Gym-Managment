// One-shot utility: drop the Flyway schema_history table on the target DB.
// Use ONLY when a prior boot left a bad/partial baseline that prevents a
// clean re-run. Do NOT use against a database that has real migrated tables.
//
// Run with:
//   java -cp "<flyway-classpath>:<pg-driver-path>" \
//     -Durl=... -Duser=... -Dpassword=... DropFlywayHistory
//
// We use single-file source mode (Java 11+ `java`) and look up the driver
// from the local Maven repo. See scripts/drop-flyway-history.sh.
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class DropFlywayHistory {
    public static void main(String[] args) throws Exception {
        String url = System.getProperty("url");
        String user = System.getProperty("user");
        String pass = System.getProperty("password");
        if (url == null || user == null || pass == null) {
            System.err.println("Set -Durl -Duser -Dpassword");
            System.exit(2);
        }
        try (Connection c = DriverManager.getConnection(url, user, pass);
             Statement s = c.createStatement()) {
            // Print what exists first so we know what we're about to drop.
            try (ResultSet rs = s.executeQuery(
                    "select table_name from information_schema.tables " +
                    "where table_schema = 'public' order by 1")) {
                System.out.println("Tables in public schema BEFORE:");
                int count = 0;
                while (rs.next()) {
                    System.out.println("  - " + rs.getString(1));
                    count++;
                }
                if (count == 0) {
                    System.out.println("  (none)");
                }
            }

            int rows = s.executeUpdate("drop table if exists public.flyway_schema_history");
            System.out.println("drop table if exists public.flyway_schema_history: ok (returned " + rows + ")");
        }
    }
}
