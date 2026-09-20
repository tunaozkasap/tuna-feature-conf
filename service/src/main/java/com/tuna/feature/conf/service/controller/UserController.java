package com.tuna.feature.conf.service.controller;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.UserDto.CreateRequest;
import com.tuna.feature.conf.model.dto.UserDto.Response;
import com.tuna.feature.conf.model.dto.UserDto.UpdateRequest;
import com.tuna.feature.conf.service.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User Management", description = "Endpoints for searching, creating, updating, and deleting users")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "Search users", description = "Searches users with filtering, sorting, and pagination")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user search results")
    })
    @PostMapping("/search")
    public ResponseEntity<CrudResponse<Response>> searchUsers(@RequestBody(required = false) CrudRequest<?> request) {
        CrudRequest<?> req = (request != null) ? request : new CrudRequest<>();
        return ResponseEntity.ok(userService.search(req));
    }

    @Operation(summary = "Get all users", description = "Retrieves a paginated list of all users")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved list of users")
    })
    @GetMapping
    public ResponseEntity<CrudResponse<Response>> getAllUsers() {
        return ResponseEntity.ok(userService.search(new CrudRequest<>()));
    }

    @Operation(summary = "Get user by ID", description = "Retrieves user details by their unique ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User found and returned successfully"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> getUserById(
            @Parameter(description = "ID of the user to retrieve", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @Operation(summary = "Create user", description = "Creates a new user record")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed")
    })
    @PostMapping
    public ResponseEntity<CrudResponse<Response>> createUser(@Valid @RequestBody CrudRequest<CreateRequest> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @Operation(summary = "Update user", description = "Updates an existing user by their ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failed"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<CrudResponse<Response>> updateUser(
            @Parameter(description = "ID of the user to update", required = true, example = "1")
            @PathVariable Long id,
            @Valid @RequestBody CrudRequest<UpdateRequest> request
    ) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @Operation(summary = "Delete user", description = "Deletes a user by their ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User deleted successfully"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<CrudResponse<Void>> deleteUser(
            @Parameter(description = "ID of the user to delete", required = true, example = "1")
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(userService.deleteUser(id));
    }
}
