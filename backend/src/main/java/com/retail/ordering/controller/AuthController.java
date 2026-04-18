package com.retail.ordering.controller;

import com.retail.ordering.dto.request.LoginRequestDto;
import com.retail.ordering.dto.request.RegisterRequestDto;
import com.retail.ordering.dto.response.ApiResponseDto;
import com.retail.ordering.dto.response.AuthResponseDto;
import com.retail.ordering.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDto<AuthResponseDto>> register(
            @Valid @RequestBody RegisterRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponseDto.success("Registered successfully",
                        authService.register(dto)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponseDto<AuthResponseDto>> login(
            @Valid @RequestBody LoginRequestDto dto) {
        return ResponseEntity.ok(
                ApiResponseDto.success("Login successful", authService.login(dto)));
    }
}