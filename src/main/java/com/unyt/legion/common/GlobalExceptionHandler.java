package com.unyt.legion.common;

import com.unyt.legion.wallet.InsufficientWalletBalanceException;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                fields.put(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(ApiError.validation(fields));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(error ->
                fields.put(error.getPropertyPath().toString(), error.getMessage()));
        return ResponseEntity.badRequest().body(ApiError.validation(fields));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        return ResponseEntity.status(status).body(ApiError.of(status.value(), status.getReasonPhrase(), ex.getReason()));
    }

    /**
     * Wallet-side business rule: member tried to spend more than their
     * balance. 402 Payment Required is the semantically correct status.
     * The response carries `balanceCents` / `requiredCents` / `shortfallCents`
     * in {@code fields} so the SPA can show "Need $X more" without an
     * extra round-trip to GET the wallet.
     */
    @ExceptionHandler(InsufficientWalletBalanceException.class)
    ResponseEntity<ApiError> handleInsufficientBalance(InsufficientWalletBalanceException ex) {
        Map<String, String> details = new LinkedHashMap<>();
        details.put("balanceCents", Long.toString(ex.getBalanceCents()));
        details.put("requiredCents", Long.toString(ex.getRequiredCents()));
        details.put("shortfallCents", Long.toString(ex.getShortfallCents()));
        ApiError body = new ApiError(
                Instant.now(),
                HttpStatus.PAYMENT_REQUIRED.value(),
                "Insufficient balance",
                ex.getMessage(),
                details);
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> handleAccessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of(403, "Forbidden", "You do not have permission to perform this action"));
    }

    @ExceptionHandler({DataIntegrityViolationException.class, ObjectOptimisticLockingFailureException.class})
    ResponseEntity<ApiError> handleConflict(Exception ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(409, "Conflict", "Request conflicts with current server state"));
    }

    /**
     * Malformed or unmappable request body (bad JSON, missing required fields a
     * record constructor can't satisfy, type mismatches). This is a client error
     * — return 400, not 500.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException ex) {
        log.warn("Unreadable request body: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.badRequest()
                .body(ApiError.of(400, "Bad Request", "Request body is missing or malformed"));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        // Log the cause server-side (the client response stays generic). Without
        // this, production 500s are undiagnosable.
        log.error("Unhandled exception processing request", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of(500, "Internal Server Error", "Unexpected server error"));
    }
}
