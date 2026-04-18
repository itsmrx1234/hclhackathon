package com.retail.ordering.service;

import com.retail.ordering.dto.response.*;
import com.retail.ordering.entity.*;
import com.retail.ordering.exception.BadRequestException;
import com.retail.ordering.exception.ResourceNotFoundException;
import com.retail.ordering.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final InventoryRepository inventoryRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public OrderResponseDto placeOrder(String email) {
        User user = getUser(email);

        Cart cart = cartRepository.findByUserWithItems(user)
                .orElseThrow(() -> new BadRequestException("Cart is empty"));

        if (cart.getCartItems().isEmpty()) {
            throw new BadRequestException("Cart is empty");
        }

        // stock check
        for (CartItem ci : cart.getCartItems()) {
            Inventory inv = inventoryRepository.findByProduct(ci.getProduct())
                    .orElseThrow(() -> new BadRequestException(
                            "Inventory not found for: " + ci.getProduct().getName()));
            if (inv.getAvailableStock() < ci.getQuantity()) {
                throw new BadRequestException(
                        "Insufficient stock for: " + ci.getProduct().getName());
            }
        }

        // create order
        Order order = Order.builder()
                .user(user)
                .status(Order.OrderStatus.CONFIRMED)
                .deliveryAddress(user.getAddress())
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal total = BigDecimal.ZERO;

        for (CartItem ci : cart.getCartItems()) {
            BigDecimal subtotal = ci.getProduct().getPrice()
                    .multiply(BigDecimal.valueOf(ci.getQuantity()));
            total = total.add(subtotal);

            OrderItem oi = OrderItem.builder()
                    .order(order)
                    .product(ci.getProduct())
                    .quantity(ci.getQuantity())
                    .priceAtTime(ci.getProduct().getPrice())
                    .subtotal(subtotal)
                    .build();
            order.getOrderItems().add(oi);

            // deduct inventory
            Inventory inv = inventoryRepository.findByProduct(ci.getProduct()).get();
            inv.setAvailableStock(inv.getAvailableStock() - ci.getQuantity());
            inventoryRepository.save(inv);
        }

        order.setTotalAmount(total);
        orderRepository.save(order);

        // clear cart
        cart.getCartItems().clear();
        cartRepository.save(cart);

        return toDto(order);
    }

    public List<OrderResponseDto> getMyOrders(String email) {
        User user = getUser(email);
        return orderRepository.findByUserOrderByOrderDateDesc(user)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public OrderResponseDto getMyOrderById(String email, Long orderId) {
        User user = getUser(email);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!order.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Order does not belong to you");
        }
        return toDto(order);
    }

    public List<OrderResponseDto> getAllOrders() {
        return orderRepository.findAll()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public OrderResponseDto updateStatus(Long orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        try {
            order.setStatus(Order.OrderStatus.valueOf(status));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + status);
        }
        return toDto(orderRepository.save(order));
    }

    private OrderResponseDto toDto(Order order) {
        List<OrderItemResponseDto> items = order.getOrderItems().stream()
                .map(i -> OrderItemResponseDto.builder()
                        .id(i.getId())
                        .product(ProductResponseDto.builder()
                                .id(i.getProduct().getId())
                                .name(i.getProduct().getName())
                                .price(i.getProduct().getPrice())
                                .build())
                        .quantity(i.getQuantity())
                        .priceAtTime(i.getPriceAtTime())
                        .subtotal(i.getSubtotal())
                        .build())
                .collect(Collectors.toList());

        return OrderResponseDto.builder()
                .id(order.getId())
                .status(order.getStatus().name())
                .totalAmount(order.getTotalAmount())
                .orderDate(order.getOrderDate())
                .deliveryAddress(order.getDeliveryAddress())
                .items(items)
                .build();
    }
}