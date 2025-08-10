class User
  attr_reader :id, :name, :email
  attr_accessor :active

  def initialize(id, name, email, active = true)
    @id = id
    @name = name
    @email = email
    @active = active
  end

  def display_name
    active? ? name : "#{name} (inactive)"
  end

  def active?
    @active
  end

  def to_h
    {
      id: id,
      name: name,
      email: email,
      active: active
    }
  end

  def ==(other)
    other.is_a?(User) && 
      id == other.id && 
      name == other.name && 
      email == other.email && 
      active == other.active
  end

  def self.create_user(name, email)
    new(generate_id, name, email)
  end

  private

  def self.generate_id
    (Time.now.to_f * 1000).to_i
  end
end

class UserRepository
  def initialize
    @users = []
  end

  def save(user)
    @users << user unless @users.include?(user)
    user
  end

  def find_by_id(id)
    @users.find { |user| user.id == id }
  end

  def find_by_email(email)
    @users.find { |user| user.email == email }
  end

  def find_all
    @users.dup
  end

  def find_active_users
    @users.select(&:active?)
  end

  def delete_by_id(id)
    user_to_delete = find_by_id(id)
    return false unless user_to_delete
    
    @users.delete(user_to_delete)
    true
  end

  def count
    @users.size
  end

  def clear
    @users.clear
  end

  def each
    return enum_for(:each) unless block_given?
    
    @users.each { |user| yield(user) }
  end
end