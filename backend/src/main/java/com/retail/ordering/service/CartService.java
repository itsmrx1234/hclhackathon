package com.retail.ordering.service;

import com.retail.ordering.dto.request.CartRequestDto;
import com.retail.ordering.dto.response.CartItemResponseDto;
import com.retail.ordering.dto.response.CartResponseDto;
import com.retail.ordering.dto.response.ProductResponseDto;
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
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Cart getOrCreateCart(User user) {
        return cartRepository.findByUser(user).orElseGet(() -> {
            Cart c = Cart.builder().user(user).build();
            return cartRepository.save(c);
        });
    }

    private Cart getFreshCart(User user) {
        return cartRepository.findByUserWithItems(user)
                .orElseGet(() -> getOrCreateCart(user));
    }

    @Transactional
    public CartResponseDto getCart(String email) {
        User user = getUser(email);
        return toDto(getFreshCart(user));
    }

    @Transactional
    public CartResponseDto addItem(String email, CartRequestDto dto) {
        User user = getUser(email);
        Cart cart = getOrCreateCart(user);
        Product product = productService.getProductEntityById(dto.getProductId());

        if (!product.getActive()) {
            throw new BadRequestException("Product is not available");
        }

        cartItemRepository.findByCartAndProduct(cart, product).ifPresentOrElse(
                item -> {
                    item.setQuantity(item.getQuantity() + dto.getQuantity());
                    item.setSubtotal(product.getPrice()
                            .multiply(BigDecimal.valueOf(item.getQuantity())));
                    cartItemRepository.save(item);
                },
                () -> {
                    CartItem item = CartItem.builder()
                            .cart(cart)
                            .product(product)
                            .quantity(dto.getQuantity())
                            .subtotal(product.getPrice()
                                    .multiply(BigDecimal.valueOf(dto.getQuantity())))
                            .build();
                    cart.getCartItems().add(item);
                    cartItemRepository.save(item);
                }
        );

        return toDto(getFreshCart(user));
    }

    @Transactional
    public CartResponseDto updateItem(String email, Long itemId, CartRequestDto dto) {
        User user = getUser(email);
        Cart cart = getOrCreateCart(user);

        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));

        if (!item.getCart().getId().equals(cart.getId())) {
            throw new BadRequestException("Item does not belong to your cart");
        }

        item.setQuantity(dto.getQuantity());
        item.setSubtotal(item.getProduct().getPrice()
                .multiply(BigDecimal.valueOf(dto.getQuantity())));
        cartItemRepository.save(item);

        return toDto(getFreshCart(user));
    }

    @Transactional
    public CartResponseDto removeItem(String email, Long itemId) {
        User user = getUser(email);
        Cart cart = getOrCreateCart(user);

        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));

        if (!item.getCart().getId().equals(cart.getId())) {
            throw new BadRequestException("Item does not belong to your cart");
        }

        cartItemRepository.delete(item);
        cartItemRepository.flush();

        return toDto(getFreshCart(user));
    }

    @Transactional
    public void clearCart(String email) {
        User user = getUser(email);
        Cart cart = getOrCreateCart(user);
        cart.getCartItems().clear();
        cartRepository.save(cart);
    }

    public Cart getCartEntity(User user) {
        return getOrCreateCart(user);
    }

    private CartResponseDto toDto(Cart cart) {
        List<CartItemResponseDto> items = cart.getCartItems().stream()
                .map(i -> CartItemResponseDto.builder()
                        .id(i.getId())
                        .product(toProductDto(i.getProduct()))
                        .quantity(i.getQuantity())
                        .subtotal(i.getSubtotal())
                        .build())
                .collect(Collectors.toList());

        BigDecimal total = items.stream()
                .map(CartItemResponseDto::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CartResponseDto.builder()
                .id(cart.getId())
                .items(items)
                .totalAmount(total)
                .build();
    }

    private ProductResponseDto toProductDto(Product p) {
        return ProductResponseDto.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .price(p.getPrice())
                .imageUrl(p.getImageUrl())
                .stockQuantity(p.getStockQuantity())
                .active(p.getActive())
                .build();
    }
}