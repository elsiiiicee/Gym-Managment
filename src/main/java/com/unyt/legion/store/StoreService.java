package com.unyt.legion.store;

import com.unyt.legion.notification.NotificationService;
import com.unyt.legion.user.AppUser;
import com.unyt.legion.user.UserRepository;
import com.unyt.legion.wallet.WalletService;
import com.unyt.legion.wallet.WalletTransaction;
import com.unyt.legion.wallet.WalletTransactionType;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StoreService {
    private static final int MAX_LINE_QUANTITY = 99;
    /** Internal sentinel recorded on the legacy {@code payments} table so historical schema stays valid. */
    private static final String INTERNAL_WALLET_PROVIDER = "WALLET";

    private final ProductRepository products;
    private final CartItemRepository cartItems;
    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final UserRepository users;
    private final NotificationService notifications;
    private final WalletService wallets;

    public StoreService(
            ProductRepository products,
            CartItemRepository cartItems,
            OrderRepository orders,
            PaymentRepository payments,
            UserRepository users,
            NotificationService notifications,
            WalletService wallets) {
        this.products = products;
        this.cartItems = cartItems;
        this.orders = orders;
        this.payments = payments;
        this.users = users;
        this.notifications = notifications;
        this.wallets = wallets;
    }

    @Transactional
    public Product createProduct(String sku, String name, String description, long priceCents, int stockQuantity) {
        if (products.findBySku(sku).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU already exists");
        }
        return products.save(new Product(sku.trim(), name.trim(), description.trim(), priceCents, stockQuantity));
    }

    @Transactional
    public Product updateProduct(UUID id, String name, String description, long priceCents, int stockQuantity, boolean active) {
        Product product = products.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        product.setName(name.trim());
        product.setDescription(description.trim());
        product.setPriceCents(priceCents);
        product.setStockQuantity(stockQuantity);
        product.setActive(active);
        return product;
    }

    @Transactional
    public CartItem addToCart(UUID userId, UUID productId, int quantity) {
        validateQuantity(quantity);
        AppUser user = users.findById(userId).orElseThrow();
        Product product = products.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        if (product.getStockQuantity() < quantity) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Not enough stock");
        }
        CartItem item = cartItems.findByUserIdAndProductId(userId, productId)
                .orElseGet(() -> new CartItem(user, product, 0));
        int newQuantity = item.getQuantity() + quantity;
        validateQuantity(newQuantity);
        if (product.getStockQuantity() < newQuantity) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Not enough stock");
        }
        item.setQuantity(newQuantity);
        return cartItems.save(item);
    }

    @Transactional
    public CartItem updateCartItem(UUID userId, UUID productId, int quantity) {
        validateQuantity(quantity);
        CartItem item = cartItems.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart item not found"));
        if (!item.getProduct().isActive() || item.getProduct().getStockQuantity() < quantity) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Not enough stock");
        }
        item.setQuantity(quantity);
        return item;
    }

    @Transactional
    public void removeCartItem(UUID userId, UUID productId) {
        cartItems.findByUserIdAndProductId(userId, productId).ifPresent(cartItems::delete);
    }

    @Transactional
    public CustomerOrder checkout(UUID userId, String idempotencyKey) {
        String key = idempotencyKey.trim();
        return orders.findByUserIdAndIdempotencyKey(userId, key).orElseGet(() -> createOrder(userId, key));
    }

    private CustomerOrder createOrder(UUID userId, String idempotencyKey) {
        AppUser user = users.findById(userId).orElseThrow();
        List<CartItem> items = cartItems.findByUserId(userId);
        if (items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }
        CustomerOrder order = new CustomerOrder(user, idempotencyKey);
        long subtotal = 0;
        for (CartItem cartItem : items) {
            Product product = products.findByIdForUpdate(cartItem.getProduct().getId())
                    .filter(Product::isActive)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Product unavailable"));
            if (cartItem.getQuantity() <= 0 || product.getStockQuantity() < cartItem.getQuantity()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Not enough stock for " + product.getName());
            }
            product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
            order.addItem(new OrderItem(product, cartItem.getQuantity()));
            subtotal += product.getPriceCents() * cartItem.getQuantity();
        }
        long tax = Math.round(subtotal * 0.08);
        long shipping = subtotal >= 10_000 ? 0 : 799;
        order.setSubtotalCents(subtotal);
        order.setTaxCents(tax);
        order.setShippingCents(shipping);
        order.setTotalCents(subtotal + tax + shipping);
        order.setStatus(OrderStatus.PAID);
        CustomerOrder saved = orders.save(order);
        long total = saved.getTotalCents();
        WalletTransaction debit = wallets.debitForPurchase(
                userId,
                total,
                WalletTransactionType.PURCHASE,
                "ORDER",
                saved.getId(),
                idempotencyKey);
        payments.save(new Payment(
                saved, INTERNAL_WALLET_PROVIDER, total, PaymentStatus.COMPLETED, idempotencyKey));
        cartItems.deleteByUserId(userId);
        notifications.notify(user, "ORDER_PAID",
                "Order " + saved.getId() + " paid via wallet. New balance: "
                        + debit.getBalanceAfterCents() + " cents");
        return saved;
    }

    private void validateQuantity(int quantity) {
        if (quantity <= 0 || quantity > MAX_LINE_QUANTITY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be between 1 and " + MAX_LINE_QUANTITY);
        }
    }
}
