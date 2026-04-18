package com.retail.ordering.repository;

import com.retail.ordering.entity.CartItem;
import com.retail.ordering.entity.Cart;
import com.retail.ordering.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    Optional<CartItem> findByCartAndProduct(Cart cart, Product product);
}