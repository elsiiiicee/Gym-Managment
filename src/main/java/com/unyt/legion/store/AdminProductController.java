package com.unyt.legion.store;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {
    private final ProductRepository products;
    private final StoreService store;

    public AdminProductController(ProductRepository products, StoreService store) {
        this.products = products;
        this.store = store;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<ProductAdminResponse> list() {
        return products.findAll().stream().map(ProductAdminResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ProductAdminResponse create(@Valid @RequestBody ProductCreateRequest request) {
        return ProductAdminResponse.from(store.createProduct(
                request.sku(),
                request.name(),
                request.description(),
                request.priceCents(),
                request.stockQuantity()));
    }

    @PutMapping("/{id}")
    ProductAdminResponse update(@PathVariable UUID id, @Valid @RequestBody ProductUpdateRequest request) {
        return ProductAdminResponse.from(store.updateProduct(
                id,
                request.name(),
                request.description(),
                request.priceCents(),
                request.stockQuantity(),
                request.active()));
    }

    record ProductCreateRequest(
            @Pattern(regexp = "^[A-Z0-9._-]{3,80}$") String sku,
            @NotBlank @Size(max = 160) String name,
            @NotBlank @Size(max = 1000) String description,
            @Min(1) long priceCents,
            @Min(0) int stockQuantity) {
    }

    record ProductUpdateRequest(
            @NotBlank @Size(max = 160) String name,
            @NotBlank @Size(max = 1000) String description,
            @Min(1) long priceCents,
            @Min(0) int stockQuantity,
            boolean active) {
    }

    record ProductAdminResponse(UUID id, String sku, String name, long priceCents, int stockQuantity, boolean active) {
        static ProductAdminResponse from(Product product) {
            return new ProductAdminResponse(
                    product.getId(),
                    product.getSku(),
                    product.getName(),
                    product.getPriceCents(),
                    product.getStockQuantity(),
                    product.isActive());
        }
    }
}
