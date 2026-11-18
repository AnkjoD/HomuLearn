package com.homulearn.common;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
            fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        ApiError base = ApiError.of("VALIDATION_ERROR", "Du lieu khong hop le");
        return ResponseEntity.badRequest().body(new ApiError(base.code(), base.message(), fields, base.traceId()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> conflict() {
        return ResponseEntity.status(409).body(ApiError.of("ACCOUNT_CONFLICT", "Khong the dang ky voi email nay"));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> malformed() {
        return ResponseEntity.badRequest().body(ApiError.of("INVALID_JSON", "Du lieu khong hop le"));
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> apiException(ApiException exception) {
        ApiError error = ApiError.of(exception.getStatus().name(), exception.getMessage());
        return ResponseEntity.status(exception.getStatus()).body(error);
    }
}
