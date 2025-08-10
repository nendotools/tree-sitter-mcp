package com.example.models;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class UserRepository {
    private final Map<Long, User> users = new ConcurrentHashMap<>();

    public User save(User user) {
        users.put(user.getId(), user);
        return user;
    }

    public Optional<User> findById(long id) {
        return Optional.ofNullable(users.get(id));
    }

    public Optional<User> findByEmail(String email) {
        return users.values()
                .stream()
                .filter(user -> user.getEmail().equals(email))
                .findFirst();
    }

    public List<User> findAll() {
        return new ArrayList<>(users.values());
    }

    public List<User> findActiveUsers() {
        return users.values()
                .stream()
                .filter(User::isActive)
                .collect(ArrayList::new, 
                        (list, user) -> list.add(user), 
                        (list1, list2) -> { list1.addAll(list2); return list1; });
    }

    public boolean deleteById(long id) {
        return users.remove(id) != null;
    }

    public int count() {
        return users.size();
    }

    public void clear() {
        users.clear();
    }
}