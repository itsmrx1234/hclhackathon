package com.retail.ordering.controller;

import com.retail.ordering.dto.request.CartRequestDto;
import com.retail.ordering.dto.response.ApiResponseDto;
import com.retail.ordering.dto.response.CartResponseDto;
import com.retail.ordering.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<ApiResponseDto<CartResponseDto>> getCart(
            @AuthenticationPrincipal String email) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Cart fetched", cartService.getCart(email)));
    }

    @PostMapping("/add")
    public ResponseEntity<ApiResponseDto<CartResponseDto>> addItem(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody CartRequestDto dto) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Item added", cartService.addItem(email, dto)));
    }

    @PutMapping("/update/{itemId}")
    public ResponseEntity<ApiResponseDto<CartResponseDto>> updateItem(
            @AuthenticationPrincipal String email,
            @PathVariable Long itemId,
            @Valid @RequestBody CartRequestDto dto) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Item updated", cartService.updateItem(email, itemId, dto)));
    }

    @DeleteMapping("/remove/{itemId}")
    public ResponseEntity<ApiResponseDto<CartResponseDto>> removeItem(
            @AuthenticationPrincipal String email,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Item removed", cartService.removeItem(email, itemId)));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<ApiResponseDto<Void>> clearCart(
            @AuthenticationPrincipal String email) {
        cartService.clearCart(email);
        return ResponseEntity.ok(ApiResponseDto.success("Cart cleared", null));
    }
}