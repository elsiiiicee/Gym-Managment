package com.unyt.legion.wallet;

/**
 * Thrown when a member tries to make a wallet-debit operation (class
 * drop-in, membership purchase, retail) and their balance can't cover it.
 *
 * Unchecked because the failure is a business-rule violation surfaced at
 * the HTTP boundary; callers should not be forced to declare it.
 * {@link com.unyt.legion.config.GlobalExceptionHandler} translates this
 * into a 402 Payment Required JSON response with structured details.
 */
public class InsufficientWalletBalanceException extends RuntimeException {

    private final long balanceCents;
    private final long requiredCents;

    public InsufficientWalletBalanceException(long balanceCents, long requiredCents) {
        super(buildMessage(balanceCents, requiredCents));
        this.balanceCents = balanceCents;
        this.requiredCents = requiredCents;
    }

    /** Current wallet balance at the moment the rejection happened, in cents. */
    public long getBalanceCents() {
        return balanceCents;
    }

    /** Amount the operation needed, in cents. */
    public long getRequiredCents() {
        return requiredCents;
    }

    /** How much short the wallet was, in cents. Always positive. */
    public long getShortfallCents() {
        return Math.max(0, requiredCents - balanceCents);
    }

    private static String buildMessage(long balance, long required) {
        return String.format(
                "Wallet balance %.2f is insufficient for required %.2f (short by %.2f)",
                balance / 100.0, required / 100.0, Math.max(0, required - balance) / 100.0);
    }
}
