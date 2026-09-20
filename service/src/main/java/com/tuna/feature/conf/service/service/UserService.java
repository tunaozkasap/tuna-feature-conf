package com.tuna.feature.conf.service.service;

import com.tuna.feature.conf.model.crud.CrudRequest;
import com.tuna.feature.conf.model.crud.CrudResponse;
import com.tuna.feature.conf.model.dto.UserDto;
import com.tuna.feature.conf.model.dto.UserDto.CreateRequest;
import com.tuna.feature.conf.model.dto.UserDto.Response;
import com.tuna.feature.conf.model.dto.UserDto.UpdateRequest;
import com.tuna.feature.conf.persistence.entity.UserEntity;
import com.tuna.feature.conf.persistence.repository.UserRepository;
import com.tuna.feature.conf.service.exception.ResourceNotFoundException;
import com.tuna.feature.conf.service.util.JpaQueryHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        Specification<UserEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
        Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

        Page<UserEntity> page = (spec != null)
                ? userRepository.findAll(spec, pageable)
                : userRepository.findAll(pageable);

        List<Response> items = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getUserById(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return CrudResponse.of(toResponse(user));
    }

    public CrudResponse<Response> createUser(CrudRequest<CreateRequest> request) {
        CreateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("User payload data is required");
        }

        UserEntity user = new UserEntity();
        user.setUsername(data.getUsername());
        user.setEmail(data.getEmail());

        UserEntity saved = userRepository.save(user);
        return CrudResponse.of(toResponse(saved), "User created successfully");
    }

    public CrudResponse<Response> updateUser(Long id, CrudRequest<UpdateRequest> request) {
        UpdateRequest data = request.getData();
        if (data == null) {
            throw new IllegalArgumentException("User payload data is required");
        }

        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));

        if (data.getUsername() != null && !data.getUsername().isBlank()) {
            user.setUsername(data.getUsername());
        }
        if (data.getEmail() != null && !data.getEmail().isBlank()) {
            user.setEmail(data.getEmail());
        }

        UserEntity saved = userRepository.save(user);
        return CrudResponse.of(toResponse(saved), "User updated successfully");
    }

    public CrudResponse<Void> deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", "id", id);
        }
        userRepository.deleteById(id);
        return CrudResponse.<Void>builder()
                .success(true)
                .message("User deleted successfully")
                .build();
    }

    private Response toResponse(UserEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .username(entity.getUsername())
                .email(entity.getEmail())
                .build();
    }
}
