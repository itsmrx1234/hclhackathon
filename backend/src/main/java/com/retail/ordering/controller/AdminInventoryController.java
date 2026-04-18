package com.retail.ordering.controller;

import com.retail.ordering.dto.request.InventoryRequestDto;
import com.retail.ordering.dto.response.ApiResponseDto;
import com.retail.ordering.dto.response.InventoryResponseDto;
import com.retail.ordering.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/inventory")
@RequiredArgsConstructor
public class AdminInventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<List<InventoryResponseDto>>> getAll() {
        return ResponseEntity.ok(
                ApiResponseDto.success("Inventory fetched",
                        inventoryService.getAllInventory()));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<ApiResponseDto<InventoryResponseDto>> updateStock(
            @PathVariable Long productId,
            @Valid @RequestBody InventoryRequestDto dto) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Stock updated",
                        inventoryService.updateStock(productId, dto)));
    }
}