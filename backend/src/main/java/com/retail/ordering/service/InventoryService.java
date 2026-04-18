package com.retail.ordering.service;

import com.retail.ordering.dto.request.InventoryRequestDto;
import com.retail.ordering.dto.response.InventoryResponseDto;
import com.retail.ordering.dto.response.ProductResponseDto;
import com.retail.ordering.entity.Inventory;
import com.retail.ordering.entity.Product;
import com.retail.ordering.exception.ResourceNotFoundException;
import com.retail.ordering.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ProductService productService;

    public List<InventoryResponseDto> getAllInventory() {
        return inventoryRepository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public InventoryResponseDto updateStock(Long productId, InventoryRequestDto dto) {
        Product product = productService.getProductEntityById(productId);

        Inventory inventory = inventoryRepository.findByProduct(product)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Inventory not found for product id: " + productId));

        inventory.setAvailableStock(dto.getAvailableStock());
        product.setStockQuantity(dto.getAvailableStock());

        return toDto(inventoryRepository.save(inventory));
    }

    private InventoryResponseDto toDto(Inventory inv) {
        Product p = inv.getProduct();
        return InventoryResponseDto.builder()
                .id(inv.getId())
                .product(ProductResponseDto.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .price(p.getPrice())
                        .stockQuantity(p.getStockQuantity())
                        .active(p.getActive())
                        .build())
                .availableStock(inv.getAvailableStock())
                .lastUpdated(inv.getLastUpdated())
                .build();
    }
}