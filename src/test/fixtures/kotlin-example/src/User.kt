package com.example.models

data class User(
    val id: Long,
    val name: String,
    val email: String,
    val active: Boolean = true
) {
    fun getDisplayName(): String {
        return if (active) name else "$name (inactive)"
    }

    companion object {
        fun createUser(name: String, email: String): User {
            return User(
                id = generateId(),
                name = name,
                email = email
            )
        }

        private fun generateId(): Long {
            return System.currentTimeMillis()
        }
    }
}

class UserRepository {
    private val users = mutableListOf<User>()

    fun save(user: User): User {
        users.add(user)
        return user
    }

    fun findById(id: Long): User? {
        return users.find { it.id == id }
    }

    fun findByEmail(email: String): User? {
        return users.find { it.email == email }
    }

    fun findAll(): List<User> {
        return users.toList()
    }

    fun deleteById(id: Long): Boolean {
        return users.removeIf { it.id == id }
    }
}