package com.retail.ordering.dto.response;

import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartResponseDto {
    private Long id;
    private List<CartItemResponseDto> items;
    private java.math.BigDecimal totalAmount;
}