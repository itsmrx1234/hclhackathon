package com.retail.ordering.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponseDto {
    private Long id;
    private String status;
    private BigDecimal totalAmount;
    private LocalDateTime orderDate;
    private String deliveryAddress;
    private List<OrderItemResponseDto> items;
}