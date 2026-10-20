package com.jobportal.common.exception;

import org.springframework.http.HttpStatus;

/** 404: the resource does not exist or is not visible to the caller. */
public class NotFoundException extends ApiException {

    public NotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}
