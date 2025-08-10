defmodule Example.User do
  @moduledoc """
  User module with basic CRUD operations
  """

  defstruct [:id, :name, :email, active: true]

  @type t :: %__MODULE__{
    id: integer(),
    name: String.t(),
    email: String.t(),
    active: boolean()
  }

  @spec create_user(String.t(), String.t()) :: t()
  def create_user(name, email) do
    %__MODULE__{
      id: generate_id(),
      name: name,
      email: email
    }
  end

  @spec get_display_name(t()) :: String.t()
  def get_display_name(%__MODULE__{name: name, active: true}), do: name
  def get_display_name(%__MODULE__{name: name, active: false}), do: "#{name} (inactive)"

  defp generate_id do
    :os.system_time(:millisecond)
  end
end

defmodule Example.UserRepository do
  @moduledoc """
  In-memory user repository using Agent
  """

  use Agent

  alias Example.User

  def start_link(initial_users \\ []) do
    Agent.start_link(fn -> initial_users end, name: __MODULE__)
  end

  @spec save(User.t()) :: User.t()
  def save(%User{} = user) do
    Agent.update(__MODULE__, fn users -> [user | users] end)
    user
  end

  @spec find_by_id(integer()) :: User.t() | nil
  def find_by_id(id) do
    Agent.get(__MODULE__, fn users ->
      Enum.find(users, &(&1.id == id))
    end)
  end

  @spec find_by_email(String.t()) :: User.t() | nil
  def find_by_email(email) do
    Agent.get(__MODULE__, fn users ->
      Enum.find(users, &(&1.email == email))
    end)
  end

  @spec find_all() :: [User.t()]
  def find_all do
    Agent.get(__MODULE__, & &1)
  end

  @spec delete_by_id(integer()) :: boolean()
  def delete_by_id(id) do
    Agent.get_and_update(__MODULE__, fn users ->
      {user_exists?, remaining_users} = 
        users
        |> Enum.split_with(&(&1.id == id))
        |> case do
          {[], users} -> {false, users}
          {_found, users} -> {true, users}
        end
      
      {user_exists?, remaining_users}
    end)
  end
end