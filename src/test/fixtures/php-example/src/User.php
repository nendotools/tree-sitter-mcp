<?php

declare(strict_types=1);

class User
{
    private int $id;
    private string $name;
    private string $email;
    private bool $active;

    public function __construct(int $id, string $name, string $email, bool $active = true)
    {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
        $this->active = $active;
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function isActive(): bool
    {
        return $this->active;
    }

    public function setActive(bool $active): void
    {
        $this->active = $active;
    }

    public function getDisplayName(): string
    {
        return $this->active ? $this->name : "{$this->name} (inactive)";
    }

    public static function createUser(string $name, string $email): self
    {
        return new self(self::generateId(), $name, $email);
    }

    private static function generateId(): int
    {
        return (int)(microtime(true) * 1000);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'active' => $this->active
        ];
    }

    public function __toString(): string
    {
        return sprintf(
            'User{id=%d, name=%s, email=%s, active=%s}',
            $this->id,
            $this->name,
            $this->email,
            $this->active ? 'true' : 'false'
        );
    }
}

class UserRepository
{
    /** @var User[] */
    private array $users = [];

    public function save(User $user): User
    {
        $this->users[$user->getId()] = $user;
        return $user;
    }

    public function findById(int $id): ?User
    {
        return $this->users[$id] ?? null;
    }

    public function findByEmail(string $email): ?User
    {
        foreach ($this->users as $user) {
            if ($user->getEmail() === $email) {
                return $user;
            }
        }
        return null;
    }

    /** @return User[] */
    public function findAll(): array
    {
        return array_values($this->users);
    }

    /** @return User[] */
    public function findActiveUsers(): array
    {
        return array_filter($this->users, fn(User $user) => $user->isActive());
    }

    public function deleteById(int $id): bool
    {
        if (isset($this->users[$id])) {
            unset($this->users[$id]);
            return true;
        }
        return false;
    }

    public function count(): int
    {
        return count($this->users);
    }

    public function clear(): void
    {
        $this->users = [];
    }
}