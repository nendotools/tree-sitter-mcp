#pragma once

#include <string>
#include <vector>
#include <optional>
#include <memory>

class User {
private:
    long id_;
    std::string name_;
    std::string email_;
    bool active_;

public:
    User(long id, const std::string& name, const std::string& email, bool active = true)
        : id_(id), name_(name), email_(email), active_(active) {}

    long getId() const { return id_; }
    const std::string& getName() const { return name_; }
    const std::string& getEmail() const { return email_; }
    bool isActive() const { return active_; }

    void setActive(bool active) { active_ = active; }

    std::string getDisplayName() const {
        return active_ ? name_ : name_ + " (inactive)";
    }

    static User createUser(const std::string& name, const std::string& email) {
        return User(generateId(), name, email);
    }

private:
    static long generateId() {
        return static_cast<long>(std::time(nullptr)) * 1000;
    }
};

class UserRepository {
private:
    std::vector<std::unique_ptr<User>> users_;

public:
    UserRepository() = default;
    ~UserRepository() = default;

    UserRepository(const UserRepository&) = delete;
    UserRepository& operator=(const UserRepository&) = delete;

    User* save(std::unique_ptr<User> user) {
        User* userPtr = user.get();
        users_.push_back(std::move(user));
        return userPtr;
    }

    std::optional<std::reference_wrapper<const User>> findById(long id) const {
        for (const auto& user : users_) {
            if (user->getId() == id) {
                return std::cref(*user);
            }
        }
        return std::nullopt;
    }

    std::optional<std::reference_wrapper<const User>> findByEmail(const std::string& email) const {
        for (const auto& user : users_) {
            if (user->getEmail() == email) {
                return std::cref(*user);
            }
        }
        return std::nullopt;
    }

    std::vector<std::reference_wrapper<const User>> findAll() const {
        std::vector<std::reference_wrapper<const User>> result;
        for (const auto& user : users_) {
            result.emplace_back(std::cref(*user));
        }
        return result;
    }

    bool deleteById(long id) {
        auto it = std::find_if(users_.begin(), users_.end(),
            [id](const auto& user) { return user->getId() == id; });
        
        if (it != users_.end()) {
            users_.erase(it);
            return true;
        }
        return false;
    }
};