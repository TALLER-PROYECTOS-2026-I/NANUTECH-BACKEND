let users = [
  {
    email: "test@test.com",
    password: "123456",
    attempts: 0,
    locked: false,
  },
];

export const getUserByEmail = async (email) => {
  return users.find((u) => u.email === email);
};

export const incrementAttempts = async (email) => {
  const user = users.find((u) => u.email === email);
  if (user) user.attempts++;
};

export const getAttempts = async (email) => {
  const user = users.find((u) => u.email === email);
  return user?.attempts || 0;
};

export const resetAttempts = async (email) => {
  const user = users.find((u) => u.email === email);
  if (user) user.attempts = 0;
};

export const lockUser = async (email) => {
  const user = users.find((u) => u.email === email);
  if (user) user.locked = true;
};
