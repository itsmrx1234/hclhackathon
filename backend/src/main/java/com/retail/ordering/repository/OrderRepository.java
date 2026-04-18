package com.retail.ordering.repository;

import com.retail.ordering.entity.Order;
import com.retail.ordering.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserOrderByOrderDateDesc(User user);
}