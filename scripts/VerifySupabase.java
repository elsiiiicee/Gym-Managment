// Live verification of the Supabase schema against what the platform expects.
// Functional equivalent of scripts/check-supabase.sh but using JDBC directly
// so it works without psql on PATH.
//
// Run with:
//   java -cp <pg-driver-path> \
//     -Durl=... -Duser=... -Dpassword=... VerifySupabase
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class VerifySupabase {

    private static final String[] REQUIRED_TABLES = {
        "app_users", "profiles", "refresh_tokens", "account_tokens",
        "notifications", "mail_outbox_messages",
        "products", "cart_items", "customer_orders", "order_items", "payments",
        "trainers", "membership_plans", "user_subscriptions",
        "gym_classes", "class_bookings",
        "wallets", "wallet_transactions", "password_reset_audits",
        "flyway_schema_history"
    };

    public static void main(String[] args) throws Exception {
        String url = System.getProperty("url");
        String user = System.getProperty("user");
        String pass = System.getProperty("password");

        int failures = 0;
        try (Connection c = DriverManager.getConnection(url, user, pass)) {

            failures += check("connectivity",
                    queryScalar(c, "select 1"), "1");

            failures += check("Flyway V1 applied",
                    queryScalar(c, "select count(*) from flyway_schema_history " +
                            "where version = '1' and success = true"), "1");

            failures += check("Flyway V2 applied",
                    queryScalar(c, "select count(*) from flyway_schema_history " +
                            "where version = '2' and success = true"), "1");

            List<String> missing = new ArrayList<>();
            for (String t : REQUIRED_TABLES) {
                String exists = queryScalar(c,
                        "select to_regclass('public." + t + "') is not null");
                if (!"t".equals(exists)) missing.add(t);
            }
            if (missing.isEmpty()) {
                System.out.println("ok:   all " + REQUIRED_TABLES.length + " required tables exist");
            } else {
                System.out.println("FAIL: missing tables: " + missing);
                failures++;
            }

            failures += check("uk_wallet_tx_idempotency (unique constraint)",
                    queryScalar(c, "select count(*) from pg_constraint " +
                            "where conname = 'uk_wallet_tx_idempotency' and contype = 'u'"),
                    "1");

            failures += check("ck_wallet_balance_nonneg (check constraint)",
                    queryScalar(c, "select count(*) from pg_constraint " +
                            "where conname = 'ck_wallet_balance_nonneg' and contype = 'c'"),
                    "1");

            failures += check("password_reset_audits columns",
                    queryScalar(c, "select string_agg(column_name, ',' order by column_name) " +
                            "from information_schema.columns " +
                            "where table_schema = 'public' and table_name = 'password_reset_audits'"),
                    "admin_user_id,created_at,id,reason,target_user_id");

            // Sanity: confirm Hibernate would validate the schema by listing
            // the columns of a tricky table (wallet_transactions).
            try (PreparedStatement ps = c.prepareStatement(
                    "select column_name, data_type, is_nullable, character_maximum_length " +
                    "from information_schema.columns " +
                    "where table_schema = 'public' and table_name = 'wallet_transactions' " +
                    "order by ordinal_position");
                 ResultSet rs = ps.executeQuery()) {
                System.out.println("\nwallet_transactions columns:");
                while (rs.next()) {
                    System.out.printf("  %-25s %-30s nullable=%-3s len=%s%n",
                            rs.getString(1), rs.getString(2),
                            rs.getString(3), rs.getString(4));
                }
            }
        }

        if (failures > 0) {
            System.err.println("\n=== " + failures + " checks FAILED ===");
            System.exit(1);
        }
        System.out.println("\n=== all checks passed ===");
    }

    private static int check(String label, String actual, String expected) {
        if (expected.equals(actual)) {
            System.out.println("ok:   " + label);
            return 0;
        }
        System.out.println("FAIL: " + label + " expected=[" + expected + "] actual=[" + actual + "]");
        return 1;
    }

    private static String queryScalar(Connection c, String sql) throws Exception {
        try (PreparedStatement ps = c.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            return rs.next() ? rs.getString(1) : null;
        }
    }
}
