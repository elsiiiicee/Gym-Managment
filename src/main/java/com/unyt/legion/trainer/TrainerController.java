package com.unyt.legion.trainer;

import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trainers")
public class TrainerController {
    private final TrainerRepository trainers;

    public TrainerController(TrainerRepository trainers) {
        this.trainers = trainers;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<TrainerResponse> list() {
        return trainers.findByActiveTrueOrderByNameAsc().stream().map(TrainerResponse::from).toList();
    }

    public record TrainerResponse(UUID id, String name, String specialty, String bio) {
        public static TrainerResponse from(Trainer trainer) {
            return new TrainerResponse(trainer.getId(), trainer.getName(), trainer.getSpecialty(), trainer.getBio());
        }
    }
}
