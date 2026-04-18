package com.retail.ordering.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemResponseDto {
    private Long id;
    private ProductResponseDto product;
    private Integer quantity;
    private BigDecimal priceAtTime;
    private BigDecimal subtotal;
}