package com.jobportal.common.exception;

import org.springframework.http.HttpStatus;

/** 401: missing, invalid or rejected credentials. */
public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}
