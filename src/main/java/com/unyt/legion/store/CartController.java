package com.unyt.legion.store;

import com.unyt.legion.security.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CartController {
    private final CartItemRepository cartItems;
    private final OrderRepository orders;
    private final StoreService store;

    public CartController(CartItemRepository cartItems, OrderRepository orders, StoreService store) {
        this.cartItems = cartItems;
        this.orders = orders;
        this.store = store;
    }

    @GetMapping("/api/cart")
    @Transactional(readOnly = true)
    List<CartItemResponse> cart() {
        return cartItems.findByUserId(SecurityUtils.currentUserId()).stream().map(CartItemResponse::from).toList();
    }

    @PostMapping("/api/cart/items")
    @ResponseStatus(HttpStatus.CREATED)
    CartItemResponse add(@Valid @RequestBody CartMutationRequest request) {
        return CartItemResponse.from(store.addToCart(SecurityUtils.currentUserId(), request.productId(), request.quantity()));
    }

    @PutMapping("/api/cart/items/{productId}")
    CartItemResponse update(@PathVariable UUID productId, @Valid @RequestBody CartQuantityRequest request) {
        return CartItemResponse.from(store.updateCartItem(SecurityUtils.currentUserId(), productId, request.quantity()));
    }

    @DeleteMapping("/api/cart/items/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@PathVariable UUID productId) {
        store.removeCartItem(SecurityUtils.currentUserId(), productId);
    }

    @PostMapping("/api/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    OrderResponse checkout(@Valid @RequestBody CheckoutRequest request) {
        return OrderResponse.from(store.checkout(SecurityUtils.currentUserId(), request.idempotencyKey()));
    }

    @GetMapping("/api/orders")
    @Transactional(readOnly = true)
    List<OrderResponse> orders() {
        return orders.findByUserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId()).stream().map(OrderResponse::from).toList();
    }

    record CartMutationRequest(@NotNull UUID productId, @Positive int quantity) {
    }

    record CartQuantityRequest(@Positive int quantity) {
    }

    record CheckoutRequest(@NotBlank @Size(max = 120) String idempotencyKey) {
    }

    record CartItemResponse(UUID productId, String name, long unitPriceCents, int quantity, long lineTotalCents) {
        static CartItemResponse from(CartItem item) {
            return new CartItemResponse(
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getProduct().getPriceCents(),
                    item.getQuantity(),
                    item.getProduct().getPriceCents() * item.getQuantity());
        }
    }

    record OrderResponse(UUID id, String status, long subtotalCents, long taxCents, long shippingCents, long totalCents) {
        static OrderResponse from(CustomerOrder order) {
            return new OrderResponse(
                    order.getId(),
                    order.getStatus().name(),
                    order.getSubtotalCents(),
                    order.getTaxCents(),
                    order.getShippingCents(),
                    order.getTotalCents());
        }
    }
}
