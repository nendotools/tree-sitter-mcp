using System;
using System.Collections.Generic;
using System.Linq;

namespace Example.Models
{
    public class User
    {
        public long Id { get; }
        public string Name { get; }
        public string Email { get; }
        public bool Active { get; set; }

        public User(long id, string name, string email, bool active = true)
        {
            Id = id;
            Name = name ?? throw new ArgumentNullException(nameof(name));
            Email = email ?? throw new ArgumentNullException(nameof(email));
            Active = active;
        }

        public string GetDisplayName()
        {
            return Active ? Name : $"{Name} (inactive)";
        }

        public static User CreateUser(string name, string email)
        {
            return new User(GenerateId(), name, email);
        }

        private static long GenerateId()
        {
            return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }

        public override bool Equals(object obj)
        {
            if (obj is User other)
            {
                return Id == other.Id && 
                       Name == other.Name && 
                       Email == other.Email && 
                       Active == other.Active;
            }
            return false;
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(Id, Name, Email, Active);
        }

        public override string ToString()
        {
            return $"User {{ Id = {Id}, Name = {Name}, Email = {Email}, Active = {Active} }}";
        }
    }

    public class UserRepository
    {
        private readonly Dictionary<long, User> _users = new Dictionary<long, User>();

        public User Save(User user)
        {
            if (user == null) throw new ArgumentNullException(nameof(user));
            _users[user.Id] = user;
            return user;
        }

        public User FindById(long id)
        {
            _users.TryGetValue(id, out User user);
            return user;
        }

        public User FindByEmail(string email)
        {
            return _users.Values.FirstOrDefault(u => u.Email == email);
        }

        public IEnumerable<User> FindAll()
        {
            return _users.Values.ToList();
        }

        public IEnumerable<User> FindActiveUsers()
        {
            return _users.Values.Where(u => u.Active);
        }

        public bool DeleteById(long id)
        {
            return _users.Remove(id);
        }

        public int Count => _users.Count;

        public void Clear()
        {
            _users.Clear();
        }
    }
}