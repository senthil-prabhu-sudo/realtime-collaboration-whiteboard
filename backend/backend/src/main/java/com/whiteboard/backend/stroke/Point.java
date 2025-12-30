package com.whiteboard.backend.stroke;

/**
 * Canonical point DTO.
 * Matches frontend payload exactly:
 * { x: number, y: number }
 */
public record Point(double x, double y) {}
