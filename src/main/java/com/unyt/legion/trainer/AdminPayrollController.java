package com.unyt.legion.trainer;

import com.unyt.legion.booking.GymClassRepository;
import com.unyt.legion.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Admin payroll view + payout recorder.
 *
 * Earnings model (simple, demoable):
 *   earned = trainer.fee_per_class_cents * (count of classes whose endsAt
 *            is in the past — i.e. classes the trainer has actually taught)
 *   paid   = sum(trainer_payouts.amount_cents) for that trainer
 *   outstanding = earned - paid  (can be negative if admin overpaid; the
 *                                 endpoint surfaces it as-is)
 */
@RestController
@RequestMapping("/api/admin/payroll")
public class AdminPayrollController {

    private final TrainerRepository trainers;
    private final GymClassRepository classes;
    private final TrainerPayoutRepository payouts;

    public AdminPayrollController(
            TrainerRepository trainers,
            GymClassRepository classes,
            TrainerPayoutRepository payouts) {
        this.trainers = trainers;
        this.classes = classes;
        this.payouts = payouts;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<PayrollRow> summary() {
        Instant now = Instant.now();
        Map<UUID, Long> taughtByTrainer = new HashMap<>();
        for (Object[] row : classes.countTaughtClassesPerTrainer(now)) {
            taughtByTrainer.put((UUID) row[0], (Long) row[1]);
        }
        Map<UUID, Long> paidByTrainer = new HashMap<>();
        for (Object[] row : payouts.sumPaidByTrainer()) {
            paidByTrainer.put((UUID) row[0], (Long) row[1]);
        }
        return trainers.findAllForAdmin().stream()
                .map(t -> {
                    long taught = taughtByTrainer.getOrDefault(t.getId(), 0L);
                    long earned = t.getFeePerClassCents() * taught;
                    long paid = paidByTrainer.getOrDefault(t.getId(), 0L);
                    long outstanding = earned - paid;
                    return new PayrollRow(
                            t.getId(),
                            t.getName(),
                            t.getSpecialty(),
                            t.getFeePerClassCents(),
                            (int) taught,
                            earned,
                            paid,
                            outstanding,
                            t.isActive());
                })
                .toList();
    }

    @PostMapping("/{trainerId}/payout")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    PayoutResult recordPayout(
            @PathVariable UUID trainerId,
            @Valid @RequestBody PayoutRequest request) {
        Trainer trainer = trainers.findById(trainerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trainer not found"));
        TrainerPayout existing = payouts
                .findByTrainerIdAndIdempotencyKey(trainerId, request.idempotencyKey())
                .orElse(null);
        TrainerPayout saved = existing != null
                ? existing
                : payouts.save(new TrainerPayout(
                        trainer,
                        SecurityUtils.currentUserId(),
                        request.amountCents(),
                        request.notes(),
                        request.idempotencyKey()));
        return new PayoutResult(
                saved.getId(),
                trainer.getId(),
                saved.getAmountCents(),
                saved.getNotes(),
                saved.getCreatedAt());
    }

    record PayrollRow(
            UUID trainerId,
            String name,
            String specialty,
            long feePerClassCents,
            int classesTaught,
            long earnedCents,
            long paidCents,
            long outstandingCents,
            boolean active) {
    }

    record PayoutRequest(
            @Positive long amountCents,
            @Size(max = 500) String notes,
            @NotBlank @Size(max = 120) String idempotencyKey) {
    }

    record PayoutResult(
            UUID payoutId,
            UUID trainerId,
            long amountCents,
            String notes,
            Instant createdAt) {
    }
}
