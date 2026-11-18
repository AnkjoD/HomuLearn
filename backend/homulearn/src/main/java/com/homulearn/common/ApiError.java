package com.homulearn.common;

import java.util.Map;
import java.util.UUID;

public record ApiError(String code, String message, Map<String, String> fieldErrors, String traceId) {
    public static ApiError of(String code, String message) {
        return new ApiError(code, message, Map.of(), UUID.randomUUID().toString());
    }
}
