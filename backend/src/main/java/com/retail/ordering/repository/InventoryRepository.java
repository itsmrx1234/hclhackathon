package com.retail.ordering.repository;

import com.retail.ordering.entity.Inventory;
import com.retail.ordering.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    Optional<Inventory> findByProduct(Product product);
}