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
import com.tuna.feature.conf.service.util.EvidenceMasking;
import com.tuna.feature.conf.service.util.JpaQueryHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static com.github.tunaozkasap.execlog.ScopedEvidence.s;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public CrudResponse<Response> search(CrudRequest<?> request) {
        try (var search = s().parent("searchUsers")) {
            Specification<UserEntity> spec = JpaQueryHelper.toSpecification(request.getFilters());
            Pageable pageable = JpaQueryHelper.toPageable(request.getPage(), request.getSorts());

            Page<UserEntity> page = (spec != null)
                    ? userRepository.findAll(spec, pageable)
                    : userRepository.findAll(pageable);

            List<Response> items = new ArrayList<>(page.getNumberOfElements());
            List<Long> ids = new ArrayList<>(page.getNumberOfElements());
            for (UserEntity entity : page.getContent()) {
                items.add(toResponse(entity));
                ids.add(entity.getId());
            }
            s().kv("returnedIds", ids);

            return CrudResponse.of(items, JpaQueryHelper.toPageResponseVo(page));
        }
    }

    @Transactional(readOnly = true)
    public CrudResponse<Response> getUserById(Long id) {
        try (var get = s().parent("getUser")) {
            s().kv("userId", id);
            UserEntity user = userRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
            s().kv("found", true);
            return CrudResponse.of(toResponse(user));
        }
    }

    public CrudResponse<Response> createUser(CrudRequest<CreateRequest> request) {
        try (var create = s().parent("createUser")) {
            CreateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new IllegalArgumentException("User payload data is required");
            }
            recordInput(data.getUsername(), data.getEmail());

            UserEntity user = new UserEntity();
            user.setUsername(data.getUsername());
            user.setEmail(data.getEmail());

            UserEntity saved = userRepository.save(user);
            s().kv("savedId", saved.getId()).kv("result", "created");
            return CrudResponse.of(toResponse(saved), "User created successfully");
        }
    }

    public CrudResponse<Response> updateUser(Long id, CrudRequest<UpdateRequest> request) {
        try (var update = s().parent("updateUser")) {
            s().kv("userId", id);
            UpdateRequest data = request.getData();
            if (data == null) {
                s().kv("rejected", "missingData");
                throw new IllegalArgumentException("User payload data is required");
            }
            recordInput(data.getUsername(), data.getEmail());

            UserEntity user = userRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
            s().kv("found", true);

            List<String> changedFields = new ArrayList<>();
            if (data.getUsername() != null && !data.getUsername().isBlank()) {
                user.setUsername(data.getUsername());
                changedFields.add("username");
            }
            if (data.getEmail() != null && !data.getEmail().isBlank()) {
                user.setEmail(data.getEmail());
                changedFields.add("email");
            }
            s().kv("changedFields", changedFields);

            UserEntity saved = userRepository.save(user);
            s().kv("savedId", saved.getId()).kv("result", "updated");
            return CrudResponse.of(toResponse(saved), "User updated successfully");
        }
    }

    public CrudResponse<Void> deleteUser(Long id) {
        try (var delete = s().parent("deleteUser")) {
            s().kv("userId", id);
            if (!userRepository.existsById(id)) {
                s().kv("found", false);
                throw new ResourceNotFoundException("User", "id", id);
            }
            s().kv("found", true);
            userRepository.deleteById(id);
            s().kv("result", "deleted");
            return CrudResponse.<Void>builder()
                    .success(true)
                    .message("User deleted successfully")
                    .build();
        }
    }

    /**
     * The e-mail address is personal data: only a masked form ({@code j***@example.com}) is written.
     */
    private static void recordInput(String username, String email) {
        s().f("input")
           .kv("username", username)
           .kv("email", EvidenceMasking.maskEmail(email));
    }

    private Response toResponse(UserEntity entity) {
        return Response.builder()
                .id(entity.getId())
                .username(entity.getUsername())
                .email(entity.getEmail())
                .build();
    }
}
