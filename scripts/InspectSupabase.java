// One-shot: list every public table in Supabase plus key facts about
// app_users (count, admin row).
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class InspectSupabase {
    public static void main(String[] args) throws Exception {
        String url = System.getProperty("url");
        String user = System.getProperty("user");
        String pass = System.getProperty("password");
        try (Connection c = DriverManager.getConnection(url, user, pass)) {

            System.out.println("=== Tables in public schema ===");
            try (PreparedStatement ps = c.prepareStatement(
                    "select table_name, " +
                    "       (select count(*) from information_schema.columns ic " +
                    "         where ic.table_schema = t.table_schema and ic.table_name = t.table_name) as col_count " +
                    "  from information_schema.tables t " +
                    " where table_schema = 'public' " +
                    " order by table_name");
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    System.out.printf("  %-32s (%s columns)%n", rs.getString(1), rs.getString(2));
                }
            }

            System.out.println("\n=== app_users count ===");
            try (PreparedStatement ps = c.prepareStatement("select count(*) from app_users");
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) System.out.println("  " + rs.getString(1) + " row(s)");
            }

            System.out.println("\n=== admin@gmail.com in app_users ===");
            try (PreparedStatement ps = c.prepareStatement(
                    "select id, email, full_name, role, active, email_verified, " +
                    "       length(password_hash) as hash_len " +
                    "  from app_users where email = 'admin@gmail.com'");
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    System.out.println("  id:             " + rs.getString("id"));
                    System.out.println("  email:          " + rs.getString("email"));
                    System.out.println("  full_name:      " + rs.getString("full_name"));
                    System.out.println("  role:           " + rs.getString("role"));
                    System.out.println("  active:         " + rs.getString("active"));
                    System.out.println("  email_verified: " + rs.getString("email_verified"));
                    System.out.println("  hash length:    " + rs.getString("hash_len") + " (BCrypt is 60)");
                } else {
                    System.out.println("  (not found)");
                }
            }

            // If a hand-rolled `users` table exists, show its columns so the
            // user can decide what to drop.
            System.out.println("\n=== `users` table (if any) ===");
            try (PreparedStatement ps = c.prepareStatement(
                    "select column_name, data_type from information_schema.columns " +
                    " where table_schema = 'public' and table_name = 'users' " +
                    " order by ordinal_position");
                 ResultSet rs = ps.executeQuery()) {
                int n = 0;
                while (rs.next()) {
                    System.out.printf("  %-20s %s%n", rs.getString(1), rs.getString(2));
                    n++;
                }
                if (n == 0) System.out.println("  (no `users` table — only app_users exists, which is what the app expects)");
            }
        }
    }
}
