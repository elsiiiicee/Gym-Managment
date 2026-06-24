package com.unyt.legion.store;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/catalog/products")
public class CatalogController {
    private final ProductRepository products;

    public CatalogController(ProductRepository products) {
        this.products = products;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<ProductResponse> list() {
        return products.findByActiveTrueOrderByNameAsc().stream().map(ProductResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    ProductResponse get(@PathVariable UUID id) {
        return products.findById(id)
                .filter(Product::isActive)
                .map(ProductResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    record ProductResponse(UUID id, String sku, String name, String description, long priceCents, int stockQuantity) {
        static ProductResponse from(Product product) {
            return new ProductResponse(
                    product.getId(),
                    product.getSku(),
                    product.getName(),
                    product.getDescription(),
                    product.getPriceCents(),
                    product.getStockQuantity());
        }
    }
}
