package com.retail.ordering.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryResponseDto {
    private Long id;
    private ProductResponseDto product;
    private Integer availableStock;
    private LocalDateTime lastUpdated;
}