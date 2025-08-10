package com.example.models

case class User(
  id: Long,
  name: String,
  email: String,
  active: Boolean = true
) {
  def getDisplayName: String = 
    if (active) name else s"$name (inactive)"
}

object User {
  def createUser(name: String, email: String): User = {
    User(
      id = generateId(),
      name = name,
      email = email
    )
  }

  private def generateId(): Long = System.currentTimeMillis()
}

class UserRepository {
  private var users: List[User] = List.empty

  def save(user: User): User = {
    users = user :: users
    user
  }

  def findById(id: Long): Option[User] = 
    users.find(_.id == id)

  def findByEmail(email: String): Option[User] = 
    users.find(_.email == email)

  def findAll(): List[User] = users

  def deleteById(id: Long): Boolean = {
    val sizeBefore = users.size
    users = users.filterNot(_.id == id)
    users.size < sizeBefore
  }
}