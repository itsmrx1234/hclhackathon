package com.retail.ordering.repository;

import com.retail.ordering.entity.Product;
import com.retail.ordering.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByActiveTrue();
    List<Product> findByCategoryAndActiveTrue(Category category);
}