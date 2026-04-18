package com.retail.ordering.controller;

import com.retail.ordering.dto.response.ApiResponseDto;
import com.retail.ordering.dto.response.OrderResponseDto;
import com.retail.ordering.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/api/orders/place")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> placeOrder(
            @AuthenticationPrincipal String email) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDto.success("Order placed",
                        orderService.placeOrder(email)));
    }

    @GetMapping("/api/orders/my")
    public ResponseEntity<ApiResponseDto<List<OrderResponseDto>>> getMyOrders(
            @AuthenticationPrincipal String email) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Orders fetched",
                        orderService.getMyOrders(email)));
    }

    @GetMapping("/api/orders/my/{id}")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> getMyOrderById(
            @AuthenticationPrincipal String email,
            @PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Order fetched",
                        orderService.getMyOrderById(email, id)));
    }

    @GetMapping("/api/admin/orders")
    public ResponseEntity<ApiResponseDto<List<OrderResponseDto>>> getAllOrders() {
        return ResponseEntity.ok(
                ApiResponseDto.success("All orders fetched",
                        orderService.getAllOrders()));
    }

    @PutMapping("/api/admin/orders/{id}/status")
    public ResponseEntity<ApiResponseDto<OrderResponseDto>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Status updated",
                        orderService.updateStatus(id, status)));
    }
}